/**  计算当前阵容对目标阵容的覆盖概率
 * 规则：
 * 目标阵容中每个单位的权重 = 星级权重 × 弈子权重
 *    星级权重：1星=1，2星=3，3星=9，
 *    弈子权重：目标阵容内有装备的作为主C ，权重×2
 * 计算当前阵容对目标阵容的覆盖概率（当前从目标继承 weight；无则为 0）
 */
export function computeMatchProbability(currentTeam, targetTeam) {
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
