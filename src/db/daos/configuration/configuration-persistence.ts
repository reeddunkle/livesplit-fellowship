import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as Match from "effect/Match";
import * as Order from "effect/Order";

import {
  createConfigurationDefinitionFingerprint,
  createConfigurationFingerprint,
} from "@/application/configurations/configuration-fingerprint.ts";
import { ConfigurationDefinitionModel } from "@/db/models/configuration-definition-model.ts";
import { ConfigurationModel } from "@/db/models/configuration-model.ts";
import { MilestoneModel } from "@/db/models/milestone-model.ts";
import { MilestoneRequirementModel } from "@/db/models/milestone-requirement-model.ts";
import { RequirementModel } from "@/db/models/requirement-model.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { getRequirementLookup } from "@/services/fellowship/requirements/requirement-lookup.ts";
import { type FellowshipRequirement } from "@/services/fellowship/validation/fellowship-configuration-file-schema.ts";
import { type RequirementEventType } from "@/services/fellowship/validation/requirement-event-type-schema.ts";
import { isNonEmptyArray } from "@/util/is-non-empty-array.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label-schema.ts";

import { type PersistedConfiguration } from "./configuration-dao.ts";

type ConfigurationDefinitionInsert =
  typeof ConfigurationDefinitionModel.insert.Type;
type ConfigurationInsert = typeof ConfigurationModel.insert.Type;
type MilestoneInsert = typeof MilestoneModel.insert.Type;
type MilestoneRequirementInsert = typeof MilestoneRequirementModel.insert.Type;
type RequirementInsert = typeof RequirementModel.insert.Type;

type RequirementIdentity = {
  readonly requiredCount: number;
  readonly startOccurrence: number;
  readonly targetId: string;
  readonly type: RequirementEventType;
};

type RequirementIdentityKey = readonly [
  type: RequirementIdentity["type"],
  targetId: RequirementIdentity["targetId"],
  startOccurrence: RequirementIdentity["startOccurrence"],
  requiredCount: RequirementIdentity["requiredCount"],
];

const RequirementIdentityKeyOrder = Order.Tuple([
  Order.String,
  Order.String,
  Order.Number,
  Order.Number,
]);

export type ConfigurationPersistenceRecords = {
  readonly configuration: ConfigurationInsert;
  readonly configurationDefinition: ConfigurationDefinitionInsert;
  readonly milestoneRequirements: ReadonlyArray<MilestoneRequirementInsert>;
  readonly milestones: ReadonlyArray<MilestoneInsert>;
  readonly requirements: ReadonlyArray<RequirementInsert>;
};

export type CreateConfigurationPersistenceRecordsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly label: ConfigurationLabel;
};

export type CreatePersistedConfigurationOptions = {
  readonly configuration: ConfigurationModel;
  readonly configurationDefinition: ConfigurationDefinitionModel;
  readonly milestoneRequirements: ReadonlyArray<MilestoneRequirementModel>;
  readonly milestones: ReadonlyArray<MilestoneModel>;
  readonly requirements: ReadonlyArray<RequirementModel>;
};

function getRequirementIdentityKey(
  requirement: RequirementIdentity,
): RequirementIdentityKey {
  return [
    requirement.type,
    requirement.targetId,
    requirement.startOccurrence,
    requirement.requiredCount,
  ];
}

function getRequirementIdentityMapKey(
  requirement: RequirementIdentity,
): string {
  return [
    requirement.type,
    encodeURIComponent(requirement.targetId),
    requirement.startOccurrence,
    requirement.requiredCount,
  ].join("|");
}

export function getMilestoneRequirementsIdentityKey(
  requirements: ReadonlyArray<RequirementIdentity>,
): string {
  const identityKeys = A.map(requirements, getRequirementIdentityKey);

  const sortedIdentityKeys = A.sort(identityKeys, RequirementIdentityKeyOrder);

  return JSON.stringify(sortedIdentityKeys);
}

function createRequirementIdentity({
  configuration,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: FellowshipRequirement;
}): RequirementIdentity {
  const lookup = getRequirementLookup({
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

function createRequirementInsert({
  configuration,
  configurationDefinitionId,
  requirement,
}: {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly requirement: FellowshipRequirement;
}): RequirementInsert {
  const identity = createRequirementIdentity({
    configuration,
    requirement,
  });

  return RequirementModel.insert.make({
    configurationDefinitionId,
    ...identity,
  });
}

function createRequirement(
  requirement: RequirementModel,
): FellowshipRequirement {
  const common = {
    requiredCount: requirement.requiredCount,
    startOccurrence: requirement.startOccurrence,
  };

  return Match.value(requirement.type).pipe(
    Match.when(FELLOWSHIP_EVENT.ABILITY_ACTIVATED, (type) => ({
      ...common,
      abilityId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.DUNGEON_START, (type) => ({
      ...common,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.DUNGEON_END, (type) => ({
      ...common,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_START, (type) => ({
      ...common,
      encounterId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_END, (type) => ({
      ...common,
      encounterId: requirement.targetId,
      type,
    })),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, (type) => ({
      ...common,
      type,
      unitTypeId: requirement.targetId,
    })),
    Match.exhaustive,
  );
}

export function createConfigurationPersistenceRecords({
  configuration,
  label,
}: CreateConfigurationPersistenceRecordsOptions): E.Effect<
  ConfigurationPersistenceRecords,
  Error
> {
  return E.gen(function* () {
    const definitionFingerprintResult =
      yield* createConfigurationDefinitionFingerprint(configuration);

    const configurationFingerprintResult =
      yield* createConfigurationFingerprint(configuration);

    const configurationDefinition = ConfigurationDefinitionModel.insert.make({
      canonicalJson: definitionFingerprintResult.canonicalJson,
      dungeonId: configuration.dungeonId,
      dungeonLevel: configuration.dungeonLevel,
      fingerprint: definitionFingerprintResult.fingerprint,
    });

    const configurationRecord = ConfigurationModel.insert.make({
      canonicalJson: configurationFingerprintResult.canonicalJson,
      configurationDefinitionId: configurationDefinition.id,
      fingerprint: configurationFingerprintResult.fingerprint,
      label,
    });

    const allRequirements = A.flatMap(configuration.milestones, (milestone) => {
      return milestone.requirements;
    });

    const requirementsByIdentity = A.reduce(
      allRequirements,
      new Map<string, RequirementInsert>(),
      (accumulator, requirement) => {
        const identity = createRequirementIdentity({
          configuration,
          requirement,
        });

        const identityKey = getRequirementIdentityMapKey(identity);

        if (accumulator.has(identityKey)) {
          return accumulator;
        }

        accumulator.set(
          identityKey,
          createRequirementInsert({
            configuration,
            configurationDefinitionId: configurationDefinition.id,
            requirement,
          }),
        );

        return accumulator;
      },
    );

    const requirements = A.fromIterable(requirementsByIdentity.values());

    const milestonePersistenceRecords = A.map(
      configuration.milestones,
      (milestone) => {
        const milestoneRecord = MilestoneModel.insert.make({
          configurationId: configurationRecord.id,
          label: milestone.label,
        });

        const milestoneRequirementRecords = A.map(
          milestone.requirements,
          (requirement) => {
            const identity = createRequirementIdentity({
              configuration,
              requirement,
            });

            const requirementRecord = requirementsByIdentity.get(
              getRequirementIdentityMapKey(identity),
            );

            if (requirementRecord === undefined) {
              throw new Error(
                `Could not resolve requirement for milestone "${milestone.label}".`,
              );
            }

            return MilestoneRequirementModel.insert.make({
              milestoneId: milestoneRecord.id,
              requirementId: requirementRecord.id,
            });
          },
        );

        return {
          milestoneRecord,
          milestoneRequirementRecords,
        };
      },
    );

    const milestones = A.map(
      milestonePersistenceRecords,
      ({ milestoneRecord }) => {
        return milestoneRecord;
      },
    );

    const milestoneRequirements = A.flatMap(
      milestonePersistenceRecords,
      ({ milestoneRequirementRecords }) => {
        return milestoneRequirementRecords;
      },
    );

    return {
      configuration: configurationRecord,
      configurationDefinition,
      milestoneRequirements,
      milestones,
      requirements,
    };
  });
}

export function createPersistedConfiguration({
  configuration,
  configurationDefinition,
  milestoneRequirements,
  milestones,
  requirements,
}: CreatePersistedConfigurationOptions): PersistedConfiguration {
  const configurationMilestones = A.map(milestones, (milestone) => {
    const requirementIds = A.map(
      A.filter(milestoneRequirements, (milestoneRequirement) => {
        return milestoneRequirement.milestoneId === milestone.id;
      }),
      (milestoneRequirement) => {
        return milestoneRequirement.requirementId;
      },
    );

    const requirementModels = A.filter(requirements, (requirement) => {
      return requirementIds.includes(requirement.id);
    });

    if (!isNonEmptyArray(requirementModels)) {
      throw new Error(
        `Persisted milestone "${milestone.id}" has no requirements.`,
      );
    }

    return {
      label: milestone.label,
      requirements: A.map(requirementModels, createRequirement),
    };
  });

  return {
    configuration: {
      dungeonId: configurationDefinition.dungeonId,
      dungeonLevel: configurationDefinition.dungeonLevel,
      milestones: configurationMilestones,
    },
    configurationDefinitionId: configurationDefinition.id,
    createdAt: configuration.createdAt,
    fingerprint: configuration.fingerprint,
    id: configuration.id,
    label: configuration.label,
    updatedAt: configuration.updatedAt,
  };
}
