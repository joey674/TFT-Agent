// Augment analyzer: ONLY parse formatted Augments lines and map to tiers
// Input lines are produced by event-parser.js, e.g.:
//  - "Augments: A, B, C\n\n"
// Output example:
//  - "Augment Tiers: A [S], B [A], C [B]\n\n"

import AugmentsTier from "./static/MetaTFT-AugmentsTier.js";

// Build a lookup map with multiple normalized variants per augment name
const tierMap = (() => {
  const map = new Map();
  const add = (k, v) => {
    const key = String(k || "").trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, v);
  };

  for (const aug of Array.isArray(AugmentsTier) ? AugmentsTier : []) {
    const name = aug?.name ?? "";
    const tier = aug?.tier ?? "-";
    for (const v of normalizeNameVariants(name)) add(v, tier);
  }
  return map;
})();

// Strip common client prefixes like:
//  - TFT6_Augment_*
//  - TFT_Augment_*
//  - TFT7-augment-*
// and fallbacks like leading standalone TFT*, or Augment*
function stripTftAugmentPrefix(s) {
  let out = String(s || "");
  // Primary: TFT<digits>[_ -]*Augment<sep>
  out = out.replace(/^TFT\d*[_\s-]*Augment[_\s-]*/i, "");
  // Fallbacks: leading TFT<digits><sep> or leading Augment<sep>
  out = out.replace(/^TFT\d*[_\s-]*/i, "");
  out = out.replace(/^Augment[_\s-]*/i, "");
  return out;
}

function normalizeBase(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ") // keep alnum as tokens
    .trim()
    .replace(/\s+/g, " ");
}

function replaceDigitsWithRoman(s) {
  return s
    .replace(/\b1\b/g, "i")
    .replace(/\b2\b/g, "ii")
    .replace(/\b3\b/g, "iii");
}

function replaceRomanWithDigits(s) {
  // order matters: iii -> 3 first
  return s
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1");
}

function normalizeNameVariants(name) {
  const cleaned = stripTftAugmentPrefix(name);
  const base = normalizeBase(cleaned);
  const digits = replaceRomanWithDigits(base);
  const roman = replaceDigitsWithRoman(base);
  // Create a small set of unique variants
  const set = new Set([base, digits, roman]);
  return Array.from(set.values());
}

function findTier(name) {
  if (!name) return "-";
  for (const v of normalizeNameVariants(name)) {
    const tier = tierMap.get(v);
    if (tier) return tier;
  }
  return "-";
}

function parseNamesFromLine(formatted) {
  const s = String(formatted || "").trim();
  if (!s) return null;

  // Match "Augments: ..."
  let m = /^Augments:\s*(.*)$/i.exec(s);
  if (m) {
    const payload = m[1].trim();
    if (!payload || /^none$/i.test(payload))
      return { kind: "augments", names: [] };
    const names = payload
      .split(/\s*,\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
    return { kind: "augments", names };
  }
  return null;
}

export function analyzeAugments(formatted) {
  const parsed = parseNamesFromLine(formatted);
  if (!parsed) return ""; // not an augment line

  const tiers = parsed.names.map((n) => ({ name: n, tier: findTier(n) }));

  // Only handle "Augments:" lines; ignore others
  if (parsed.kind !== "augments") return "";
  if (tiers.length === 0) return "Augment Tiers: None\n\n";
  const line = tiers.map((t) => `${t.name} [${t.tier}]`).join(", ");
  return `Augment Tiers: ${line}\n\n`;
}
