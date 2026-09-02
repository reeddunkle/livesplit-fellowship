import * as Data from "effect/Data";

import { type DungeonRunObservationModel } from "@/db/models/dungeon-run-observation-model.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

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
