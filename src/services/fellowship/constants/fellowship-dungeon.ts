export const FELLOWSHIP_DUNGEON = {
  CITHRELS_FALL: {
    mapId: 1,
    name: "Cithrel's Fall",
    zoneId: 48,
  },
  EMPYREAN_SANDS: {
    mapId: 27,
    name: "Empyrean Sands",
    zoneId: 44,
  },
  EVERDAWN_GROVE: {
    mapId: 26,
    name: "Everdawn Grove",
    zoneId: 44,
  },
  GODFALL_QUARRY: {
    mapId: 32,
    name: "Godfall Quarry",
    zoneId: 44,
  },
  HEART_OF_TUZARI: {
    mapId: 6,
    name: "The Heart of Tuzari",
    zoneId: 45,
  },
  RANSACK_OF_DRAKHEIM: {
    mapId: 17,
    name: "Ransack of Drakheim",
    zoneId: 42,
  },
  RUINS_OF_REGATH: {
    mapId: 35,
    name: "Ruins of Regath",
    zoneId: 21,
  },
  SAILORS_ABYSS: {
    mapId: 24,
    name: "Sailor's Abyss",
    zoneId: 59,
  },
  SILKEN_HOLLOW: {
    mapId: 30,
    name: "Silken Hollow",
  },
  STORMWATCH: {
    mapId: 20,
    name: "Stormwatch",
    zoneId: 59,
  },
} as const;

export type FellowshipDungeonKey = keyof typeof FELLOWSHIP_DUNGEON;

export type FellowshipDungeon =
  (typeof FELLOWSHIP_DUNGEON)[FellowshipDungeonKey];
