import {
  type FellowshipDungeon,
  type FellowshipDungeonKey,
} from "@/services/fellowship/constants/fellowship-dungeon.ts";

type DungeonStartedMilestoneTrigger = {
  readonly type: "DUNGEON_START";
};

type DungeonEndedMilestoneTrigger = {
  readonly type: "DUNGEON_END";
};

type EncounterStartedMilestoneTrigger = {
  readonly encounterId: number;
  readonly type: "ENCOUNTER_START";
};

type EncounterEndedMilestoneTrigger = {
  readonly encounterId: number;
  readonly type: "ENCOUNTER_END";
};

type UnitDeathMilestoneTrigger = {
  readonly occurrence: number;
  readonly type: "UNIT_DEATH";
  readonly unitTypeId: number;
};

export type FellowshipMilestoneTrigger =
  | DungeonEndedMilestoneTrigger
  | DungeonStartedMilestoneTrigger
  | EncounterEndedMilestoneTrigger
  | EncounterStartedMilestoneTrigger
  | UnitDeathMilestoneTrigger;

export type FellowshipMilestoneConfigurationFile = {
  readonly dungeonKey: FellowshipDungeonKey;
  readonly keyLevel: number;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type FellowshipMilestoneDefinition = {
  readonly label: string;
  readonly milestoneId: string;
  readonly trigger: FellowshipMilestoneTrigger;
};

export type FellowshipMilestoneConfiguration = {
  readonly dungeon: FellowshipDungeon;
  readonly keyLevel?: number;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type FellowshipSplitModel = {
  readonly milestoneIds: ReadonlyArray<string>;
};
