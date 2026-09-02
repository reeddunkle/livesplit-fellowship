import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import type * as Stream from "effect/Stream";

import { DungeonRunDAO } from "@/db/daos/dungeon-run/dungeon-run-dao.ts";
import { DungeonRunObservationDAO } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import { type processDungeonRunEventStream } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event-stream.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

type DungeonRunProcessingResult =
  ReturnType<typeof processDungeonRunEventStream> extends Stream.Stream<
    infer Success,
    unknown,
    unknown
  >
    ? Success
    : never;

type PersistDungeonRunResultOptions = {
  readonly activeDungeonRunIdRef: Ref.Ref<Option.Option<DungeonRunId>>;
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly result: DungeonRunProcessingResult;
};

type InterruptDungeonRunOptions = {
  readonly activeDungeonRunIdRef: Ref.Ref<Option.Option<DungeonRunId>>;
};

export const persistDungeonRunResult = E.fn(
  "fellowship.dungeon-run.persist-result",
)(function* ({
  activeDungeonRunIdRef,
  configuration,
  configurationDefinitionId,
  result,
}: PersistDungeonRunResultOptions) {
  yield* E.annotateCurrentSpan(
    "fellowship.configurationDefinitionId",
    configurationDefinitionId,
  );

  yield* E.annotateCurrentSpan("fellowship.dungeonId", configuration.dungeonId);

  const dungeonRunDAO = yield* DungeonRunDAO;
  const dungeonRunObservationDAO = yield* DungeonRunObservationDAO;

  /*
   * Persist run start before the observation. A DUNGEON_START result can
   * contain both RUN_STARTED and an observation.
   */
  for (const event of result.events) {
    yield* Match.value(event).pipe(
      Match.when(
        {
          type: "RUN_STARTED",
        },
        (runStarted) => {
          return E.gen(function* () {
            const dungeonRun = yield* dungeonRunDAO.start({
              configurationDefinitionId,
              dungeonId: configuration.dungeonId,
              dungeonLevel: configuration.dungeonLevel,
              startedAt: runStarted.timestamp,
            });

            yield* Ref.set(activeDungeonRunIdRef, Option.some(dungeonRun.id));
          });
        },
      ),
      Match.orElse(() => {
        return E.void;
      }),
    );
  }

  const activeDungeonRunId = yield* Ref.get(activeDungeonRunIdRef);

  if (result.observation !== undefined && Option.isSome(activeDungeonRunId)) {
    yield* dungeonRunObservationDAO.observe({
      dungeonRunId: activeDungeonRunId.value,
      observedAt: result.observation.timestamp,
      occurrence: result.observation.occurrence,
      targetId: result.observation.targetId,
      type: result.observation.type,
    });
  }

  /*
   * Persist terminal events after the observation. A DUNGEON_END result can
   * contain both an observation and RUN_COMPLETED.
   */
  for (const event of result.events) {
    yield* Match.value(event).pipe(
      Match.when(
        {
          type: "RUN_COMPLETED",
        },
        (runCompleted) => {
          return E.gen(function* () {
            const dungeonRunId = yield* Ref.get(activeDungeonRunIdRef);

            if (Option.isNone(dungeonRunId)) {
              return;
            }

            yield* dungeonRunDAO.complete({
              dungeonRunId: dungeonRunId.value,
              endedAt: runCompleted.timestamp,
            });

            yield* Ref.set(activeDungeonRunIdRef, Option.none());
          });
        },
      ),
      Match.when(
        {
          type: "RUN_EXITED",
        },
        (runExited) => {
          return E.gen(function* () {
            const dungeonRunId = yield* Ref.get(activeDungeonRunIdRef);

            if (Option.isNone(dungeonRunId)) {
              return;
            }

            yield* dungeonRunDAO.exit({
              dungeonRunId: dungeonRunId.value,
              endedAt: runExited.timestamp,
            });

            yield* Ref.set(activeDungeonRunIdRef, Option.none());
          });
        },
      ),
      Match.orElse(() => {
        return E.void;
      }),
    );
  }
});

export const interruptDungeonRun = E.fn("fellowship.dungeon-run.interrupt")(
  function* ({ activeDungeonRunIdRef }: InterruptDungeonRunOptions) {
    const activeDungeonRunId = yield* Ref.get(activeDungeonRunIdRef);

    if (Option.isNone(activeDungeonRunId)) {
      return;
    }

    yield* E.annotateCurrentSpan(
      "fellowship.dungeonRunId",
      activeDungeonRunId.value,
    );

    const dungeonRunDAO = yield* DungeonRunDAO;
    const endedAt = yield* DateTime.now;

    yield* dungeonRunDAO.interrupt({
      dungeonRunId: activeDungeonRunId.value,
      endedAt,
    });

    yield* Ref.set(activeDungeonRunIdRef, Option.none());
  },
);
