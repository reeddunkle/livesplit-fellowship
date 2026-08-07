import { type FellowshipDungeon } from "@/services/fellowship/constants/fellowship-dungeon.ts";

import { type FellowshipMilestoneDefinition } from "./milestone-configuration-file-schema.ts";

export type FellowshipMilestoneConfiguration = {
  readonly dungeon: FellowshipDungeon;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};
