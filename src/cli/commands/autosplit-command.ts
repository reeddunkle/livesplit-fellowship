import * as E from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { processLiveSplitLog } from "@/application/run-processing/process-live-split-log.ts";
import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";
import { generateLSSFile } from "@/services/live-split/files/lss/generate-lss-file.ts";
import { getLSSFileName } from "@/services/live-split/files/lss/get-lss-file-name.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const AutosplitCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
});

export type AutosplitCommandInput = typeof AutosplitCommandInputSchema.Type;

const prepareAutosplit = E.fn("cli.autosplit.prepare")(function* (
  input: AutosplitCommandInput,
) {
  const liveSplitClient = yield* LiveSplitClient;
  const path = yield* Path.Path;

  const configuration = yield* loadMilestoneConfiguration({
    filePath: input.configurationFilePath,
  });

  const lssFilePath = path.resolve(
    "./generated/live-split",
    getLSSFileName(configuration),
  );

  const metadata = {
    configurationFilePath: input.configurationFilePath,
    dungeon: configuration.dungeon.name,
    lssFilePath,
    milestoneCount: configuration.milestones.length,
  };

  yield* E.annotateCurrentSpan(
    "fellowship.dungeon",
    configuration.dungeon.name,
  );
  yield* E.annotateCurrentSpan(
    "fellowship.milestone-count",
    configuration.milestones.length,
  );

  yield* E.logInfo("Preparing Fellowship LiveSplit autosplitter.", metadata);

  yield* generateLSSFile({
    configuration,
    filePath: lssFilePath,
  });

  yield* liveSplitClient.reset();

  // TODO: Load LSS into LiveServer

  yield* E.logInfo("Starting Fellowship LiveSplit autosplitter.", metadata);

  return {
    configuration,
  };
});

export const runAutosplitCommand = E.fn(function* (
  input: AutosplitCommandInput,
) {
  const { configuration } = yield* prepareAutosplit(input);

  return yield* processLiveSplitLog({
    configuration,
  });
});
