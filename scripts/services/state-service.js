// State service: parse parser(formatted string) outputs only.
// For now, only handle "Gold: <number>" lines.

const DEFAULT_HISTORY_LIMIT = 200;

class StateService {
  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    this._historyLimit =
      Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;

    // Keep minimal history for debugging
    this._infoUpdates = []; // {  raw, formatted }

    // Latest snapshot (only gold for now)
    this._latest = {
      gold: null,
    };
  }

  // 兼容两种使用方式：
  // 1) addInfoUpdate( formattedString | number | { gold } )
  // 2) addInfoUpdate(rawInfo, formattedString)
  addInfoUpdate(rawOrFormatted, maybeFormatted) {
    if (arguments.length === 1) {
      const data = rawOrFormatted;

      // 历史记录
      this._infoUpdates.push({ raw: data, formatted: data });
      this._trim(this._infoUpdates);

      if (typeof data === "number" && Number.isFinite(data)) {
        // 直接是 gold 数字
        this._latest.gold = data;
        return;
      }
      if (typeof data === "string") {
        // 解析格式化字符串（如：Gold: 30）
        this._applyFormatted(data);
        return;
      }
      if (data && typeof data === "object" && Number.isFinite(data.gold)) {
        // 支持传 { gold: 30 }
        this._latest.gold = Number(data.gold);
        return;
      }
      return;
    }

    // 2 个参数：raw + formatted
    const rawInfo = rawOrFormatted;
    const formatted = maybeFormatted;

    this._infoUpdates.push({ raw: rawInfo, formatted });
    this._trim(this._infoUpdates);

    if (typeof formatted === "number" && Number.isFinite(formatted)) {
      this._latest.gold = formatted;
      return;
    }
    if (typeof formatted === "string") {
      this._applyFormatted(formatted);
      return;
    }
  }

  // 仅解析 "Gold: <number>" 行
  _applyFormatted(formatted) {
    // Handle multiple lines and potential multiple messages at once
    // Gold pattern: "Gold: 30"
    const goldRegex = /^Gold:\s*([0-9]+)\s*$/gim;
    let match;
    let lastGold = null;
    while ((match = goldRegex.exec(formatted)) !== null) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) lastGold = n;
    }
    if (lastGold !== null) {
      this._latest.gold = lastGold;
    }
  }

  getLatest() {
    return this._safeClone(this._latest);
  }

  getInfoUpdates(limit = 50) {
    return this._sliceTail(this._infoUpdates, limit);
  }

  clear() {
    this._infoUpdates = [];
    this._latest = { gold: null };
  }

  // Helpers
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
    } catch {
      return obj;
    }
  }
}

const stateService = new StateService();
export default stateService;
