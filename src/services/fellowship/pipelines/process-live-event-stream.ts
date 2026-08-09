import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { handleLiveMilestone } from "@/services/fellowship/live/handle-live-milestone.ts";
import {
  createInitialLiveRunState,
  type LiveRunState,
} from "@/services/fellowship/live/live-run-state.ts";
import { processLiveEvent } from "@/services/fellowship/live/process-live-event.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessLiveEventStreamOptions<E> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, E>;
};

type ProcessLiveEventEffectOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: LiveRunState;
};

function processLiveEventEffect({
  configuration,
  event,
  state,
}: ProcessLiveEventEffectOptions) {
  const result = processLiveEvent({
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
    Stream.mapAccumEffect(createInitialLiveRunState, (state, event) => {
      return processLiveEventEffect({
        configuration,
        event,
        state,
      });
    }),
    Stream.runForEach((milestone) => {
      return handleLiveMilestone({
        milestone,
      });
    }),
  );
}
