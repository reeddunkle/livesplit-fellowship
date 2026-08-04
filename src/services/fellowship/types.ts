import type * as DateTime from "effect/DateTime";

import {
  type FellowshipMilestoneConfiguration,
  type FellowshipMilestoneTrigger,
  type FellowshipSplitModel,
} from "./milestones/milestone-types.ts";
import { type DungeonEndEvent } from "./validation/events/dungeon-end.ts";
import { type DungeonStartEvent } from "./validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "./validation/fellowship-event-schema.ts";

export type RawFellowshipDungeonRun = {
  readonly end: DungeonEndEvent;
  readonly events: ReadonlyArray<FellowshipEvent>;
  readonly start: DungeonStartEvent;
};

export type FellowshipRunMilestoneType = FellowshipMilestoneTrigger["type"];

export type FellowshipRunMilestone = {
  readonly elapsedMilliseconds: number;
  readonly label: string;
  readonly milestoneId: string;
  readonly timestamp: DateTime.Utc;
  readonly type: FellowshipRunMilestoneType;
};

export type AnalyzedFellowshipDungeonRun = {
  readonly affixIds: ReadonlyArray<number>;
  readonly dungeonName: string;
  readonly durationMilliseconds: number;
  readonly endTime: DateTime.Utc;
  readonly events: ReadonlyArray<FellowshipEvent>;
  readonly keyLevel: number;
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly startTime: DateTime.Utc;
  readonly succeeded: boolean;
  readonly zoneId: number;
};

export type FellowshipGoalMilestone = {
  readonly elapsedMilliseconds: number;
  readonly milestoneId: string;
};

export type FellowshipGoalData = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly milestones: ReadonlyArray<FellowshipGoalMilestone>;
  readonly splitModel: FellowshipSplitModel;
};

export type FellowshipSplitResult = {
  readonly elapsedMilliseconds: number;
  readonly label: string;
  readonly milestoneId: string;
  readonly segmentMilliseconds: number;
};
