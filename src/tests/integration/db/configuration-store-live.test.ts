import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";

import { createConfigurationFingerprint } from "@/db/configuration/configuration-fingerprint.ts";
import {
  ConfigurationStore,
  type PersistedConfiguration,
} from "@/db/configuration/configuration-store.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
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
  dungeon: FELLOWSHIP_DUNGEON.EVERDAWN_GROVE,
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

describe("ConfigurationStoreLive", () => {
  test("creates and retrieves a configuration", async () => {
    const program = E.gen(function* () {
      const configurationStore = yield* ConfigurationStore;

      const created = yield* configurationStore.create({
        configuration,
      });

      expect(created.id).toBeDefined();
      expect(created.configuration).toEqual(configuration);

      const result = yield* configurationStore.getById({
        id: created.id,
      });

      const persisted = getPersistedConfiguration(result);

      expect(persisted.id).toBe(created.id);

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

  test("rejects a semantically duplicate configuration", async () => {
    const duplicateConfiguration = {
      dungeon: configuration.dungeon,
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

    const expectedFingerprint =
      createConfigurationFingerprint(configuration).fingerprint;

    const program = E.gen(function* () {
      const configurationStore = yield* ConfigurationStore;

      yield* configurationStore.create({
        configuration,
      });

      const result = yield* configurationStore
        .create({
          configuration: duplicateConfiguration,
        })
        .pipe(
          E.match({
            onFailure: Result.fail,
            onSuccess: Result.succeed,
          }),
        );

      expect(Result.isFailure(result)).toBe(true);

      if (Result.isFailure(result)) {
        expect(result.failure.details).toEqual({
          _tag: "DuplicateConfiguration",
          fingerprint: expectedFingerprint,
        });
      }
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("deletes a configuration", async () => {
    const program = E.gen(function* () {
      const configurationStore = yield* ConfigurationStore;

      const created = yield* configurationStore.create({
        configuration,
      });

      yield* configurationStore.delete({
        id: created.id,
      });

      const result = yield* configurationStore.getById({
        id: created.id,
      });

      expect(Option.isNone(result)).toBe(true);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("returns all persisted configurations", async () => {
    const secondConfiguration = {
      dungeon: FELLOWSHIP_DUNGEON.CITHRELS_FALL,
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
      const configurationStore = yield* ConfigurationStore;

      const first = yield* configurationStore.create({
        configuration,
      });

      const second = yield* configurationStore.create({
        configuration: secondConfiguration,
      });

      const persistedConfigurations = yield* configurationStore.getAll();

      expect(persistedConfigurations).toHaveLength(2);

      expect(
        persistedConfigurations.map((persisted) => {
          return persisted.id;
        }),
      ).toEqual(expect.arrayContaining([first.id, second.id]));

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
      let configurationId: string | undefined;

      const createProgram = E.gen(function* () {
        const configurationStore = yield* ConfigurationStore;

        const created = yield* configurationStore.create({
          configuration,
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
        const configurationStore = yield* ConfigurationStore;

        const result = yield* configurationStore.getById({
          id: persistedConfigurationId,
        });

        const persisted = getPersistedConfiguration(result);

        expect(persisted.id).toBe(persistedConfigurationId);

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
