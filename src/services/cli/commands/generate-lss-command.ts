import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { generateLSSFile } from "@/services/live-split/files/lss/generate-lss-file.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const GenerateLSSCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
  outputFilePath: NonEmptyStringSchema,
});

export type GenerateLSSCommandInput = typeof GenerateLSSCommandInputSchema.Type;

export const runGenerateLSSCommand = E.fn("cli.generate-lss")(function* (
  input: GenerateLSSCommandInput,
) {
  const configuration = yield* loadMilestoneConfiguration({
    filePath: input.configurationFilePath,
  });

  yield* generateLSSFile({
    configuration,
    filePath: input.outputFilePath,
  });

  yield* E.logInfo("Generated LiveSplit splits file.", {
    configurationFilePath: input.configurationFilePath,
    dungeon: configuration.dungeon.name,
    milestoneCount: configuration.milestones.length,
    outputFilePath: input.outputFilePath,
  });
});
