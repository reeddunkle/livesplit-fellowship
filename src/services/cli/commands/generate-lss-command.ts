import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const GenerateLSSCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
  outputFilePath: NonEmptyStringSchema,
});

export type GenerateLSSCommandInput = typeof GenerateLSSCommandInputSchema.Type;

export function runGenerateLSSCommand(input: GenerateLSSCommandInput) {
  return E.gen(function* () {
    const liveSplitFile = yield* LiveSplitFile;

    const configuration = yield* loadMilestoneConfiguration({
      filePath: input.configurationFilePath,
    });

    yield* liveSplitFile.writeLSSFile({
      configuration,
      filePath: input.outputFilePath,
    });

    yield* E.logInfo(`LiveSplit file written to ${input.outputFilePath}.`, {
      dungeon: configuration.dungeon.name,
      milestoneCount: configuration.milestones.length,
    });
  });
}
