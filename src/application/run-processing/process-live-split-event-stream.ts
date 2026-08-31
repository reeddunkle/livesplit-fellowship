import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplit } from "@/services/live-split/core/live-split-service.ts";

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
    const liveSplit = yield* LiveSplit;

    return yield* processRunEventStream({
      configuration,
      events,
    }).pipe(
      Stream.runForEach((result) => {
        return E.forEach(
          result.events,
          (event) => {
            return E.all(
              [handleLogRunEvent(event), liveSplit.handleRunEvent(event)],
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
