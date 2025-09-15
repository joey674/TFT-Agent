export const kGamesFeatures = new Map([
  // Teamfight Tactics
  [
    5426,
    [
      "gep_internal",
      "game_info",
      // "live_client_data",
      "me",
      // "match_info",
      "roster",
      "store",
      "board",
      "bench",
      "carousel", // 选秀
      "augments", // 装备
    ],
  ],

  // League of Legends
  // [
  //   5426,
  //   [
  //     "live_client_data",
  //     "matchState",
  //     "match_info",
  //     "death",
  //     "respawn",
  //     "abilities",
  //     "kill",
  //     "assist",
  //     "gold",
  //     "minions",
  //     "summoner_info",
  //     "gameMode",
  //     "teams",
  //     "level",
  //     "announcer",
  //     "counters",
  //     "damage",
  //     "heal",
  //   ],
  // ],

  // Valorant
  [21640, ["me", "game_info", "match_info", "kill", "death"]],
]);

export const kGameClassIds = Array.from(kGamesFeatures.keys());
