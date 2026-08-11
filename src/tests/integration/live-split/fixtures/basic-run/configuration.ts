import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export const configuration = {
  dungeon: FELLOWSHIP_DUNGEON.SAILORS_ABYSS,
  milestones: [
    {
      label: "Dungeon Started",
      milestoneId: "dungeon:start",
      requirements: [
        {
          type: "DUNGEON_START",
        },
      ],
    },
    {
      label: "Boss Pulled",
      milestoneId: "boss:pull",
      requirements: [
        {
          encounterId: 28,
          type: "ENCOUNTER_START",
        },
      ],
    },
    {
      label: "Boss Killed",
      milestoneId: "boss:kill",
      requirements: [
        {
          encounterId: 28,
          type: "ENCOUNTER_END",
        },
      ],
    },
  ],
} satisfies FellowshipMilestoneConfiguration;
