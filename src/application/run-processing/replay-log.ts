import * as E from "effect/Effect";

import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { processLiveSplitEventStream } from "./process-live-split-event-stream.ts";

export type ReplayLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly logFilePath: string;
};

export const replayLog = E.fn("fellowship.replay-log")(function* ({
  configuration,
  logFilePath,
}: ReplayLogOptions) {
  const fellowship = yield* Fellowship;

  yield* E.annotateCurrentSpan(
    "fellowship.dungeon",
    configuration.dungeon.name,
  );

  yield* E.annotateCurrentSpan(
    "fellowship.milestone-count",
    configuration.milestones.length,
  );

  return yield* processLiveSplitEventStream({
    configuration,
    events: fellowship.streamEvents(logFilePath),
  });
});
