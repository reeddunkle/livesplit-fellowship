export const FELLOWSHIP_DUNGEON = {
  CITHRELS_FALL: {
    mapId: 1,
    name: "Cithrel's Fall",
  },
  EMPYREAN_SANDS: {
    mapId: 27,
    name: "Empyrean Sands",
  },
  EVERDAWN_GROVE: {
    mapId: 26,
    name: "Everdawn Grove",
  },
  GODFALL_QUARRY: {
    mapId: 32,
    name: "Godfall Quarry",
  },
  HEART_OF_TUZARI: {
    mapId: 6,
    name: "The Heart of Tuzari",
  },
  RANSACK_OF_DRAKHEIM: {
    mapId: 17,
    name: "Ransack of Drakheim",
  },
  RUINS_OF_REGATH: {
    mapId: 35,
    name: "Ruins of Regath",
  },
  SAILORS_ABYSS: {
    mapId: 24,
    name: "Sailor's Abyss",
  },
  SILKEN_HOLLOW: {
    mapId: 30,
    name: "Silken Hollow",
  },
  STORMWATCH: {
    mapId: 20,
    name: "Stormwatch",
  },
} as const;

export type FellowshipDungeonKey = keyof typeof FELLOWSHIP_DUNGEON;

export type FellowshipDungeon =
  (typeof FELLOWSHIP_DUNGEON)[FellowshipDungeonKey];
