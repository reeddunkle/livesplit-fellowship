import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type RawFellowshipDungeonRun } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type MapChangeEvent } from "@/services/fellowship/validation/events/map-change.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type DungeonRunTrackerState = {
  readonly completedRuns: ReadonlyArray<RawFellowshipDungeonRun>;
  readonly currentEvents: ReadonlyArray<FellowshipEvent>;
  readonly currentMapId: MapChangeEvent["mapId"] | undefined;
  readonly currentStart: DungeonStartEvent | undefined;
  readonly latestMapId: MapChangeEvent["mapId"] | undefined;
};

export const initialDungeonRunTrackerState = {
  completedRuns: [],
  currentEvents: [],
  currentMapId: undefined,
  currentStart: undefined,
  latestMapId: undefined,
} satisfies DungeonRunTrackerState;

export type DungeonRunTrackerResult = {
  readonly completedRun?: RawFellowshipDungeonRun;
  readonly state: DungeonRunTrackerState;
};

type TrackDungeonRunEvent = {
  state: DungeonRunTrackerState;
  event: FellowshipEvent;
};

export function trackDungeonRunEvent({
  state,
  event,
}: TrackDungeonRunEvent): DungeonRunTrackerResult {
  if (event.type === FELLOWSHIP_EVENT.MAP_CHANGE) {
    return {
      state: {
        ...state,
        latestMapId: event.mapId,
      },
    };
  }

  if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
    if (state.latestMapId === undefined) {
      throw new Error(
        `Received DUNGEON_START for "${event.dungeonName}" before MAP_CHANGE.`,
      );
    }

    return {
      state: {
        completedRuns: state.completedRuns,
        currentEvents: [event],
        currentMapId: state.latestMapId,
        currentStart: event,
        latestMapId: state.latestMapId,
      },
    };
  }

  if (state.currentStart === undefined || state.currentMapId === undefined) {
    return { state };
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
    mapId: state.currentMapId,
    start: state.currentStart,
  } satisfies RawFellowshipDungeonRun;

  return {
    completedRun,
    state: {
      completedRuns: [...state.completedRuns, completedRun],
      currentEvents: [],
      currentMapId: undefined,
      currentStart: undefined,
      latestMapId: state.latestMapId,
    },
  };
}
