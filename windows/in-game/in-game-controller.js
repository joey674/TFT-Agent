import { InGameView } from "../../windows/in-game/in-game-view.js";
import { HotkeysService } from "../../scripts/services/hotkeys-service.js";
import { RunningGameService } from "../../scripts/services/running-game-service.js";
import { inGameEventParser } from "../../src/event-parser.js";
import stateService from "../../src/state-service.js";
import { analyzeAugments } from "../../src/augment-analyzer.js";
import {
  kHotkeySecondScreen,
  kHotkeyToggle,
} from "../../scripts/constants/hotkeys-ids.js";

export class InGameController {
  constructor() {
    this.inGameView = new InGameView();
    this.hotkeysService = new HotkeysService();
    this.runningGameService = new RunningGameService();

    this._eventListenerBound = this._eventListener.bind(this);

    this.owEventBus = null;
  }

  run() {
    // Get the event bus instance from the background window
    const { owEventBus } = overwolf.windows.getMainWindow();

    this.owEventBus = owEventBus;

    this._readStoredData();

    // This callback will run in the context of the current window
    this.owEventBus.addListener(this._eventListenerBound);

    // Update hotkey view and listen to changes:
    this._updateHotkey();
    this.hotkeysService.addHotkeyChangeListener(() => this._updateHotkey());

    this._addBeforeCloseListener();
  }

  /**
   * This removes in-game window's listener from the event bus when the window
   * closes
   */
  _addBeforeCloseListener() {
    window.addEventListener("beforeunload", (e) => {
      delete e.returnValue;

      this.owEventBus.removeListener(this._eventListenerBound);
    });
  }

  /**
   * Read & render events and info updates that happened before this was opened
   */
  _readStoredData() {
    const { owEventsStore, owInfoUpdatesStore } =
      overwolf.windows.getMainWindow();

    owInfoUpdatesStore.forEach((v) => this._eventListener(null, v));
  }

  /**
   * Update the hotkey display in the in-game window
   */
  async _updateHotkey() {
    const gameInfo = await this.runningGameService.getRunningGameInfo();

    const [hotkeyToggle, hotkeySecondScreen] = await Promise.all([
      this.hotkeysService.getHotkey(kHotkeyToggle, gameInfo.classId),
      this.hotkeysService.getHotkey(kHotkeySecondScreen, gameInfo.classId),
    ]);

    this.inGameView.updateToggleHotkey(hotkeyToggle);
    this.inGameView.updateSecondHotkey(hotkeySecondScreen);
  }

  /**
   * The main event listener for in-game events and info updates
   */
  _eventListener(eventName, eventValue) {
    console.log("InGameController");

    // Use parser
    const formatted = inGameEventParser(eventValue);
    if (!formatted) {
      return;
    }

    // Save to state service
    stateService.addInfoUpdate(formatted);

    // Log info update to view
    this.inGameView.logInfoUpdate(formatted + "\n", false);

    // Log state to view
    // const latest = stateService.getLatest();
    // this.inGameView.logEvent(JSON.stringify(latest, null, 2) + "\n", false);

    // const comp = stateService.getComp();
    // this.inGameView.logEvent(JSON.stringify(comp), false);

    // 返回阵容推荐
    const compMatch = stateService.getCompMatch(/*topN=*/ 1);
    this.inGameView.logEvent(compMatch, false);

    // 返回强化符文推荐
    if (/^Augments:/i.test(formatted.trim())) {
      const augReport = analyzeAugments(formatted.trim());
      if (augReport) this.inGameView.logEvent(augReport, false);
    }
  }
}
