import * as A from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import type * as Stream from "effect/Stream";

import { DungeonRunDAO } from "@/db/daos/dungeon-run/dungeon-run-dao.ts";
import { DungeonRunObservationDAO } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type processDungeonRunEventStream } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event-stream.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

type DungeonRunProcessingResult =
  ReturnType<typeof processDungeonRunEventStream> extends Stream.Stream<
    infer Result,
    unknown,
    unknown
  >
    ? Result
    : never;

type PersistDungeonRunResultOptions = {
  readonly activeDungeonRunId: Option.Option<DungeonRunId>;
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly result: DungeonRunProcessingResult;
};

type InterruptDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
};

export const persistDungeonRunResult = E.fn(
  "fellowship.dungeon-run.persist-result",
)(function* ({
  activeDungeonRunId,
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

  const runStartedEffects = pipe(
    result.events,
    A.filter((event) => {
      return event.type === "RUN_STARTED";
    }),
    A.map((event) => {
      return dungeonRunDAO
        .start({
          configurationDefinitionId,
          dungeonId: configuration.dungeonId,
          dungeonLevel: configuration.dungeonLevel,
          startedAt: event.timestamp,
        })
        .pipe(
          E.map((dungeonRun) => {
            return dungeonRun.id;
          }),
        );
    }),
  );

  const startedDungeonRunIds = yield* E.all(runStartedEffects, {
    concurrency: "unbounded",
  });

  const dungeonRunId = pipe(
    startedDungeonRunIds,
    A.last,
    Option.orElse(() => {
      return activeDungeonRunId;
    }),
  );

  const observe = Option.match(dungeonRunId, {
    onNone: () => {
      return E.void;
    },
    onSome: (matchedDungeonRunId) => {
      if (result.observation === undefined) {
        return E.void;
      }

      return dungeonRunObservationDAO.observe({
        dungeonRunId: matchedDungeonRunId,
        observedAt: result.observation.timestamp,
        occurrence: result.observation.occurrence,
        targetId: result.observation.targetId,
        type: result.observation.type,
      });
    },
  });

  const terminalEvents = pipe(
    result.events,
    A.filter((event) => {
      return event.type === "RUN_COMPLETED" || event.type === "RUN_EXITED";
    }),
  );

  const terminalEffects = Option.match(dungeonRunId, {
    onNone: () => {
      return [];
    },
    onSome: (matchedDungeonRunId) => {
      return pipe(
        terminalEvents,
        A.map((event) => {
          return Match.value(event).pipe(
            Match.when(
              {
                type: "RUN_COMPLETED",
              },
              (runCompleted) => {
                return dungeonRunDAO.complete({
                  dungeonRunId: matchedDungeonRunId,
                  endedAt: runCompleted.timestamp,
                });
              },
            ),
            Match.when(
              {
                type: "RUN_EXITED",
              },
              (runExited) => {
                return dungeonRunDAO.exit({
                  dungeonRunId: matchedDungeonRunId,
                  endedAt: runExited.timestamp,
                });
              },
            ),
            Match.exhaustive,
          );
        }),
      );
    },
  });

  yield* E.all([observe, ...terminalEffects], {
    concurrency: "unbounded",
    discard: true,
  });

  return terminalEvents.length > 0 ? Option.none<DungeonRunId>() : dungeonRunId;
});

export const interruptDungeonRun = E.fn("fellowship.dungeon-run.interrupt")(
  function* ({ dungeonRunId }: InterruptDungeonRunOptions) {
    yield* E.annotateCurrentSpan("fellowship.dungeonRunId", dungeonRunId);

    const dungeonRunDAO = yield* DungeonRunDAO;
    const endedAt = yield* DateTime.now;

    yield* dungeonRunDAO.interrupt({
      dungeonRunId,
      endedAt,
    });
  },
);
