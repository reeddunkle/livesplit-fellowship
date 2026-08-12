import * as Stream from "effect/Stream";

import { compileMilestoneConfiguration } from "@/services/fellowship/milestones/compile-milestone-configuration.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processRunEvent } from "@/services/fellowship/runs/process-run-event.ts";
import { createInitialRunState } from "@/services/fellowship/runs/run-processing-state.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessRunEventStreamOptions<E> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, E>;
};

export function processRunEventStream<E>({
  configuration,
  events,
}: ProcessRunEventStreamOptions<E>) {
  const compiledConfiguration = compileMilestoneConfiguration(configuration);

  return events.pipe(
    Stream.mapAccum(createInitialRunState, (state, event) => {
      const result = processRunEvent({
        configuration: compiledConfiguration,
        event,
        state,
      });

      return [result.state, result.events] as const;
    }),
  );
}
