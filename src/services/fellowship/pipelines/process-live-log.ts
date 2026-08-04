import * as E from "effect/Effect";

import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { processLiveEventStream } from "./process-live-event-stream.ts";

export type ProcessLiveLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export function processLiveLog({ configuration }: ProcessLiveLogOptions) {
  return E.gen(function* () {
    const fellowship = yield* Fellowship;

    return yield* processLiveEventStream({
      configuration,
      events: fellowship.liveEvents(),
    });
  });
}
