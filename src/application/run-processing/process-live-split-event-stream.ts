import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

import { handleLiveSplitRunEvent } from "./handle-live-split-run-event.ts";
import { handleLogRunEvent } from "./handle-log-run-event.ts";

export type ProcessLiveSplitEventStreamOptions<Error> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, Error>;
};

export function processLiveSplitEventStream<Error>({
  configuration,
  events,
}: ProcessLiveSplitEventStreamOptions<Error>) {
  return E.gen(function* () {
    const liveSplitClient = yield* LiveSplitClient;

    return yield* processRunEventStream({
      configuration,
      events,
    }).pipe(
      Stream.runForEach((result) => {
        return E.forEach(
          result.events,
          (event) => {
            return E.all(
              [
                handleLogRunEvent(event),
                handleLiveSplitRunEvent({
                  event,
                  liveSplitClient,
                }),
              ],
              {
                concurrency: "unbounded",
                discard: true,
              },
            );
          },
          {
            concurrency: "unbounded",
            discard: true,
          },
        );
      }),
    );
  });
}
