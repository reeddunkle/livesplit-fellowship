import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import { describe, expect, test } from "vitest";

import { createConfigurationFingerprint } from "@/application/configurations/configuration-fingerprint.ts";
import {
  ConfigurationDAO,
  type PersistedConfiguration,
} from "@/db/daos/configuration/configuration-dao.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  MOCK_CONFIGURATION_LABEL,
  MOCK_DUNGEON_ID,
  MOCK_DUNGEON_LEVEL,
  MOCK_UPDATED_CONFIGURATION_LABEL,
} from "@/tests/common/fixtures/configuration-fixtures.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

type MilestoneDefinition =
  FellowshipMilestoneConfiguration["milestones"][number];

type MilestoneRequirement = MilestoneDefinition["requirements"][number];

const CITHRELS_FALL_DUNGEON_ID = "7";

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

function getPersistedConfiguration(
  persisted: Option.Option<PersistedConfiguration>,
): PersistedConfiguration {
  if (Option.isNone(persisted)) {
    throw new Error("Expected persisted configuration.");
  }

  return persisted.value;
}

function makeTestLayer() {
  return makePersistenceLayer({
    databaseFilename: ":memory:",
  });
}

describe("ConfigurationDAOLive", () => {
  test("creates and retrieves a configuration", async () => {
    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const created = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      expect(created.id).toBeDefined();
      expect(created.configurationDefinitionId).toBeDefined();
      expect(created.configuration).toEqual(configuration);
      expect(created.label).toBe(MOCK_CONFIGURATION_LABEL);

      const expectedFingerprint =
        yield* createConfigurationFingerprint(configuration);

      expect(created.fingerprint).toBe(expectedFingerprint.fingerprint);

      const result = yield* configurationDAO.getById({
        id: created.id,
      });

      const persisted = getPersistedConfiguration(result);

      expect(persisted.id).toBe(created.id);
      expect(persisted.configurationDefinitionId).toBe(
        created.configurationDefinitionId,
      );
      expect(persisted.fingerprint).toBe(created.fingerprint);
      expect(persisted.label).toBe(MOCK_CONFIGURATION_LABEL);
      expect(persisted.configuration.dungeonLevel).toBe(MOCK_DUNGEON_LEVEL);

      expect(
        persisted.configuration.milestones.map((milestone) => {
          return milestone.label;
        }),
      ).toEqual(
        expect.arrayContaining([
          "First Desecrator",
          "Second Desecrator",
          "Boss Pull",
          "Combined Milestone",
        ]),
      );

      const secondDesecrator = persisted.configuration.milestones.find(
        (milestone) => {
          return milestone.label === "Second Desecrator";
        },
      );

      expect(secondDesecrator).toEqual({
        label: "Second Desecrator",
        requirements: [
          {
            requiredCount: 1,
            startOccurrence: 2,
            type: "UNIT_DEATH",
            unitTypeId: "42",
          },
        ],
      });

      const bossPull = persisted.configuration.milestones.find((milestone) => {
        return milestone.label === "Boss Pull";
      });

      expect(bossPull).toEqual({
        label: "Boss Pull",
        requirements: [
          {
            encounterId: "30",
            requiredCount: 1,
            startOccurrence: 1,
            type: "ENCOUNTER_START",
          },
        ],
      });

      const combined = persisted.configuration.milestones.find((milestone) => {
        return milestone.label === "Combined Milestone";
      });

      expect(combined?.requirements).toEqual(
        expect.arrayContaining([
          {
            requiredCount: 1,
            startOccurrence: 1,
            type: "UNIT_DEATH",
            unitTypeId: "40",
          },
          {
            abilityId: "634",
            requiredCount: 1,
            startOccurrence: 1,
            type: "ABILITY_ACTIVATED",
          },
        ]),
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("allows otherwise identical configurations at different dungeon levels", async () => {
    const differentLevelConfiguration = {
      ...configuration,
      dungeonLevel: configuration.dungeonLevel + 1,
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const first = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: differentLevelConfiguration,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      expect(second.id).not.toBe(first.id);
      expect(second.configurationDefinitionId).not.toBe(
        first.configurationDefinitionId,
      );
      expect(second.fingerprint).not.toBe(first.fingerprint);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("deletes a configuration", async () => {
    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const created = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      yield* configurationDAO.delete({
        id: created.id,
      });

      const result = yield* configurationDAO.getById({
        id: created.id,
      });

      expect(Option.isNone(result)).toBe(true);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("deletes configurations matching a dungeon and level", async () => {
    const matchingConfiguration = {
      ...configuration,
      milestones: [firstDesecratorMilestone, secondDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const differentLevelConfiguration = {
      ...configuration,
      dungeonLevel: configuration.dungeonLevel + 1,
    } satisfies FellowshipMilestoneConfiguration;

    const differentDungeonConfiguration = {
      ...configuration,
      dungeonId: CITHRELS_FALL_DUNGEON_ID,
    } satisfies FellowshipMilestoneConfiguration;

    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const first = yield* configurationDAO.save({
        configuration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: matchingConfiguration,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      const differentLevel = yield* configurationDAO.save({
        configuration: differentLevelConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      const differentDungeon = yield* configurationDAO.save({
        configuration: differentDungeonConfiguration,
        label: MOCK_CONFIGURATION_LABEL,
      });

      yield* configurationDAO.deleteByDungeonAndLevel({
        dungeonId: MOCK_DUNGEON_ID,
        dungeonLevel: MOCK_DUNGEON_LEVEL,
      });

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);

      expect(persistedConfigurations.map((persisted) => persisted.id)).toEqual(
        expect.arrayContaining([differentLevel.id, differentDungeon.id]),
      );

      expect(
        persistedConfigurations.map((persisted) => persisted.id),
      ).not.toEqual(expect.arrayContaining([first.id, second.id]));
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("returns all persisted configurations", async () => {
    const secondConfiguration = {
      dungeonId: CITHRELS_FALL_DUNGEON_ID,
      dungeonLevel: MOCK_DUNGEON_LEVEL,
      milestones: [
        {
          label: "Ghorn Defeated",
          requirements: [
            {
              requiredCount: 1,
              startOccurrence: 1,
              type: "UNIT_DEATH",
              unitTypeId: "280",
            },
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
        configuration: secondConfiguration,
        label: MOCK_UPDATED_CONFIGURATION_LABEL,
      });

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);

      expect(
        persistedConfigurations.map((persisted) => {
          return persisted.id;
        }),
      ).toEqual(expect.arrayContaining([first.id, second.id]));

      expect(
        persistedConfigurations.map((persisted) => {
          return persisted.label;
        }),
      ).toEqual(
        expect.arrayContaining([
          MOCK_CONFIGURATION_LABEL,
          MOCK_UPDATED_CONFIGURATION_LABEL,
        ]),
      );

      expect(
        persistedConfigurations.map((persisted) => {
          return persisted.fingerprint;
        }),
      ).toEqual(
        expect.arrayContaining([first.fingerprint, second.fingerprint]),
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("persists configurations across database restarts", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "livesplit-fellowship-"),
    );

    const databaseFilename = path.join(
      temporaryDirectory,
      "livesplit-fellowship.db",
    );

    try {
      let configurationId: ConfigurationId | undefined;
      let configurationDefinitionId:
        | PersistedConfiguration["configurationDefinitionId"]
        | undefined;

      const expectedFingerprint = await runTest(
        createConfigurationFingerprint(configuration),
      );

      const createProgram = E.gen(function* () {
        const configurationDAO = yield* ConfigurationDAO;

        const created = yield* configurationDAO.save({
          configuration,
          label: MOCK_CONFIGURATION_LABEL,
        });

        configurationId = created.id;
        configurationDefinitionId = created.configurationDefinitionId;

        expect(created.fingerprint).toBe(expectedFingerprint.fingerprint);
      }).pipe(
        E.provide(
          makePersistenceLayer({
            databaseFilename,
          }),
        ),
      );

      await runTest(E.scoped(createProgram));

      if (
        configurationId === undefined ||
        configurationDefinitionId === undefined
      ) {
        throw new Error("Expected configuration to be created.");
      }

      const persistedConfigurationId = configurationId;
      const persistedConfigurationDefinitionId = configurationDefinitionId;

      const readProgram = E.gen(function* () {
        const configurationDAO = yield* ConfigurationDAO;

        const result = yield* configurationDAO.getById({
          id: persistedConfigurationId,
        });

        const persisted = getPersistedConfiguration(result);

        expect(persisted.id).toBe(persistedConfigurationId);
        expect(persisted.configurationDefinitionId).toBe(
          persistedConfigurationDefinitionId,
        );
        expect(persisted.fingerprint).toBe(expectedFingerprint.fingerprint);
        expect(persisted.label).toBe(MOCK_CONFIGURATION_LABEL);
        expect(persisted.configuration.dungeonLevel).toBe(MOCK_DUNGEON_LEVEL);
      }).pipe(
        E.provide(
          makePersistenceLayer({
            databaseFilename,
          }),
        ),
      );

      await runTest(E.scoped(readProgram));
    } finally {
      await rm(temporaryDirectory, {
        force: true,
        recursive: true,
      });
    }
  });
});
