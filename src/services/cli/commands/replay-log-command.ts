import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { replayLog } from "@/services/fellowship/pipelines/replay-log.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const ReplayLogCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
  logFilePath: NonEmptyStringSchema,
});

export type ReplayLogCommandInput = typeof ReplayLogCommandInputSchema.Type;

export const runReplayLogCommand = E.fn("cli.replay-log")(function* (
  input: ReplayLogCommandInput,
) {
  const configuration = yield* loadMilestoneConfiguration({
    filePath: input.configurationFilePath,
  });

  yield* E.logInfo("Replaying Fellowship log.", {
    configurationFilePath: input.configurationFilePath,
    dungeon: configuration.dungeon.name,
    logFilePath: input.logFilePath,
    milestoneCount: configuration.milestones.length,
  });

  yield* replayLog({
    configuration,
    logFilePath: input.logFilePath,
  });

  yield* E.logInfo("Fellowship log replay completed.", {
    logFilePath: input.logFilePath,
  });
});
