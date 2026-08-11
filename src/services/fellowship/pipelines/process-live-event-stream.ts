import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEvent } from "@/services/fellowship/runs/process-run-event.ts";
import {
  createInitialRunState,
  type RunProcessingState,
} from "@/services/fellowship/runs/run-processing-state.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessLiveEventStreamOptions<E> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, E>;
};

type ProcessLiveEventEffectOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: RunProcessingState;
};

function processLiveEventEffect({
  configuration,
  event,
  state,
}: ProcessLiveEventEffectOptions) {
  const result = processRunEvent({
    configuration,
    event,
    state,
  });

  return E.succeed([result.state, result.milestones] as const);
}

export function processLiveEventStream<E>({
  configuration,
  events,
}: ProcessLiveEventStreamOptions<E>) {
  return events.pipe(
    Stream.mapAccumEffect(createInitialRunState, (state, event) => {
      return processLiveEventEffect({
        configuration,
        event,
        state,
      });
    }),
    Stream.runForEach((milestone) => {
      return E.logInfo("Milestone completed.", {
        elapsedMilliseconds: milestone.elapsedMilliseconds,
        label: milestone.label,
        milestoneId: milestone.milestoneId,
      });
    }),
  );
}
