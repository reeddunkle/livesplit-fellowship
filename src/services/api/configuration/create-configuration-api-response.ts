import { type PersistedConfiguration } from "@/db/configuration/configuration-store.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiMilestone,
  type ConfigurationApiRequirement,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { isNonEmptyArray } from "@/util/is-non-empty-array.ts";

function createConfigurationApiRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): ConfigurationApiRequirement {
  const lookup = getMilestoneRequirementLookup({
    dungeonId: configuration.dungeon.dungeonId,
    requirement,
  });

  return {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  };
}

function createConfigurationApiMilestone({
  configuration,
  milestone,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly milestone: FellowshipMilestoneConfiguration["milestones"][number];
}): ConfigurationApiMilestone {
  const requirements = milestone.requirements.map((requirement) => {
    return createConfigurationApiRequirement({
      configuration,
      requirement,
    });
  });

  if (!isNonEmptyArray(requirements)) {
    throw new Error(`Milestone "${milestone.label}" has no requirements.`);
  }

  return {
    label: milestone.label,
    requirements,
  };
}

export function createConfigurationApiResponse({
  configuration,
  id,
}: PersistedConfiguration): ConfigurationApiConfiguration {
  return {
    dungeonId: configuration.dungeon.dungeonId,
    dungeonName: configuration.dungeon.name,
    id,
    milestones: configuration.milestones.map((milestone) => {
      return createConfigurationApiMilestone({
        configuration,
        milestone,
      });
    }),
  };
}
