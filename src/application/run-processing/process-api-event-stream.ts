import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { publishRunApiState } from "@/api/publish-run-api-state.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { handleLogRunEvent } from "./handle-log-run-event.ts";

export type ProcessApiEventStreamOptions<Error> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, Error>;
};

export function processApiEventStream<Error>({
  configuration,
  events,
}: ProcessApiEventStreamOptions<Error>) {
  return E.gen(function* () {
    const pushEventServer = yield* PushEventServer;

    return yield* processRunEventStream({
      configuration,
      events,
    }).pipe(
      Stream.runForEach((result) => {
        const logEvents = E.forEach(
          result.events,
          (event) => {
            return handleLogRunEvent(event);
          },
          {
            concurrency: "unbounded",
            discard: true,
          },
        );

        const publishState = result.isStateUpdated
          ? publishRunApiState({
              configuration: result.configuration,
              pushEventServer,
              state: result.state,
            })
          : E.void;

        return E.all([logEvents, publishState], {
          concurrency: "unbounded",
          discard: true,
        });
      }),
    );
  });
}
