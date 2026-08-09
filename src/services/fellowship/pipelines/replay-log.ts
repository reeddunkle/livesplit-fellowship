import * as E from "effect/Effect";

import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { processLiveEventStream } from "./process-live-event-stream.ts";

export type ReplayLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly logFilePath: string;
};

export function replayLog({ configuration, logFilePath }: ReplayLogOptions) {
  return E.gen(function* () {
    const fellowship = yield* Fellowship;

    return yield* processLiveEventStream({
      configuration,
      events: fellowship.streamEvents(logFilePath),
    });
  });
}
