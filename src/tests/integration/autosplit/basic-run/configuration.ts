import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export const configuration = {
  dungeonId: "11",
  dungeonLevel: 64,
  milestones: [
    {
      label: "Desecrator 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
    {
      label: "Butcher 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          type: "UNIT_DEATH",
          unitTypeId: "41",
        },
      ],
    },
    {
      label: "Desecrator 2 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 2,
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
    {
      label: "Seer 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          type: "UNIT_DEATH",
          unitTypeId: "40",
        },
      ],
    },
    {
      label: "Butcher 2 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 2,
          type: "UNIT_DEATH",
          unitTypeId: "41",
        },
      ],
    },
    {
      label: "Shadowlord 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          type: "UNIT_DEATH",
          unitTypeId: "274",
        },
      ],
    },
    {
      label: "Shadowlord 2 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 2,
          type: "UNIT_DEATH",
          unitTypeId: "274",
        },
      ],
    },
    {
      label: "Boss Pull",
      requirements: [
        {
          encounterId: "30",
          requiredCount: 1,
          startOccurrence: 1,
          type: "ENCOUNTER_START",
        },
      ],
    },
    {
      label: "Boss Kill",
      requirements: [
        {
          encounterId: "30",
          requiredCount: 1,
          startOccurrence: 1,
          type: "ENCOUNTER_END",
        },
      ],
    },
  ],
} satisfies FellowshipMilestoneConfiguration;
