import * as E from "effect/Effect";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { LiveSplitFile } from "@/services/live-split/files/live-split-file-service.ts";

export type GenerateLSSFileOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly filePath: string;
};

export function generateLSSFile({
  configuration,
  filePath,
}: GenerateLSSFileOptions) {
  return E.gen(function* () {
    const liveSplitFile = yield* LiveSplitFile;

    yield* liveSplitFile.writeLSSFile({
      configuration,
      filePath,
    });

    return filePath;
  });
}
