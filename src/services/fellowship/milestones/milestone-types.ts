import { type FellowshipDungeon } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";

type DungeonStartMilestoneRequirement = {
  readonly type: typeof FELLOWSHIP_EVENT.DUNGEON_START;
};

type DungeonEndMilestoneRequirement = {
  readonly type: typeof FELLOWSHIP_EVENT.DUNGEON_END;
};

type EncounterStartMilestoneRequirement = {
  readonly encounterId: number;
  readonly type: typeof FELLOWSHIP_EVENT.ENCOUNTER_START;
};

type EncounterEndMilestoneRequirement = {
  readonly encounterId: number;
  readonly type: typeof FELLOWSHIP_EVENT.ENCOUNTER_END;
};

type UnitDeathMilestoneRequirement = {
  readonly type: typeof FELLOWSHIP_EVENT.UNIT_DEATH;
  readonly unitTypeId: number;
};

export type FellowshipMilestoneRequirement =
  | DungeonEndMilestoneRequirement
  | DungeonStartMilestoneRequirement
  | EncounterEndMilestoneRequirement
  | EncounterStartMilestoneRequirement
  | UnitDeathMilestoneRequirement;

export type FellowshipMilestoneDefinition = {
  readonly label: string;
  readonly milestoneId: string;
  readonly requirements: ReadonlyArray<FellowshipMilestoneRequirement>;
};

export type FellowshipMilestoneConfiguration = {
  readonly dungeon: FellowshipDungeon;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};
