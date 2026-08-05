import type * as DateTime from "effect/DateTime";

import { type DungeonEndEvent } from "./validation/events/dungeon-end.ts";
import { type DungeonStartEvent } from "./validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "./validation/fellowship-event-schema.ts";

export type RawFellowshipDungeonRun = {
  readonly end: DungeonEndEvent;
  readonly events: ReadonlyArray<FellowshipEvent>;
  readonly start: DungeonStartEvent;
};

export type FellowshipRunMilestone = {
  readonly elapsedMilliseconds: number;
  readonly label: string;
  readonly milestoneId: string;
  readonly timestamp: DateTime.Utc;
};

export type AnalyzedFellowshipDungeonRun = {
  readonly affixIds: DungeonStartEvent["affixIds"];
  readonly dungeonId: DungeonStartEvent["dungeonId"];
  readonly dungeonName: DungeonStartEvent["dungeonName"];
  readonly durationMilliseconds: number;
  readonly endTime: DateTime.Utc;
  readonly events: ReadonlyArray<FellowshipEvent>;
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly startTime: DateTime.Utc;
  readonly succeeded: DungeonEndEvent["succeeded"];
};

export type FellowshipSplitResult = {
  readonly elapsedMilliseconds: number;
  readonly label: string;
  readonly milestoneId: string;
  readonly segmentMilliseconds: number;
};
