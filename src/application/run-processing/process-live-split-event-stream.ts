import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

import { handleLiveSplitRunEvent } from "./handle-live-split-run-event.ts";
import { handleLogRunEvent } from "./handle-log-run-event.ts";

export type ProcessLiveSplitEventStreamOptions<E> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, E>;
};

export function processLiveSplitEventStream<E>({
  configuration,
  events,
}: ProcessLiveSplitEventStreamOptions<E>) {
  return E.gen(function* () {
    const liveSplitClient = yield* LiveSplitClient;

    return yield* processRunEventStream({
      configuration,
      events,
    }).pipe(
      Stream.runForEach((event) => {
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
          },
        ).pipe(E.asVoid);
      }),
    );
  });
}
