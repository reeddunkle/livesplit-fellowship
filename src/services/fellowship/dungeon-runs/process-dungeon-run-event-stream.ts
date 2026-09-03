import * as Stream from "effect/Stream";

import { compileConfiguration } from "@/services/fellowship/configurations/compile-configuration.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { createInitialDungeonRunState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";
import {
  type ProcessDungeonRunEventResult,
  processDungeonRunEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

export type ProcessDungeonRunEventStreamOptions<Error> = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly events: Stream.Stream<FellowshipEvent, Error>;
};

type ProcessDungeonRunEventStreamResult = ProcessDungeonRunEventResult & {
  readonly configuration: ReturnType<typeof compileConfiguration>;
};

export function processDungeonRunEventStream<Error>({
  configuration,
  events,
}: ProcessDungeonRunEventStreamOptions<Error>) {
  const compiledConfiguration = compileConfiguration(configuration);

  return events.pipe(
    Stream.mapAccum(createInitialDungeonRunState, (state, event) => {
      const result = processDungeonRunEvent({
        configuration: compiledConfiguration,
        event,
        state,
      });

      const streamResult = {
        ...result,
        configuration: compiledConfiguration,
      } satisfies ProcessDungeonRunEventStreamResult;

      return [result.state, [streamResult]];
    }),
  );
}
