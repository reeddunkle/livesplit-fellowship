import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { processLiveSplitLog } from "@/services/fellowship/pipelines/process-live-split-log.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const AutosplitCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
});

export type AutosplitCommandInput = typeof AutosplitCommandInputSchema.Type;

export function runAutosplitCommand(input: AutosplitCommandInput) {
  return E.gen(function* () {
    const configuration = yield* loadMilestoneConfiguration({
      filePath: input.configurationFilePath,
    });

    const metadata = {
      configurationFilePath: input.configurationFilePath,
      dungeon: configuration.dungeon.name,
      milestoneCount: configuration.milestones.length,
    };

    yield* E.logInfo(
      "Starting Fellowship LiveSplit autosplitter.",
      configuration.keyLevel === undefined
        ? metadata
        : {
            ...metadata,
            keyLevel: configuration.keyLevel,
          },
    );

    return yield* processLiveSplitLog({
      configuration,
    });
  });
}
