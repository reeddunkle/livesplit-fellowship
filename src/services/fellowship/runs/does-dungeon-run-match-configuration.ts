import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type MapChangeEvent } from "@/services/fellowship/validation/events/map-change.ts";

export type DungeonRunIdentity = {
  readonly mapId: MapChangeEvent["mapId"];
  readonly start: DungeonStartEvent;
};

export type DoesDungeonRunMatchConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly run: DungeonRunIdentity;
};

export function doesDungeonRunMatchConfiguration({
  configuration,
  run,
}: DoesDungeonRunMatchConfigurationOptions): boolean {
  const matchesDungeon =
    run.mapId === configuration.dungeon.mapId &&
    run.start.dungeonName === configuration.dungeon.name;

  const matchesKeyLevel =
    configuration.keyLevel === undefined ||
    run.start.keyLevel === configuration.keyLevel;

  return matchesDungeon && matchesKeyLevel;
}
