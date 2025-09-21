// State service: parse parser(formatted string) outputs only.
// Now handles: Gold, Shop, Bench, Board sections.
import { generateCompMatchReport } from "./comps-matcher.js";

const DEFAULT_HISTORY_LIMIT = 200;

class StateService {
  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    this._historyLimit =
      Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;

    // Keep minimal history for debugging
    this._infoUpdates = []; // {  raw, formatted }

    // Latest snapshot
    this._latest = {
      gold: null,
      shop: [], // [{ slot, name }]
      bench: [], // [{ slot, name, level, items: [] }]
      board: [], // [{ cell, name, level, items: [] }]
      stage: null, // e.g., from "Round Type: 1-4 ..." => 1
      round: null, // e.g., from "Round Type: 1-4 ..." => 4
    };
  }

  addInfoUpdate(formatted) {
    const data = formatted;

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

  //
  getCompMatch(topN = 3) {
    console.log("getCompMatch");
    const currentTeam = this.getComp();
    return generateCompMatchReport(currentTeam, topN, this._latest.stage);
  }

  // 解析 Gold / Shop / Bench / Board
  _applyFormatted(formatted) {
    if (typeof formatted !== "string" || !formatted) return;

    // 1) Gold: scan globally (can appear anywhere)
    const goldRegex = /^Gold:\s*([0-9]+)\s*$/gim;
    let match;
    let lastGold = null;
    while ((match = goldRegex.exec(formatted)) !== null) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) lastGold = n;
    }
    if (lastGold !== null) this._latest.gold = lastGold;

    // 1b) Round Type: capture stage-round (e.g., 1-4) and persist stage/round numbers
    // Accepts formats like: "Round Type: 1-4 PVE (PVE)" or "Round Type: 2-7 ..."
    const rtRegex = /^Round Type:\s*(.*?)\s*$/gim;
    let lastSR = null;
    let mrt;
    while ((mrt = rtRegex.exec(formatted)) !== null) {
      const body = String(mrt[1] ?? "");
      const m = /(\d+)\s*-\s*(\d+)/.exec(body);
      if (m) lastSR = { s: Number(m[1]), r: Number(m[2]) };
    }
    if (lastSR) {
      this._latest.stage = Number.isFinite(lastSR.s)
        ? lastSR.s
        : this._latest.stage;
      this._latest.round = Number.isFinite(lastSR.r)
        ? lastSR.r
        : this._latest.round;
    }

    // 2) Section parsing (Shop / Bench / Board)
    const lines = formatted.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      if (/^Shop:\s*$/.test(line)) {
        const { items, next } = this._parseShop(lines, i);
        // Always update, even if empty block (reset state)
        this._latest.shop = items;
        i = next - 1; // advance
        continue;
      }
      if (/^Bench:\s*$/.test(line)) {
        const { items, next } = this._parseBench(lines, i);
        // Always update, even if empty block (reset state)
        this._latest.bench = items;
        i = next - 1;
        continue;
      }
      if (/^Board:\s*$/.test(line)) {
        const { items, next } = this._parseBoard(lines, i);
        // Always update, even if empty block (reset state)
        this._latest.board = items;
        i = next - 1;
        continue;
      }
    }
  }

  // Parse a block of indented lines (two-space prefix) until a non-indented or blank separator
  _collectIndented(lines, startIndex) {
    const out = [];
    let i = startIndex + 1;
    for (; i < lines.length; i++) {
      const l = lines[i] ?? "";
      // treat whitespace-only as blank separator
      if (!l.trim()) break; // blank line ends block
      if (!l.startsWith("  ")) break; // next section
      out.push(l);
    }
    return { indented: out, next: i };
  }

  _parseShop(lines, startIndex) {
    const { indented, next } = this._collectIndented(lines, startIndex);
    const items = [];
    const re = /^\s{2}([^:]+):\s*(.*)\s*$/; // "  slot_1: Name"
    for (const l of indented) {
      const m = re.exec(l);
      if (!m) continue;
      const slot = String(m[1]).trim();
      const name = String(m[2] ?? "").trim();
      items.push({ slot, name });
    }
    // sort by numeric suffix if present
    items.sort((a, b) => this._suffixNum(a.slot) - this._suffixNum(b.slot));
    return { items, next };
  }

  _parseBench(lines, startIndex) {
    const { indented, next } = this._collectIndented(lines, startIndex);
    const items = [];
    // Example: "  slot_1: Name (Level: 1, Items: A, B)"
    const re = /^\s{2}([^:]+):\s*([^()]*)\s*(?:\(([^)]*)\))?\s*$/;
    for (const l of indented) {
      const m = re.exec(l);
      if (!m) continue;
      const slot = String(m[1]).trim();
      const name = String(m[2] ?? "").trim();
      const details = String(m[3] ?? "");
      let level = null;
      let itemsList = [];
      if (details) {
        // Level: X
        const lm = /(?:^|,\s*)Level:\s*([0-9]+)/i.exec(details);
        if (lm) {
          const n = Number(lm[1]);
          if (Number.isFinite(n)) level = n;
        }
        // Items: a, b, c
        const im = /(?:^|,\s*)Items:\s*([^,][^)]*)/i.exec(details);
        if (im) {
          itemsList = String(im[1])
            .split(/\s*,\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      items.push({ slot, name, level, items: itemsList });
    }
    items.sort((a, b) => this._suffixNum(a.slot) - this._suffixNum(b.slot));
    return { items, next };
  }

  _parseBoard(lines, startIndex) {
    const { indented, next } = this._collectIndented(lines, startIndex);
    const pieces = [];
    // Example: "  cell_4: Name (Level: 1, Items: A, B)"
    const re = /^\s{2}([^:]+):\s*([^()]*)\s*(?:\(([^)]*)\))?\s*$/;
    for (const l of indented) {
      const m = re.exec(l);
      if (!m) continue;
      const cell = String(m[1]).trim();
      const name = String(m[2] ?? "").trim();
      const details = String(m[3] ?? "");
      let level = null;
      let itemsList = [];
      if (details) {
        const lm = /(?:^|,\s*)Level:\s*([0-9]+)/i.exec(details);
        if (lm) {
          const n = Number(lm[1]);
          if (Number.isFinite(n)) level = n;
        }
        const im = /(?:^|,\s*)Items:\s*([^,][^)]*)/i.exec(details);
        if (im) {
          itemsList = String(im[1])
            .split(/\s*,\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      pieces.push({ cell, name, level, items: itemsList });
    }
    pieces.sort((a, b) => this._suffixNum(a.cell) - this._suffixNum(b.cell));
    return { items: pieces, next };
  }

  _suffixNum(key) {
    const m = /(\d+)$/.exec(String(key));
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  }

  getLatest() {
    return this._safeClone(this._latest);
  }

  getInfoUpdates(limit = 50) {
    return this._sliceTail(this._infoUpdates, limit);
  }

  // Aggregate a composition list of units from bench, board, and shop
  // Each entry: { name, level, items }
  // - bench/board: keep parsed level & items
  // - shop: default level = 1, items = []
  getComp() {
    const out = [];
    const valid = (n) =>
      typeof n === "string" &&
      n.trim().length > 0 &&
      n.trim().toLowerCase() !== "sold";

    // Bench
    if (Array.isArray(this._latest.bench)) {
      for (const u of this._latest.bench) {
        if (u && valid(u.name)) {
          out.push({
            name: u.name,
            level: Number.isFinite(u.level) ? u.level : null,
            items: Array.isArray(u.items) ? [...u.items] : [],
          });
        }
      }
    }

    // Board
    if (Array.isArray(this._latest.board)) {
      for (const u of this._latest.board) {
        if (u && valid(u.name)) {
          out.push({
            name: u.name,
            level: Number.isFinite(u.level) ? u.level : null,
            items: Array.isArray(u.items) ? [...u.items] : [],
          });
        }
      }
    }

    // Shop (default level 1, no items)
    if (Array.isArray(this._latest.shop)) {
      for (const u of this._latest.shop) {
        if (u && valid(u.name)) {
          out.push({
            name: u.name,
            level: 1,
            items: [],
          });
        }
      }
    }

    return this._safeClone(out);
  }

  clear() {
    this._infoUpdates = [];
    this._latest = {
      gold: null,
      shop: [],
      bench: [],
      board: [],
      stage: null,
      round: null,
    };
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
