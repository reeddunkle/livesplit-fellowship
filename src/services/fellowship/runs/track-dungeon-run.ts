import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type RawFellowshipDungeonRun } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type DungeonRunTrackerState = {
  readonly completedRuns: ReadonlyArray<RawFellowshipDungeonRun>;
  readonly currentEvents: ReadonlyArray<FellowshipEvent>;
  readonly currentStart: DungeonStartEvent | undefined;
};

export const initialDungeonRunTrackerState = {
  completedRuns: [],
  currentEvents: [],
  currentStart: undefined,
} satisfies DungeonRunTrackerState;

export type DungeonRunTrackerResult = {
  readonly completedRun?: RawFellowshipDungeonRun;
  readonly state: DungeonRunTrackerState;
};

type TrackDungeonRunEvent = {
  readonly event: FellowshipEvent;
  readonly state: DungeonRunTrackerState;
};

export function trackDungeonRunEvent({
  state,
  event,
}: TrackDungeonRunEvent): DungeonRunTrackerResult {
  if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
    return {
      state: {
        completedRuns: state.completedRuns,
        currentEvents: [event],
        currentStart: event,
      },
    };
  }

  if (state.currentStart === undefined) {
    return { state };
  }

  const hasExitedCurrentDungeon =
    event.type === FELLOWSHIP_EVENT.ZONE_CHANGE &&
    event.dungeonId !== state.currentStart.dungeonId;

  if (hasExitedCurrentDungeon) {
    return {
      state: {
        completedRuns: state.completedRuns,
        currentEvents: [],
        currentStart: undefined,
      },
    };
  }

  const currentEvents = [...state.currentEvents, event];

  if (event.type !== FELLOWSHIP_EVENT.DUNGEON_END) {
    return {
      state: {
        ...state,
        currentEvents,
      },
    };
  }

  const completedRun = {
    end: event,
    events: currentEvents,
    start: state.currentStart,
  } satisfies RawFellowshipDungeonRun;

  return {
    completedRun,
    state: {
      completedRuns: [...state.completedRuns, completedRun],
      currentEvents: [],
      currentStart: undefined,
    },
  };
}
