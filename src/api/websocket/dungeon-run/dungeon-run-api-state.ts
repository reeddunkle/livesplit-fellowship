import * as A from "effect/Array";

import {
  type DungeonRunObservationApi,
  type DungeonRunStateApi,
} from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";

export type CreateDungeonRunApiStateOptions = {
  readonly state: DungeonRunProcessingState;
};

function createDungeonRunApiObservations(
  state: DungeonRunProcessingState,
): ReadonlyArray<DungeonRunObservationApi> {
  return A.flatMap(
    A.fromIterable(state.requirementProcessor.requirementObservations),
    ([type, observationsByTargetId]) => {
      return A.flatMap(
        A.fromIterable(observationsByTargetId),
        ([targetId, observationHistory]) => {
          return A.map(observationHistory.observations, (observation) => {
            return {
              targetId,
              timestampMilliseconds: observation.timestamp.epochMilliseconds,
              type,
            };
          });
        },
      );
    },
  );
}

export function createDungeonRunApiState({
  state,
}: CreateDungeonRunApiStateOptions): DungeonRunStateApi {
  const runStart = state.runTracker.currentStart;

  return {
    dungeonRun:
      runStart === undefined
        ? null
        : {
            endedAtMilliseconds: null,
            startedAtMilliseconds: runStart.startedAt.epochMilliseconds,
            status: "ACTIVE",
          },
    observations: createDungeonRunApiObservations(state),
  };
}
