import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";

export type DoesDungeonStartMatchConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly dungeonStart: DungeonStartEvent;
};

export function doesDungeonStartMatchConfiguration({
  configuration,
  dungeonStart,
}: DoesDungeonStartMatchConfigurationOptions): boolean {
  const matchesDungeon =
    dungeonStart.dungeonName === configuration.dungeon.name &&
    dungeonStart.zoneId === configuration.dungeon.zoneId;

  const matchesKeyLevel =
    configuration.keyLevel === undefined ||
    dungeonStart.keyLevel === configuration.keyLevel;

  return matchesDungeon && matchesKeyLevel;
}
