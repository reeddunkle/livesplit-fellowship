import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { processLiveLog } from "@/services/fellowship/pipelines/process-live-log.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const LiveLogCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
});

export type LiveLogCommandInput = typeof LiveLogCommandInputSchema.Type;

export function runLiveLogCommand(input: LiveLogCommandInput) {
  return E.gen(function* () {
    const configuration = yield* loadMilestoneConfiguration({
      filePath: input.configurationFilePath,
    });

    const logMetadata = {
      configurationFilePath: input.configurationFilePath,
      dungeon: configuration.dungeon.name,
      milestoneCount: configuration.milestones.length,
    };

    yield* E.logInfo(
      "Monitoring Fellowship log.",
      configuration.keyLevel === undefined
        ? logMetadata
        : {
            ...logMetadata,
            keyLevel: configuration.keyLevel,
          },
    );

    return yield* processLiveLog({
      configuration,
    });
  });
}
