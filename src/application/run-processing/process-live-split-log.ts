import * as E from "effect/Effect";

import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { processLiveSplitEventStream } from "./process-live-split-event-stream.ts";

export type ProcessLiveSplitLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export function processLiveSplitLog({
  configuration,
}: ProcessLiveSplitLogOptions) {
  return E.gen(function* () {
    const fellowship = yield* Fellowship;

    return yield* processLiveSplitEventStream({
      configuration,
      events: fellowship.liveEvents(),
    });
  });
}
