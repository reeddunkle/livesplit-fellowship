import {
  type FellowshipDungeon,
  type FellowshipDungeonKey,
} from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";

export type FellowshipMilestoneBase = {
  readonly label: string;
  readonly milestoneId: string;
};

export type DungeonStartMilestoneDefinition = FellowshipMilestoneBase & {
  readonly type: typeof FELLOWSHIP_EVENT.DUNGEON_START;
};

export type DungeonEndMilestoneDefinition = FellowshipMilestoneBase & {
  readonly type: typeof FELLOWSHIP_EVENT.DUNGEON_END;
};

export type EncounterStartMilestoneDefinition = FellowshipMilestoneBase & {
  readonly encounterId: number;
  readonly type: typeof FELLOWSHIP_EVENT.ENCOUNTER_START;
};

export type EncounterEndMilestoneDefinition = FellowshipMilestoneBase & {
  readonly encounterId: number;
  readonly type: typeof FELLOWSHIP_EVENT.ENCOUNTER_END;
};

export type UnitDeathMilestoneDefinition = FellowshipMilestoneBase & {
  readonly type: typeof FELLOWSHIP_EVENT.UNIT_DEATH;
  readonly unitTypeId: number;
};

export type FellowshipMilestoneDefinition =
  | DungeonEndMilestoneDefinition
  | DungeonStartMilestoneDefinition
  | EncounterEndMilestoneDefinition
  | EncounterStartMilestoneDefinition
  | UnitDeathMilestoneDefinition;

export type FellowshipMilestoneConfigurationFile = {
  readonly dungeonKey: FellowshipDungeonKey;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type FellowshipMilestoneConfiguration = {
  readonly dungeon: FellowshipDungeon;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type FellowshipSplitModel = {
  readonly milestoneIds: ReadonlyArray<string>;
};
