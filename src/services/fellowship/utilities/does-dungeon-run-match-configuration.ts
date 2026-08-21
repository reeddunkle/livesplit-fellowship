import { type FellowshipDungeon } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";

type DungeonConfigurationIdentity = {
  readonly dungeon: FellowshipDungeon;
};

type DungeonRunIdentity = {
  readonly start: DungeonStartEvent;
};

export type DoesDungeonRunMatchConfigurationOptions = {
  readonly configuration: DungeonConfigurationIdentity;
  readonly run: DungeonRunIdentity;
};

export function doesDungeonRunMatchConfiguration({
  configuration,
  run,
}: DoesDungeonRunMatchConfigurationOptions): boolean {
  return run.start.dungeonId === configuration.dungeon.dungeonId;
}
