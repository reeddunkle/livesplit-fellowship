import * as Data from "effect/Data";

import { type DungeonRunId } from "@/db/models/dungeon-run-model.ts";
import { type DungeonRunObservationModel } from "@/db/models/dungeon-run-observation-model.ts";

export type DungeonRunObservationDAOErrorDetails =
  | {
      readonly _tag: "RunNotFoundOrInactive";
      readonly dungeonRunId: DungeonRunId;
    }
  | {
      readonly _tag: "DuplicateObservation";
      readonly dungeonRunId: DungeonRunId;
      readonly occurrence: DungeonRunObservationModel["occurrence"];
      readonly targetId: DungeonRunObservationModel["targetId"];
      readonly type: DungeonRunObservationModel["type"];
    }
  | {
      readonly _tag: "Unexpected";
      readonly cause: unknown;
    };

const DUNGEON_RUN_OBSERVATION_DAO_ERROR =
  "DungeonRunObservationDAOError" as const;

export class DungeonRunObservationDAOError extends Data.TaggedError(
  DUNGEON_RUN_OBSERVATION_DAO_ERROR,
)<{
  readonly details: DungeonRunObservationDAOErrorDetails;
}> {}
