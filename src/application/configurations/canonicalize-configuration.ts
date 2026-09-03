import * as Order from "effect/Order";

import {
  type ConfigurationDefinitionRequirement,
  type FellowshipConfigurationDefinition,
  type FellowshipMilestoneConfiguration,
} from "@/services/fellowship/milestones/configuration-types.ts";
import { getMilestoneRequirementLookup } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type DungeonId } from "@/services/fellowship/validation/fellowship-common.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";

type CanonicalMilestone = {
  readonly requirements: ReadonlyArray<ConfigurationDefinitionRequirement>;
};

type CanonicalConfiguration = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly milestones: ReadonlyArray<CanonicalMilestone>;
};

export type CanonicalConfigurationInput = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly milestones: ReadonlyArray<{
    readonly requirements: ReadonlyArray<ConfigurationDefinitionRequirement>;
  }>;
};

type CanonicalConfigurationDefinitionInput = {
  readonly dungeonId: DungeonId;
  readonly dungeonLevel: number;
  readonly requirements: ReadonlyArray<ConfigurationDefinitionRequirement>;
};

const ConfigurationDefinitionRequirementOrder = Order.Struct({
  requiredCount: Order.Number,
  startOccurrence: Order.Number,
  targetId: Order.String,
  type: Order.String,
});

const CanonicalMilestoneOrder = Order.Struct({
  requirements: Order.Array(ConfigurationDefinitionRequirementOrder),
});

function getRequirementIdentityKey(
  requirement: ConfigurationDefinitionRequirement,
): string {
  return JSON.stringify([
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ]);
}

function canonicalizeRequirement({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipMilestoneRequirement;
}): ConfigurationDefinitionRequirement {
  const lookup = getMilestoneRequirementLookup({
    dungeonId: configuration.dungeonId,
    requirement,
  });

  return {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
    targetId: lookup.targetId,
    type: lookup.type,
  };
}

function canonicalizeConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): CanonicalConfiguration {
  return canonicalizeNormalizedConfiguration({
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    milestones: configuration.milestones.map((milestone) => {
      return {
        requirements: milestone.requirements.map((requirement) => {
          return canonicalizeRequirement({
            configuration,
            requirement,
          });
        }),
      };
    }),
  });
}

function canonicalizeConfigurationDefinition(
  configuration: FellowshipMilestoneConfiguration,
): FellowshipConfigurationDefinition {
  const requirementsByIdentity = new Map<
    string,
    ConfigurationDefinitionRequirement
  >();

  configuration.milestones.forEach((milestone) => {
    milestone.requirements.forEach((requirement) => {
      const canonicalRequirement = canonicalizeRequirement({
        configuration,
        requirement,
      });

      requirementsByIdentity.set(
        getRequirementIdentityKey(canonicalRequirement),
        canonicalRequirement,
      );
    });
  });

  return canonicalizeNormalizedConfigurationDefinition({
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    requirements: Array.from(requirementsByIdentity.values()),
  });
}

function canonicalizeNormalizedConfiguration(
  configuration: CanonicalConfigurationInput,
): CanonicalConfiguration {
  const milestones = configuration.milestones.map((milestone) => {
    const requirements = [...milestone.requirements].sort(
      ConfigurationDefinitionRequirementOrder,
    );

    return {
      requirements,
    } satisfies CanonicalMilestone;
  });

  milestones.sort(CanonicalMilestoneOrder);

  return {
    dungeonId: configuration.dungeonId,
    dungeonLevel: configuration.dungeonLevel,
    milestones,
  };
}

function canonicalizeNormalizedConfigurationDefinition(
  definition: CanonicalConfigurationDefinitionInput,
): FellowshipConfigurationDefinition {
  const requirements = [...definition.requirements].sort(
    ConfigurationDefinitionRequirementOrder,
  );

  return {
    dungeonId: definition.dungeonId,
    dungeonLevel: definition.dungeonLevel,
    requirements,
  };
}

export function serializeCanonicalConfiguration(
  configuration: FellowshipMilestoneConfiguration,
): string {
  return JSON.stringify(canonicalizeConfiguration(configuration));
}

export function serializeCanonicalConfigurationDefinition(
  configuration: FellowshipMilestoneConfiguration,
): string {
  return JSON.stringify(canonicalizeConfigurationDefinition(configuration));
}

export function serializeNormalizedCanonicalConfiguration(
  configuration: CanonicalConfigurationInput,
): string {
  return JSON.stringify(canonicalizeNormalizedConfiguration(configuration));
}
