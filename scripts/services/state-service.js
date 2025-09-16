// Simple in-memory state service to track in-game info and events
// Keeps latest snapshots and bounded history to aid debugging or future UI

const DEFAULT_HISTORY_LIMIT = 200;

class StateService {
  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    this._historyLimit =
      Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;
    this._events = []; // { ts, raw, formatted }
    this._infoUpdates = []; // { ts, raw, formatted }
    this._latest = {
      me: null,
      roster: null,
      store: null,
      bench: null,
      board: null,
      augments: null,
      carousel: null,
      other: {}, // bucket for any other info keys
    };
  }

  // Record a game event (raw payload + formatted text if available)
  addEvent(raw, formatted) {
    const item = { ts: Date.now(), raw, formatted: formatted || null };
    this._events.push(item);
    this._trim(this._events);
    return item;
  }

  // Record an info update; also decompose into latest buckets by known keys
  addInfoUpdate(rawInfo, formatted) {
    const item = { ts: Date.now(), raw: rawInfo, formatted: formatted || null };
    this._infoUpdates.push(item);
    this._trim(this._infoUpdates);

    // Update latest snapshots when possible
    try {
      if (rawInfo && typeof rawInfo === "object") {
        // Known top-level groups
        if (rawInfo.me !== undefined) this._latest.me = rawInfo.me;
        if (rawInfo.roster !== undefined) this._latest.roster = rawInfo.roster;
        if (rawInfo.store !== undefined) this._latest.store = rawInfo.store;
        if (rawInfo.bench !== undefined) this._latest.bench = rawInfo.bench;
        if (rawInfo.board !== undefined) this._latest.board = rawInfo.board;
        if (rawInfo.augments !== undefined)
          this._latest.augments = rawInfo.augments;
        if (rawInfo.carousel !== undefined)
          this._latest.carousel = rawInfo.carousel;

        // Anything else captured under other
        Object.keys(rawInfo).forEach((k) => {
          if (
            ![
              "me",
              "roster",
              "store",
              "bench",
              "board",
              "augments",
              "carousel",
            ].includes(k)
          ) {
            this._latest.other[k] = rawInfo[k];
          }
        });
      }
    } catch (_) {
      // no-op: best-effort snapshotting
    }
    return item;
  }

  getLatest() {
    return this._safeClone({ ...this._latest, ts: Date.now() });
  }

  getEvents(limit = 50) {
    return this._sliceTail(this._events, limit);
  }

  getInfoUpdates(limit = 50) {
    return this._sliceTail(this._infoUpdates, limit);
  }

  clear() {
    this._events = [];
    this._infoUpdates = [];
    this._latest = {
      me: null,
      roster: null,
      store: null,
      bench: null,
      board: null,
      augments: null,
      carousel: null,
      other: {},
    };
  }

  _trim(arr) {
    const extra = arr.length - this._historyLimit;
    if (extra > 0) arr.splice(0, extra);
  }

  _sliceTail(arr, limit) {
    const n = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
    const slice = arr.slice(Math.max(0, arr.length - n));
    return this._safeClone(slice);
  }

  _safeClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_) {
      return obj;
    }
  }
}

// Export a singleton for app-wide usage
const stateService = new StateService();
export default stateService;
