import { InGameView } from "../../windows/in-game/in-game-view.js";
import { HotkeysService } from "../../scripts/services/hotkeys-service.js";
import { RunningGameService } from "../../scripts/services/running-game-service.js";
import {
  inGameEventParser,
  inGameInfoUpdateParser,
} from "./event-info-parser.js";
import stateService from "../../scripts/services/state-service.js";
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

    owEventsStore.forEach((v) => this._gameEventHandler(v));
    owInfoUpdatesStore.forEach((v) => this._infoUpdateHandler(v));
  }

  async _updateHotkey() {
    const gameInfo = await this.runningGameService.getRunningGameInfo();

    const [hotkeyToggle, hotkeySecondScreen] = await Promise.all([
      this.hotkeysService.getHotkey(kHotkeyToggle, gameInfo.classId),
      this.hotkeysService.getHotkey(kHotkeySecondScreen, gameInfo.classId),
    ]);

    this.inGameView.updateToggleHotkey(hotkeyToggle);
    this.inGameView.updateSecondHotkey(hotkeySecondScreen);
  }

  _eventListener(eventName, eventValue) {
    switch (eventName) {
      case "event": {
        this._gameEventHandler(eventValue);
        break;
      }
      case "info": {
        this._infoUpdateHandler(eventValue);
        break;
      }
    }
  }

  // Logs events
  _gameEventHandler(event) {
    let isHighlight = false;

    switch (event.name) {
      case "kill":
      case "death":
      case "assist":
      case "level":
      case "matchStart":
      case "matchEnd":
      case "match_start":
      case "match_end":
        isHighlight = true;
        break;
    }

    // Use parser
    const formatted = inGameEventParser(event);
    // Record into state service
    try {
      stateService.addEvent(event, formatted);
    } catch (_) {
      // ignore state persistence errors
    }
    this.inGameView.logEvent(formatted + "\n", isHighlight);
  }

  // Logs info updates
  _infoUpdateHandler(infoUpdate) {
    // Use parser
    const formatted = inGameInfoUpdateParser(infoUpdate);
    // Record into state service
    try {
      stateService.addInfoUpdate(infoUpdate, formatted);
    } catch (_) {
      // ignore state persistence errors
    }
    if (formatted) {
      this.inGameView.logInfoUpdate(formatted + "\n", false);
    }
  }
}
