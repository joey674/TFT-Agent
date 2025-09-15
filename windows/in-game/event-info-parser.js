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

  // Augments (current augments and picked augment)
  if (feature === "augments" && info?.me) {
    // Current augments
    if (typeof info.me.me === "string") {
      let aug;
      try {
        aug = JSON.parse(info.me.me);
      } catch {
        aug = null;
      }
      if (aug) {
        const names = [
          aug.augment_1?.name,
          aug.augment_2?.name,
          aug.augment_3?.name,
        ].filter((n) => n);
        if (names.length > 0) {
          return `Augments: ${names.join(", ")}\n\n`;
        } else {
          return `Augments: None\n\n`;
        }
      }
    }
    // Picked augment
    if (typeof info.me.picked_augment === "string") {
      let picked;
      try {
        picked = JSON.parse(info.me.picked_augment);
      } catch {
        picked = null;
      }
      if (picked) {
        const names = [
          picked.slot_1?.name,
          picked.slot_2?.name,
          picked.slot_3?.name,
          picked.slot_4?.name,
        ].filter((n) => n);
        if (names.length === 1) {
          return `Picked Augment: ${names[0]}\n\n`;
        } else if (names.length > 1) {
          return `Picked Augments: ${names.join(", ")}\n\n`;
        } else {
          return `Picked Augment: None\n\n`;
        }
      }
    }
  }

  // Carousel
  if (
    feature === "carousel" &&
    typeof info?.carousel?.carousel_pieces === "string"
  ) {
    let carouselPieces;
    try {
      carouselPieces = JSON.parse(info.carousel.carousel_pieces);
    } catch {
      carouselPieces = {};
    }
    let result = "Carousel:\n";
    const slots = Object.keys(carouselPieces).sort((a, b) => {
      const na = parseInt(a.split("_")[1] || "0", 10);
      const nb = parseInt(b.split("_")[1] || "0", 10);
      return na - nb;
    });
    for (const slot of slots) {
      const piece = carouselPieces[slot] || {};
      const items = [piece.item_1, piece.item_2, piece.item_3]
        .filter((x) => (typeof x === "string" ? x.trim() : x))
        .filter(Boolean);
      result += `  ${slot}: ${piece.name || ""}`;
      if (items.length) result += ` (Items: ${items.join(", ")})`;
      result += "\n";
    }
    return result + "\n";
  }

  // Roster - players status
  if (feature === "roster" && typeof info?.roster?.player_status === "string") {
    let statusObj;
    try {
      statusObj = JSON.parse(info.roster.player_status);
    } catch {
      statusObj = null;
    }
    if (statusObj && typeof statusObj === "object") {
      const entries = Object.entries(statusObj)
        .map(([name, v]) => ({
          name,
          index: v?.index ?? 0,
          health: v?.health,
          level: v?.xp, // appears to represent level here
          rank: v?.rank,
          tag: v?.tag_line,
          me: !!v?.localplayer,
        }))
        .sort((a, b) => a.index - b.index);

      let result = "Roster:\n";
      for (const p of entries) {
        const you = p.me ? " (You)" : "";
        const parts = [];
        if (typeof p.health !== "undefined") parts.push(`HP ${p.health}`);
        if (typeof p.level !== "undefined") parts.push(`Level ${p.level}`);
        if (p.tag) parts.push(`Tag ${p.tag}`);
        if (p.rank && p.rank > 0) parts.push(`Rank ${p.rank}`);
        const detail = parts.join(", ");
        result += `  ${p.index}. ${p.name}${you}${
          detail ? ": " + detail : ""
        }\n`;
      }
      return result + "\n";
    }
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
