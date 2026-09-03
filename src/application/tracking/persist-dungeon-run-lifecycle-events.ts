import * as A from "effect/Array";
import * as E from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { DungeonRunDAO } from "@/db/daos/dungeon-run/dungeon-run-dao.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type DungeonRunProcessingEvent } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-event.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { type DungeonRunId } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

type PersistDungeonRunLifecycleEventsOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly dungeonRunId: Option.Option<DungeonRunId>;
  readonly events: ReadonlyArray<DungeonRunProcessingEvent>;
};

export const persistDungeonRunLifecycleEvents = E.fn(
  "fellowship.dungeon-run.persist-lifecycle-events",
)(function* ({
  configuration,
  configurationDefinitionId,
  dungeonRunId,
  events,
}: PersistDungeonRunLifecycleEventsOptions) {
  yield* E.annotateCurrentSpan(
    "fellowship.configurationDefinitionId",
    configurationDefinitionId,
  );

  yield* E.annotateCurrentSpan("fellowship.dungeonId", configuration.dungeonId);

  const dungeonRunDAO = yield* DungeonRunDAO;

  const runStartedEffects = pipe(
    events,
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

  const activeDungeonRunId = pipe(
    startedDungeonRunIds,
    A.last,
    Option.orElse(() => {
      return dungeonRunId;
    }),
  );

  const terminalEvents = pipe(
    events,
    A.filter((event) => {
      return event.type === "RUN_COMPLETED" || event.type === "RUN_EXITED";
    }),
  );

  const terminalEffects = Option.match(activeDungeonRunId, {
    onNone: () => {
      return [];
    },
    onSome: (matchingDungeonRunId) => {
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
                  dungeonRunId: matchingDungeonRunId,
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
                  dungeonRunId: matchingDungeonRunId,
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

  yield* E.all(terminalEffects, {
    concurrency: "unbounded",
    discard: true,
  });

  return terminalEvents.length > 0
    ? Option.none<DungeonRunId>()
    : activeDungeonRunId;
});
