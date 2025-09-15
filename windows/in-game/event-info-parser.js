// event-info-parser.js
// Utility to format game events and info updates for display

export function inGameEventParser(event) {
  return JSON.stringify(event, null, 2) + "\n";
}

export function inGameInfoUpdateParser(infoUpdate) {
  if (!infoUpdate || typeof infoUpdate !== "object") return "";

  const { feature, info } = infoUpdate;

  // Gold
  if (feature === "me" && info?.me?.gold !== undefined) {
    return `Gold: ${info.me.gold}\n`;
  }

  // Store
  if (feature === "store" && typeof info?.store?.shop_pieces === "string") {
    let shopPieces;
    try {
      shopPieces = JSON.parse(info.store.shop_pieces);
    } catch {
      shopPieces = {};
    }
    let result = "Shop:\n";
    for (const slot in shopPieces) {
      result += `  ${slot}: ${shopPieces[slot].name || ""}\n`;
    }
    return result + "\n";
  }

  // Bench
  if (feature === "bench" && typeof info?.bench?.bench_pieces === "string") {
    let benchPieces;
    try {
      benchPieces = JSON.parse(info.bench.bench_pieces);
    } catch {
      benchPieces = {};
    }
    let result = "Bench:\n";
    for (const slot in benchPieces) {
      const piece = benchPieces[slot];
      result += `  ${slot}: ${piece.name || ""} (Level: ${piece.level || ""}`;
      const items = [piece.item_1, piece.item_2, piece.item_3].filter(Boolean);
      if (items.length) result += `, Items: ${items.join(", ")}`;
      result += ")\n";
    }
    return result + "\n";
  }

  // Board
  if (feature === "board" && typeof info?.board?.board_pieces === "string") {
    let boardPieces;
    try {
      boardPieces = JSON.parse(info.board.board_pieces);
    } catch {
      boardPieces = {};
    }
    let result = "Board:\n";
    for (const cell in boardPieces) {
      const piece = boardPieces[cell];
      result += `  ${cell}: ${piece.name || ""} (Level: ${piece.level || ""}`;
      const items = [piece.item_1, piece.item_2, piece.item_3].filter(Boolean);
      if (items.length) result += `, Items: ${items.join(", ")}`;
      result += ")\n";
    }
    return result + "\n";
  }

  // Default: beautified JSON
  return JSON.stringify(infoUpdate, null, 2) + "\n";
}
