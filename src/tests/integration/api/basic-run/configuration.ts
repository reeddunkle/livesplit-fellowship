import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export const configuration = {
  dungeon: FELLOWSHIP_DUNGEON.EVERDAWN_GROVE,
  milestones: [
    {
      label: "Desecrator 1 Killed",
      milestoneId: "desecrator:killed:1",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
    {
      label: "Butcher 1 Killed",
      milestoneId: "butcher:killed:1",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "41",
        },
      ],
    },
    {
      label: "Desecrator 2 Killed",
      milestoneId: "desecrator:killed:2",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
        {
          type: "UNIT_DEATH",
          unitTypeId: "42",
        },
      ],
    },
    {
      label: "Seer 1 Killed",
      milestoneId: "seer:killed:1",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "40",
        },
      ],
    },
    {
      label: "Butcher 2 Killed",
      milestoneId: "butcher:killed:2",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "41",
        },
        {
          type: "UNIT_DEATH",
          unitTypeId: "41",
        },
      ],
    },
    {
      label: "Shadowlord 1 Killed",
      milestoneId: "shadowlord:killed:1",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "274",
        },
      ],
    },
    {
      label: "Shadowlord 2 Killed",
      milestoneId: "shadowlord:killed:2",
      requirements: [
        {
          type: "UNIT_DEATH",
          unitTypeId: "274",
        },
        {
          type: "UNIT_DEATH",
          unitTypeId: "274",
        },
      ],
    },
    {
      label: "Boss Pull",
      milestoneId: "boss:pulled",
      requirements: [
        {
          encounterId: "30",
          type: "ENCOUNTER_START",
        },
      ],
    },
    {
      label: "Boss Kill",
      milestoneId: "boss:defeated",
      requirements: [
        {
          encounterId: "30",
          type: "ENCOUNTER_END",
        },
      ],
      targetElapsedTime: "00:11:48",
    },
  ],
} satisfies FellowshipMilestoneConfiguration;
