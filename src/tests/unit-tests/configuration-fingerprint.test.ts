import { describe, expect, test } from "vitest";

import { createConfigurationFingerprint } from "@/db/daos/configuration/configuration-fingerprint.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

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
} satisfies FellowshipMilestoneConfiguration["milestones"][number];

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
} satisfies FellowshipMilestoneConfiguration["milestones"][number];

const configuration = {
  dungeonId: "11",
  dungeonLevel: 1,
  milestones: [firstDesecratorMilestone, secondDesecratorMilestone],
} satisfies FellowshipMilestoneConfiguration;

describe("createConfigurationFingerprint", () => {
  test("creates the same fingerprint when labels change", () => {
    const renamedConfiguration = {
      ...configuration,
      milestones: [
        {
          ...firstDesecratorMilestone,
          label: "A Different Label",
        },
        {
          ...secondDesecratorMilestone,
          label: "Another Different Label",
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const first = createConfigurationFingerprint(configuration);
    const second = createConfigurationFingerprint(renamedConfiguration);

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.canonicalJson).toBe(first.canonicalJson);
  });

  test("creates the same fingerprint when milestone order changes", () => {
    const reorderedConfiguration = {
      ...configuration,
      milestones: [secondDesecratorMilestone, firstDesecratorMilestone],
    } satisfies FellowshipMilestoneConfiguration;

    const first = createConfigurationFingerprint(configuration);
    const second = createConfigurationFingerprint(reorderedConfiguration);

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.canonicalJson).toBe(first.canonicalJson);
  });

  test("creates the same fingerprint when requirement order changes", () => {
    const unitDeathRequirement = {
      requiredCount: 1,
      startOccurrence: 1,
      type: "UNIT_DEATH",
      unitTypeId: "42",
    } satisfies FellowshipMilestoneConfiguration["milestones"][number]["requirements"][number];

    const encounterStartRequirement = {
      encounterId: "30",
      requiredCount: 1,
      startOccurrence: 1,
      type: "ENCOUNTER_START",
    } satisfies FellowshipMilestoneConfiguration["milestones"][number]["requirements"][number];

    const configurationWithMultipleRequirements = {
      dungeonId: "11",
      dungeonLevel: 1,
      milestones: [
        {
          label: "Combined Milestone",
          requirements: [unitDeathRequirement, encounterStartRequirement],
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const reorderedConfiguration = {
      dungeonId: "11",
      dungeonLevel: 1,
      milestones: [
        {
          label: "Combined Milestone",
          requirements: [encounterStartRequirement, unitDeathRequirement],
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const first = createConfigurationFingerprint(
      configurationWithMultipleRequirements,
    );

    const second = createConfigurationFingerprint(reorderedConfiguration);

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.canonicalJson).toBe(first.canonicalJson);
  });

  test("creates a different fingerprint when requirement semantics change", () => {
    const changedConfiguration = {
      ...configuration,
      milestones: [
        firstDesecratorMilestone,
        {
          ...secondDesecratorMilestone,
          requirements: [
            {
              requiredCount: 2,
              startOccurrence: 2,
              type: "UNIT_DEATH",
              unitTypeId: "42",
            },
          ],
        },
      ],
    } satisfies FellowshipMilestoneConfiguration;

    const first = createConfigurationFingerprint(configuration);
    const second = createConfigurationFingerprint(changedConfiguration);

    expect(second.fingerprint).not.toBe(first.fingerprint);
    expect(second.canonicalJson).not.toBe(first.canonicalJson);
  });

  test("creates a different fingerprint for a different dungeon", () => {
    const changedConfiguration = {
      ...configuration,
      dungeonId: "7",
    } satisfies FellowshipMilestoneConfiguration;

    const first = createConfigurationFingerprint(configuration);
    const second = createConfigurationFingerprint(changedConfiguration);

    expect(second.fingerprint).not.toBe(first.fingerprint);
  });
});
