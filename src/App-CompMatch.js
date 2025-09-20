import { computeMatchProbability } from "./Algorithm-CompMatchCalculator.js";

import comps from "./static/MetaTFT-CompositionsTier.js";

function loadAllComps() {
  if (!Array.isArray(comps)) {
    throw new Error("compositions JSON is not an array.");
  }
  return { jsonPath: "static/metaTFT-compositions.json", comps };
}

function rankTopMatches(currentTeam, comps, topN = 3) {
  const normCurrent = currentTeam;
  const results = comps.map((comp) => {
    const normTarget = comp.units || [];
    const score = computeMatchProbability(normCurrent, normTarget);
    return { comp, ...score };
  });

  results.sort((a, b) => {
    if (b.probability !== a.probability) return b.probability - a.probability;
    return (b.matchedWeight || 0) - (a.matchedWeight || 0);
  });

  return results.slice(0, topN);
}

// 格式化阵容单位与装备，返回字符串
function formatCompUnits(units = []) {
  if (!Array.isArray(units) || units.length === 0) {
    return "    (no units)\n";
  }
  let out = "";
  for (const u of units) {
    const items =
      Array.isArray(u.items) && u.items.length ? u.items.join(", ") : "-";
    const lvl = u.level ?? "?";
    out += `    - ${u.name} (lvl ${lvl}): ${items}\n`;
  }
  return out;
}

// 导出：生成完整输出字符串
export function generateCompMatchReport(currentTeam, topN = 3) {
  console.log("generateCompMatchReport");
  const lines = [];
  try {
    const { jsonPath, comps } = loadAllComps();
    // lines.push(`Loaded ${comps.length} comps from: ${jsonPath}`);

    const top = rankTopMatches(currentTeam, comps, topN);
    lines.push(`Top ${Math.min(topN, top.length)} matches:`);
    top.forEach((r, idx) => {
      const pct = (r.probability * 100).toFixed(1);
      lines.push(
        `#${idx + 1} ${r.comp.name || "(no name)"} [${r.comp.tier || "-"}] ` +
          `prob=${pct}% (${r.matchedWeight}/${r.targetTotalWeight})`
      );
      lines.push(formatCompUnits(r.comp.units || []).trimEnd());
    });
  } catch (e) {
    lines.push(`Error: ${e.message}`);
  }
  return lines.join("\n") + "\n"; // 结尾加换行以方便追加
}
