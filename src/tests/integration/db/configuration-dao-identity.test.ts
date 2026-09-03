import * as E from "effect/Effect";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";

import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/configuration-types.ts";
import {
  MOCK_CONFIGURATION_LABEL,
  MOCK_DUNGEON_ID,
  MOCK_DUNGEON_LEVEL,
  MOCK_UPDATED_CONFIGURATION_LABEL,
} from "@/tests/common/fixtures/configuration-fixtures.ts";
import { runTest } from "@/tests/common/run-test.ts";

type MilestoneDefinition =
  FellowshipMilestoneConfiguration["milestones"][number];

type MilestoneRequirement = MilestoneDefinition["requirements"][number];

const firstDesecratorMilestone = {
  label: "First Desecrator",
  requirements: [
    {
      requiredCount: 1,
      startOccurrence: 1,
      type: "UNIT_DEATH",
      unitTypeId: "42",
    },
  ],
} satisfies MilestoneDefinition;

const secondDesecratorMilestone = {
  label: "Second Desecrator",
  requirements: [
    {
      requiredCount: 1,
      startOccurrence: 2,
      type: "UNIT_DEATH",
      unitTypeId: "42",
    },
  ],
} satisfies MilestoneDefinition;

const bossPullMilestone = {
  label: "Boss Pull",
  requirements: [
    {
      encounterId: "30",
      requiredCount: 1,
      startOccurrence: 1,
      type: "ENCOUNTER_START",
    },
  ],
} satisfies MilestoneDefinition;

const combinedUnitDeathRequirement = {
  requiredCount: 1,
  startOccurrence: 1,
  type: "UNIT_DEATH",
  unitTypeId: "40",
} satisfies MilestoneRequirement;

const combinedAbilityRequirement = {
  abilityId: "634",
  requiredCount: 1,
  startOccurrence: 1,
  type: "ABILITY_ACTIVATED",
} satisfies MilestoneRequirement;

const combinedMilestone = {
  label: "Combined Milestone",
  requirements: [combinedUnitDeathRequirement, combinedAbilityRequirement],
} satisfies MilestoneDefinition;

const configuration = {
  dungeonId: MOCK_DUNGEON_ID,
  dungeonLevel: MOCK_DUNGEON_LEVEL,
  milestones: [
    firstDesecratorMilestone,
    secondDesecratorMilestone,
    bossPullMilestone,
    combinedMilestone,
  ],
} satisfies FellowshipMilestoneConfiguration;

function makeTestLayer() {
  return makePersistenceLayer({
    databaseFilename: ":memory:",
  });
}

describe("ConfigurationDAOLive identity", () => {
  test("rejects saving an exact duplicate configuration", async () => {
    const duplicateConfiguration = {
      dungeonId: configuration.dungeonId,
      dungeonLevel: configuration.dungeonLevel,
      milestones: [
        {
          ...combinedMilestone,
          label: "Different Combined Label",
          requirements: [
            combinedAbilityRequirement,
            combinedUnitDeathRequirement,
          ],
        },
        {
          ...bossPullMilestone,
          label: "Different Boss Pull Label",
        },
        {
          ...secondDesecratorMilestone,
          label: "Different Second Desecrator Label",
        },
        {
          ...firstDesecratorMilestone,
          label: "Different First Desecrator Label",
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const duplicateResult = yield* configurationDAO
        .save({
          configuration: duplicateConfiguration,
          label: MOCK_UPDATED_CONFIGURATION_LABEL,
        })
        .pipe(E.result);

      expect(Result.isFailure(duplicateResult)).toBe(true);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(1);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("updates configuration metadata without changing its identity", async () => {
    const updatedConfiguration = {
      dungeonId: configuration.dungeonId,
      dungeonLevel: configuration.dungeonLevel,
      milestones: [
        {
          ...combinedMilestone,
          label: "Updated Combined Label",
          requirements: [
            combinedAbilityRequirement,
            combinedUnitDeathRequirement,
          ],
        },
        {
          ...bossPullMilestone,
          label: "Updated Boss Pull Label",
        },
        {
          ...secondDesecratorMilestone,
          label: "Updated Second Desecrator Label",
        },
        {
          ...firstDesecratorMilestone,
          label: "Updated First Desecrator Label",
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const first = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const updated = yield* configurationDAO.update({
        configuration: updatedConfiguration,
        id: first.id,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      expect(updated.id).toBe(first.id);
      expect(updated.configurationDefinitionId).toBe(
        first.configurationDefinitionId,
      );
      expect(updated.fingerprint).toBe(first.fingerprint);
      expect(updated.label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);

      expect(
        updated.configuration.milestones.map((milestone) => {
          return milestone.label;
        }),
      ).toEqual(
        expect.arrayContaining([
          "Updated First Desecrator Label",
          "Updated Second Desecrator Label",
          "Updated Boss Pull Label",
          "Updated Combined Label",
        ]),
      );

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(1);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("shares a configuration definition between different milestone arrangements", async () => {
    const differentlyGroupedConfiguration = {
      dungeonId: configuration.dungeonId,
      dungeonLevel: configuration.dungeonLevel,
      milestones: [
        {
          label: "Desecrators",
          requirements: [
            firstDesecratorMilestone.requirements[0],
            secondDesecratorMilestone.requirements[0],
          ],
        },
        {
          label: "Everything Else",
          requirements: [
            bossPullMilestone.requirements[0],
            combinedUnitDeathRequirement,
            combinedAbilityRequirement,
          ],
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const first = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: differentlyGroupedConfiguration,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      expect(second.id).not.toBe(first.id);
      expect(second.fingerprint).not.toBe(first.fingerprint);

      expect(second.configurationDefinitionId).toBe(
        first.configurationDefinitionId,
      );

      expect(second.configuration).toEqual(differentlyGroupedConfiguration);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("saves a configuration and replaces other configurations for the same dungeon and level", async () => {
    const existingConfiguration = {
      ...configuration,
      milestones: [firstDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const replacementConfiguration = {
      ...configuration,
      milestones: [firstDesecratorMilestone, secondDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const differentLevelConfiguration = {
      ...configuration,
      dungeonLevel: configuration.dungeonLevel + 1,
    } satisfies FellowshipMilestoneConfiguration;

    const differentDungeonConfiguration = {
      ...configuration,
      dungeonId: "7",
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const existing = yield* configurationDAO.save({
        configuration: existingConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const differentLevel = yield* configurationDAO.save({
        configuration: differentLevelConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const differentDungeon = yield* configurationDAO.save({
        configuration: differentDungeonConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const replacement = yield* configurationDAO.saveReplacingDungeonAndLevel({
        configuration: replacementConfiguration,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      expect(replacement.id).not.toBe(existing.id);
      expect(replacement.configuration).toEqual(replacementConfiguration);
      expect(replacement.label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(3);

      expect(persistedConfigurations.map((persisted) => persisted.id)).toEqual(
        expect.arrayContaining([
          replacement.id,
          differentLevel.id,
          differentDungeon.id,
        ]),
      );

      expect(
        persistedConfigurations.some((persisted) => {
          return persisted.id === existing.id;
        }),
      ).toBe(false);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("rejects replacing with an existing duplicate configuration", async () => {
    const oldConfiguration = {
      ...configuration,
      milestones: [firstDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const retainedConfiguration = {
      ...configuration,
      milestones: [secondDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const duplicateRetainedConfiguration = {
      dungeonId: retainedConfiguration.dungeonId,
      dungeonLevel: retainedConfiguration.dungeonLevel,
      milestones: [
        {
          ...secondDesecratorMilestone,
          label: "Updated Milestone Label",
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const old = yield* configurationDAO.save({
        configuration: oldConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const retained = yield* configurationDAO.save({
        configuration: retainedConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const result = yield* configurationDAO
        .saveReplacingDungeonAndLevel({
          configuration: duplicateRetainedConfiguration,
          label: MOCK_UPDATED_CONFIGURATION_LABEL,
        })
        .pipe(E.result);

      expect(Result.isFailure(result)).toBe(true);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);

      expect(persistedConfigurations.map((persisted) => persisted.id)).toEqual(
        expect.arrayContaining([old.id, retained.id]),
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });
});
