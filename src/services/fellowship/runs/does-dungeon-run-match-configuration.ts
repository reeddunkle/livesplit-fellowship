import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";

export type DungeonRunIdentity = {
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
  return (
    run.start.dungeonId === configuration.dungeon.dungeonId &&
    run.start.dungeonName === configuration.dungeon.name
  );
}
