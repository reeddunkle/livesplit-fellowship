import * as E from "effect/Effect";

import { FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export type ReplayLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly logFilePath: string;
};

export const replayLog = E.fn("fellowship.replay-log")(function* ({
  configuration,
  logFilePath,
}: ReplayLogOptions) {
  const fellowshipTracker = yield* FellowshipTracker;

  yield* E.annotateCurrentSpan("fellowship.dungeonId", configuration.dungeonId);

  yield* E.annotateCurrentSpan(
    "fellowship.milestone-count",
    configuration.milestones.length,
  );

  return yield* fellowshipTracker.replayLog({
    configuration,
    logFilePath,
  });
});
