@echo off
setlocal enabledelayedexpansion
title MetaTFT Spectator

:start
set LOL_PATH=""

if exist "%APPDATA%\MetaTFT_lolinstallpath.txt" (
    set /p LOL_PATH0=< "%APPDATA%\MetaTFT_lolinstallpath.txt"
    call :Trim LOL_PATH !LOL_PATH0!
    echo Manually set Path found: "!LOL_PATH!"
    
    IF EXIST "!LOL_PATH!" (
        goto runSpectate
    )
)

for /F "delims=" %%R in ('
    tasklist /FI "ImageName eq LeagueClient.exe" /FI "Status eq Running" /FO CSV /NH
') do (
    set "FLAG1=" & set "FLAG2="
    for %%C in (%%R) do (
        if defined FLAG1 (
            if not defined FLAG2 (
                set LOL_PID=%%~C
                IF NOT "%LOL_PID%"=="" goto pidFound
            )
            set "FLAG2=#"
        )
        set "FLAG1=#"
    )
)

IF EXIST "C:\Riot Games\League of Legends" (
	set LOL_PATH="C:\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Riot Games\League of Legends" (
	set LOL_PATH="D:\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files\Riot Games\League of Legends" (
	set LOL_PATH="C:\Program Files\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files (x86)\Riot Games\League of Legends" (
	set LOL_PATH="C:\Program Files (x86)\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files\League of Legends" (
	set LOL_PATH="C:\Program Files\League of Legends"
	goto runSpectate
)
IF EXIST "C:\Program Files (x86)\League of Legends" (
	set LOL_PATH="C:\Program Files (x86)\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files\Riot Games\League of Legends" (
	set LOL_PATH="D:\Program Files\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files (x86)\Riot Games\League of Legends" (
	set LOL_PATH="D:\Program Files (x86)\Riot Games\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files\League of Legends" (
	set LOL_PATH="D:\Program Files\League of Legends"
	goto runSpectate
)
IF EXIST "D:\Program Files (x86)\League of Legends" (
	set LOL_PATH="D:\Program Files (x86)\League of Legends"
	goto runSpectate
)

goto notfound

:pidFound
set "lcpath="
for /f "skip=1delims=" %%a in (
	'wmic process where "ProcessID=%LOL_PID%" get ExecutablePath'
) do if not defined lcpath set "lcpath=%%a"

For %%A in ("%lcpath%") do (
    Set LOL_PATH=%%~dpA
)

goto runSpectate

:runSpectate
cls
for /f "tokens=* delims= " %%a in ("%LOL_PATH%") do set LOL_PATH=%%a
for /l %%a in (1,1,100) do if "!LOL_PATH:~-1!"==" " set LOL_PATH=!LOL_PATH:~0,-1!
cd /D %LOL_PATH%

for /f "tokens=1,* delims=" %%i in ('type Config\LeagueClientSettings.yaml ^| find /i "locale:"') do (
    set line=%%i
    call :Trim trimmed !line!
    SET locale=!trimmed:~9,-1!
)


cd Game
if exist "League of Legends.exe" (
	goto start
)

goto notfound

:start

REM Check if the user has the correct version of "League of Legends.exe."
set "REQUIRED_VERSION=15.18"
set "PS_COMMAND=powershell -command "(Get-Item 'League of Legends.exe').VersionInfo.FileVersion.Split('.')[0..1] -join '.'""
for /f "usebackq delims=" %%I in (`%PS_COMMAND%`) do (
    set "FILE_VERSION=%%I"
)
if "!FILE_VERSION!" neq "%REQUIRED_VERSION%" (
    cls
    echo Do you not have the correct version of League of Legends installed to spectate this game.
    echo Your version is !FILE_VERSION! and the required version is %REQUIRED_VERSION%.
    pause
    goto exit
)

REM Generate a random 16 character session ID
set "alphabet=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "session_id="
for /L %%i in (1,1,16) do (
    set /A "index=!random! %% 62"
    for %%j in (!index!) do set "session_id=!session_id!!alphabet:~%%j,1!"
)

echo Starting Spectate - Run the MetaTFT App to enable playback controls!
echo Launching League of Legends NA1_5369614167

REM Get delay time from spectator API
for /f "delims=" %%a in ('powershell -command "$response = Invoke-RestMethod -Uri 'http://spectate.metatft.com:80/observer-mode/rest/consumer/getGameMetaData/NA1.%session_id%/5369614167/0/token'; $response.delayTime"') do set DELAY_TIME=%%a
echo Waiting for %DELAY_TIME% seconds for spectate delay...
timeout /t %DELAY_TIME% /nobreak >nul

REM Check if vanguard is running
sc query vgk | find "RUNNING" >nul
if %ERRORLEVEL% equ 0 (
    set IS_VGK_RUNNING=1
) else (
    set IS_VGK_RUNNING=0
)

if %IS_VGK_RUNNING% equ 1 (
    net stop vgc >nul 2>&1
    net stop vgk >nul 2>&1
)

@start "" "League of Legends.exe" "spectator spectate.metatft.com:80 V/uTkn/7Utl6u/KvSgKzIq63+4str+lY 5369614167 NA1.%session_id%" -UseRads -GameBaseDir=.. "-Locale=%locale%" -SkipBuild -EnableCrashpad=true -EnableLNP -Product=TFT

if %IS_VGK_RUNNING% equ 1 (
    timeout 5 >nul 2>&1
    net start vgk >nul 2>&1
    net start vgc >nul 2>&1
)

goto exit

:Trim
SetLocal EnableDelayedExpansion
set Params=%*
for /f "tokens=1*" %%a in ("!Params!") do EndLocal & set %1=%%b
exit /b

:notfound
cls
echo MetaTFT couldn't find your League of Legends Install. It should look something like this: C:\Riot Games\League of Legends
echo:
echo If you're having issues, please post in #help-requests on our Discord server https://discord.com/invite/RqN3qPy
echo:
set /p manualFolder="Please enter your League of Legends installation path: "

call :Trim manualFolder !manualFolder!
IF "!manualFolder!" NEQ "" (
    echo !manualFolder! > "%APPDATA%\MetaTFT_lolinstallpath.txt"
)
goto start

:exit
