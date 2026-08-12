import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";
import { processRunEventStream } from "@/services/fellowship/runs/process-run-event-stream.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

export type ProcessLiveSplitEventStreamOptions<E> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, E>;
};

function handleLiveSplitRunEvent({
  event,
  liveSplitClient,
}: {
  readonly event: RunProcessingEvent;
  readonly liveSplitClient: LiveSplitClient["Service"];
}) {
  switch (event.type) {
    case RUN_PROCESSING_EVENT.RUN_STARTED:
      return E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      });

    case RUN_PROCESSING_EVENT.RUN_EXITED:
      return liveSplitClient.pause();

    case RUN_PROCESSING_EVENT.MILESTONE_COMPLETED:
      return liveSplitClient.split();
  }
}

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
        return handleLiveSplitRunEvent({
          event,
          liveSplitClient,
        });
      }),
    );
  });
}
