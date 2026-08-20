import * as Stream from "effect/Stream";

import { compileMilestoneConfiguration } from "@/services/fellowship/milestones/compile-milestone-configuration.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type ProcessRunEventResult,
  processRunEvent,
} from "@/services/fellowship/runs/process-run-event.ts";
import { createInitialRunState } from "@/services/fellowship/runs/run-processing-state.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessRunEventStreamOptions<Error> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, Error>;
};

export type ProcessRunEventStreamResult = ProcessRunEventResult & {
  readonly configuration: ReturnType<typeof compileMilestoneConfiguration>;
};

export function processRunEventStream<Error>({
  configuration,
  events,
}: ProcessRunEventStreamOptions<Error>) {
  const compiledConfiguration = compileMilestoneConfiguration(configuration);

  return events.pipe(
    Stream.mapAccum(createInitialRunState, (state, event) => {
      const result = processRunEvent({
        configuration: compiledConfiguration,
        event,
        state,
      });

      const streamResult = {
        ...result,
        configuration: compiledConfiguration,
      } satisfies ProcessRunEventStreamResult;

      return [result.state, [streamResult]];
    }),
  );
}
