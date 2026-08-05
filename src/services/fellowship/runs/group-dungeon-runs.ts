import * as A from "effect/Array";
import { pipe } from "effect/Function";

import { type RawFellowshipDungeonRun } from "@/services/fellowship/types.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
  trackDungeonRunEvent,
} from "./track-dungeon-run.ts";

export function groupDungeonRuns(
  events: ReadonlyArray<FellowshipEvent>,
): ReadonlyArray<RawFellowshipDungeonRun> {
  return pipe(
    events,
    A.reduce<DungeonRunTrackerState, FellowshipEvent>(
      initialDungeonRunTrackerState,
      (state, event) => {
        return trackDungeonRunEvent({ event, state }).state;
      },
    ),
    (state) => state.completedRuns,
  );
}
