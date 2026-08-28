import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import { describe, expect, test } from "vitest";

import {
  ConfigurationDAO,
  type PersistedConfiguration,
} from "@/db/daos/configuration/configuration-dao.ts";
import { createConfigurationFingerprint } from "@/db/daos/configuration/configuration-fingerprint.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type MilestoneDefinition =
  FellowshipMilestoneConfiguration["milestones"][number];

type MilestoneRequirement = MilestoneDefinition["requirements"][number];

const CITHRELS_FALL_DUNGEON_ID = "7";
const DUNGEON_LEVEL = 63;
const EVERDAWN_GROVE_DUNGEON_ID = "11";

const CONFIGURATION_LABEL = "Everdawn Grove Route";
const UPDATED_CONFIGURATION_LABEL = "Updated Everdawn Grove Route";
const SECOND_CONFIGURATION_LABEL = "Cithrel's Fall Route";

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
  dungeonId: EVERDAWN_GROVE_DUNGEON_ID,
  dungeonLevel: DUNGEON_LEVEL,
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
        label: CONFIGURATION_LABEL,
      });

      expect(created.id).toBeDefined();
      expect(created.configuration).toEqual(configuration);
      expect(created.label).toBe(CONFIGURATION_LABEL);

      const result = yield* configurationDAO.getById({
        id: created.id,
      });

      const persisted = getPersistedConfiguration(result);

      expect(persisted.id).toBe(created.id);
      expect(persisted.label).toBe(CONFIGURATION_LABEL);
      expect(persisted.configuration.dungeonLevel).toBe(DUNGEON_LEVEL);

      const originalFingerprint = createConfigurationFingerprint(configuration);

      const persistedFingerprint = createConfigurationFingerprint(
        persisted.configuration,
      );

      expect(persistedFingerprint.fingerprint).toBe(
        originalFingerprint.fingerprint,
      );

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

  test("updates the label for a semantically duplicate configuration", async () => {
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

      const first = yield* configurationDAO.save({
        configuration,
        label: CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: duplicateConfiguration,
        label: UPDATED_CONFIGURATION_LABEL,
      });

      expect(second.id).toBe(first.id);
      expect(second.label).toBe(UPDATED_CONFIGURATION_LABEL);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(1);

      const persisted = persistedConfigurations[0];

      expect(persisted).toBeDefined();

      if (persisted === undefined) {
        return;
      }

      expect(persisted.id).toBe(first.id);
      expect(persisted.label).toBe(UPDATED_CONFIGURATION_LABEL);

      expect(
        createConfigurationFingerprint(persisted.configuration).fingerprint,
      ).toBe(createConfigurationFingerprint(configuration).fingerprint);
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
        label: CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: differentLevelConfiguration,
        label: UPDATED_CONFIGURATION_LABEL,
      });

      expect(second.id).not.toBe(first.id);

      const persistedConfigurations = yield* configurationDAO.getAll();

      expect(persistedConfigurations).toHaveLength(2);

      expect(
        createConfigurationFingerprint(configuration).fingerprint,
      ).not.toBe(
        createConfigurationFingerprint(differentLevelConfiguration).fingerprint,
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("deletes a configuration", async () => {
    const program = E.gen(function* () {
      const configurationDAO = yield* ConfigurationDAO;

      const created = yield* configurationDAO.save({
        configuration,
        label: CONFIGURATION_LABEL,
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

  test("returns all persisted configurations", async () => {
    const secondConfiguration = {
      dungeonId: CITHRELS_FALL_DUNGEON_ID,
      dungeonLevel: DUNGEON_LEVEL,
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
        label: CONFIGURATION_LABEL,
      });

      const second = yield* configurationDAO.save({
        configuration: secondConfiguration,
        label: SECOND_CONFIGURATION_LABEL,
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
          CONFIGURATION_LABEL,
          SECOND_CONFIGURATION_LABEL,
        ]),
      );

      expect(
        persistedConfigurations.map((persisted) => {
          return createConfigurationFingerprint(persisted.configuration)
            .fingerprint;
        }),
      ).toEqual(
        expect.arrayContaining([
          createConfigurationFingerprint(configuration).fingerprint,
          createConfigurationFingerprint(secondConfiguration).fingerprint,
        ]),
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("persists configurations across database restarts", async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "livesplit-fellowship-"),
    );

    const databaseFilename = join(
      temporaryDirectory,
      "livesplit-fellowship.db",
    );

    try {
      let configurationId: ConfigurationId | undefined;

      const createProgram = E.gen(function* () {
        const configurationDAO = yield* ConfigurationDAO;

        const created = yield* configurationDAO.save({
          configuration,
          label: CONFIGURATION_LABEL,
        });

        configurationId = created.id;
      }).pipe(
        E.provide(
          makePersistenceLayer({
            databaseFilename,
          }),
        ),
      );

      await runTest(E.scoped(createProgram));

      if (configurationId === undefined) {
        throw new Error("Expected configuration to be created.");
      }

      const persistedConfigurationId = configurationId;

      const readProgram = E.gen(function* () {
        const configurationDAO = yield* ConfigurationDAO;

        const result = yield* configurationDAO.getById({
          id: persistedConfigurationId,
        });

        const persisted = getPersistedConfiguration(result);

        expect(persisted.id).toBe(persistedConfigurationId);
        expect(persisted.label).toBe(CONFIGURATION_LABEL);
        expect(persisted.configuration.dungeonLevel).toBe(DUNGEON_LEVEL);

        expect(
          createConfigurationFingerprint(persisted.configuration).fingerprint,
        ).toBe(createConfigurationFingerprint(configuration).fingerprint);
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
