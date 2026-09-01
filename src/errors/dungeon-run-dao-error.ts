import * as Data from "effect/Data";

import { type DungeonRunId } from "@/db/models/dungeon-run-model.ts";

export type DungeonRunDAOErrorDetails =
  | {
      readonly _tag: "RunNotFoundOrInactive";
      readonly dungeonRunId: DungeonRunId;
    }
  | {
      readonly _tag: "DuplicateObservation";
      readonly dungeonRunId: DungeonRunId;
      readonly occurrence: number;
      readonly targetId: string;
      readonly type: string;
    }
  | {
      readonly _tag: "Unexpected";
      readonly cause: unknown;
    };

const DUNGEON_RUN_DAO_ERROR = "DungeonRunDAOError" as const;

export class DungeonRunDAOError extends Data.TaggedError(
  DUNGEON_RUN_DAO_ERROR,
)<{
  readonly details: DungeonRunDAOErrorDetails;
}> {}
