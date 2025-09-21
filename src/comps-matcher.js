import comps from "./static/MetaTFT-CompsTier.js";
import earlyCompsStage2 from "./static/MetaTFT-EarlyCompsTierStage2.js";
import earlyCompsStage3 from "./static/MetaTFT-EarlyCompsTierStage3.js";
import earlyCompsStage4 from "./static/MetaTFT-EarlyCompsTierStage4.js";
import earlyCompsStage5 from "./static/MetaTFT-EarlyCompsTierStage5.js";

/**
 * 计算当前阵容对目标阵容的覆盖概率
 * 规则：
 * 目标阵容中每个单位的权重 = 星级权重 × 弈子权重
 *    星级权重：1星=1，2星=3，3星=9，
 *    弈子权重：目标阵容内有装备的作为主C ，权重×2
 * 计算当前阵容对目标阵容的覆盖概率（当前从目标继承 weight；无则为 0）
 */
function computeMatchProbability(currentTeam, targetTeam) {
  console.log("computeMatchProbability");
  const starW = (lvl) => Math.pow(3, Math.max(1, Number(lvl) || 1) - 1);
  const keyOf = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();
  const numOr1 = (x) => (Number(x) > 0 ? Number(x) : 1);

  // 预索引：目标的权重（供 currentTeam 继承）
  const targetIndex = new Map(); // nameKey -> { weightForCurrent }
  for (const u of targetTeam) {
    const k = keyOf(u.name);
    const w = Number(u.weight);
    // currentTeam 继承用：无/<=0 则 0
    targetIndex.set(k, {
      weightForCurrent: Number.isFinite(w) && w > 0 ? w : 0,
    });
  }

  // 1) 目标权重池：星级 × weight(缺省按1)
  const targetRemain = new Map(); // nameKey -> 剩余可匹配权重
  let targetTotalWeight = 0;
  for (const u of targetTeam) {
    const k = keyOf(u.name);
    const effectiveW = numOr1(u.weight); // 目标总权重统计：无权重按 1
    const tw = starW(u.level) * effectiveW;
    targetRemain.set(k, (targetRemain.get(k) || 0) + tw);
    targetTotalWeight += tw;
  }

  // 2) 匹配：currentTeam 使用从 target 继承的 weight；未出现在 target 则为 0
  let matchedWeight = 0;
  for (const u of currentTeam) {
    const k = keyOf(u.name);
    if (!targetRemain.has(k)) continue;

    const inheritW = targetIndex.get(k)?.weightForCurrent ?? 0; // 无则0
    const cw = starW(u.level) * inheritW;

    const rem = targetRemain.get(k);
    const take = Math.min(cw, rem);
    matchedWeight += take;
    targetRemain.set(k, rem - take);
  }

  const probability =
    targetTotalWeight > 0 ? Math.min(1, matchedWeight / targetTotalWeight) : 0;

  return { probability, matchedWeight, targetTotalWeight };
}

/**
 * 加载所有阵容数据; 返回每个阶段的推荐阵容
 * 从Stage2到Stage5
 */
function loadComps() {
  if (!Array.isArray(comps)) {
    throw new Error("compositions JSON is not an array.");
  }
  return { comps };
}

function loadEarlyCompsStage2() {
  if (!Array.isArray(earlyCompsStage2)) {
    throw new Error("compositions stage 2 JSON is not an array.");
  }
  return { earlyCompsStage2 };
}

function loadEarlyCompsStage3() {
  if (!Array.isArray(earlyCompsStage3)) {
    throw new Error("compositions stage 3 JSON is not an array.");
  }
  return { earlyCompsStage3 };
}

function loadEarlyCompsStage4() {
  if (!Array.isArray(earlyCompsStage4)) {
    throw new Error("compositions stage 4 JSON is not an array.");
  }
  return { earlyCompsStage4 };
}

function loadEarlyCompsStage5() {
  if (!Array.isArray(earlyCompsStage5)) {
    throw new Error("compositions stage 5 JSON is not an array.");
  }
  return { earlyCompsStage5 };
}

/**
 * 计算当前阵容对各阶段目标阵容的覆盖概率，
 * 返回 topN 个匹配结果
 */
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

/**
 * 格式化阵容单位与装备，返回字符串
 */
// function formatCompUnits(units = []) {
//   if (!Array.isArray(units) || units.length === 0) {
//     return "    (no units)\n";
//   }
//   let out = "";
//   for (const u of units) {
//     const items =
//       Array.isArray(u.items) && u.items.length ? u.items.join(", ") : "-";
//     const lvl = u.level ?? "?";
//     out += `    - ${u.name} (lvl ${lvl}): ${items}\n`;
//   }
//   return out;
// }

/**
 * 工具：清理 TFT 前缀（例如 "TFT15_" / "TFTxx_"）
 */
function stripTftPrefix(name) {
  const s = typeof name === "string" ? name : "";
  return s.replace(/^TFT\d+_/i, "");
}

/**
 *  一行格式化：champ1,(2),champ2,(2)...（仅当 level === 2 时显示 (2)
 */
function formatUnitsInline(units = []) {
  if (!Array.isArray(units) || units.length === 0) return "(no units)";
  return units
    .map((u) => {
      const n = stripTftPrefix(u && u.name);
      const showLvl = Number(u && u.level) === 2 ? "(2)" : "";
      return showLvl ? `${n}${showLvl}` : n;
    })
    .filter(Boolean)
    .join(",");
}

/**
 * 导出：生成完整输出字符串（按阶段 2-5，各输出前 topN 个匹配阵容）
 */
export function generateCompMatchReport(currentTeam, topN = 3, stage) {
  stage = stage ?? 5; // null or undefined → 5
  const lines = [];
  try {
    const st = Number.isFinite(Number(stage)) ? Number(stage) : 5;

    let wantedStages;
    if (st <= 2) wantedStages = [2, 3];
    else if (st === 3) wantedStages = [3, 4];
    else if (st === 4) wantedStages = [4, 5];
    else wantedStages = [5];

    const stages = wantedStages.map((s) => {
      if (s === 2)
        return {
          label: "Stage 2",
          data: loadEarlyCompsStage2().earlyCompsStage2,
        };
      if (s === 3)
        return {
          label: "Stage 3",
          data: loadEarlyCompsStage3().earlyCompsStage3,
        };
      if (s === 4)
        return {
          label: "Stage 4",
          data: loadEarlyCompsStage4().earlyCompsStage4,
        };
      return {
        label: "Stage 5",
        data: loadEarlyCompsStage5().earlyCompsStage5,
      };
    });

    for (let i = 0; i < stages.length; i++) {
      const sg = stages[i];
      const top = rankTopMatches(currentTeam, sg.data, topN);
      top.forEach((r) => {
        const unitLine = formatUnitsInline(r.comp.units || []);
        const tier = r.comp.tier || "-";
        const pct =
          typeof r.probability === "number"
            ? (r.probability * 100).toFixed(1)
            : "-";
        const mw = r.matchedWeight ?? "-";
        const tw = r.targetTotalWeight ?? "-";
        lines.push(
          `${sg.label}: [${tier}] ${unitLine} score=${pct}% (${mw}/${tw})`
        );
      });
      // add blank line between stage groups
      // if (top.length > 0 && i < stages.length - 1) {
      //   lines.push("");
      // }
    }
  } catch (e) {
    lines.push(`Error: ${e.message}`);
  }
  return lines.join("\n") + "\n\n";
}
