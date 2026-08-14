import type * as HashMap from "effect/HashMap";

import { type FellowshipDungeon } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import {
  type MilestoneRequirementEventType,
  type MilestoneRequirementId,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneDefinition } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";

export type FellowshipMilestoneConfiguration = {
  readonly dungeon: FellowshipDungeon;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type CompiledMilestoneRequirement = {
  readonly id: MilestoneRequirementId;
  readonly requiredCount: number;
  readonly type: MilestoneRequirementEventType;
};

export type CompiledMilestoneDefinition = Omit<
  FellowshipMilestoneDefinition,
  "requirements"
> & {
  readonly requirements: ReadonlyArray<CompiledMilestoneRequirement>;
};

export type MilestoneRequirementTarget = {
  readonly milestoneId: string;
  readonly requiredCount: number;
};

export type MilestoneRequirementsById = HashMap.HashMap<
  MilestoneRequirementId,
  ReadonlyArray<MilestoneRequirementTarget>
>;

export type RequirementsByEvent = HashMap.HashMap<
  MilestoneRequirementEventType,
  MilestoneRequirementsById
>;

export type CompiledFellowshipMilestoneConfiguration =
  FellowshipMilestoneConfiguration & {
    readonly milestonesById: HashMap.HashMap<
      string,
      CompiledMilestoneDefinition
    >;
    readonly requirementsByEvent: RequirementsByEvent;
  };
