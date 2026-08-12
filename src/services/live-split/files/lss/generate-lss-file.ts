import * as E from "effect/Effect";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";

export type GenerateLSSFileOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly filePath: string;
};

export const generateLSSFile = E.fn("livesplit.generate-lss-file")(function* ({
  configuration,
  filePath,
}: GenerateLSSFileOptions) {
  const liveSplitFile = yield* LiveSplitFile;

  yield* E.annotateCurrentSpan(
    "fellowship.dungeon",
    configuration.dungeon.name,
  );

  yield* E.annotateCurrentSpan(
    "fellowship.milestone-count",
    configuration.milestones.length,
  );

  yield* liveSplitFile.writeLSSFile({
    configuration,
    filePath,
  });

  return filePath;
});
