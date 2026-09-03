import * as E from "effect/Effect";

import { DungeonRunObservationDAO } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import { type DungeonRunObservation } from "@/services/fellowship/dungeon-runs/dungeon-run-observation.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

type PersistDungeonRunObservationOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly observation: DungeonRunObservation;
};

export const persistDungeonRunObservation = E.fn(
  "fellowship.dungeon-run.persist-observation",
)(function* ({
  dungeonRunId,
  observation,
}: PersistDungeonRunObservationOptions) {
  yield* E.annotateCurrentSpan("fellowship.dungeonRunId", dungeonRunId);

  const dungeonRunObservationDAO = yield* DungeonRunObservationDAO;

  yield* dungeonRunObservationDAO.observe({
    dungeonRunId,
    observedAt: observation.observedAt,
    targetId: observation.targetId,
    type: observation.type,
  });
});
