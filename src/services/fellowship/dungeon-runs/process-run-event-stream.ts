import * as Stream from "effect/Stream";

import {
  type ProcessDungeonRunEventResult,
  processDungeonRunEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import { createInitialRunState } from "@/services/fellowship/dungeon-runs/run-processing-state.ts";
import { compileMilestoneConfiguration } from "@/services/fellowship/milestones/compile-milestone-configuration.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessRunEventStreamOptions<Error> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, Error>;
};

type ProcessRunEventStreamResult = ProcessDungeonRunEventResult & {
  readonly configuration: ReturnType<typeof compileMilestoneConfiguration>;
};

export function processRunEventStream<Error>({
  configuration,
  events,
}: ProcessRunEventStreamOptions<Error>) {
  const compiledConfiguration = compileMilestoneConfiguration(configuration);

  return events.pipe(
    Stream.mapAccum(createInitialRunState, (state, event) => {
      const result = processDungeonRunEvent({
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
