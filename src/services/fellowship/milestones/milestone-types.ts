import type * as HashMap from "effect/HashMap";

import { type MilestoneRequirementTargetId } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { type FellowshipMilestoneDefinition } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

export type FellowshipMilestoneConfiguration = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly milestones: ReadonlyArray<FellowshipMilestoneDefinition>;
};

export type ConfigurationDefinitionRequirement = {
  readonly requiredCount: number;
  readonly startOccurrence: number;
  readonly targetId: MilestoneRequirementTargetId;
  readonly type: MilestoneRequirementEventType;
};

export type FellowshipConfigurationDefinition = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly requirements: ReadonlyArray<ConfigurationDefinitionRequirement>;
};

export type CompiledMilestoneRequirement = ConfigurationDefinitionRequirement;

export type CompiledMilestoneDefinition = Omit<
  FellowshipMilestoneDefinition,
  "requirements"
> & {
  readonly milestoneId: string;
  readonly requirements: ReadonlyArray<CompiledMilestoneRequirement>;
};

export type MilestoneRequirementReference = {
  readonly milestoneId: string;
  readonly requiredCount: number;
  readonly startOccurrence: number;
};

export type MilestoneRequirementReferencesByTargetId = HashMap.HashMap<
  MilestoneRequirementTargetId,
  ReadonlyArray<MilestoneRequirementReference>
>;

export type RequirementsByEvent = HashMap.HashMap<
  MilestoneRequirementEventType,
  MilestoneRequirementReferencesByTargetId
>;

export type CompiledFellowshipMilestoneConfiguration = Omit<
  FellowshipMilestoneConfiguration,
  "milestones"
> & {
  readonly milestones: ReadonlyArray<CompiledMilestoneDefinition>;
  readonly milestonesById: HashMap.HashMap<string, CompiledMilestoneDefinition>;
  readonly requirementsByEvent: RequirementsByEvent;
};
