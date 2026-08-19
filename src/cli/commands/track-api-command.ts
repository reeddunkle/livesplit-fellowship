import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { processApiEventStream } from "@/application/run-processing/process-api-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { loadMilestoneConfiguration } from "@/services/fellowship/milestones/load-milestone-configuration.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const TrackApiCommandInputSchema = Schema.Struct({
  configurationFilePath: NonEmptyStringSchema,
});

export type TrackApiCommandInput = typeof TrackApiCommandInputSchema.Type;

export const runTrackApiCommand = E.fn("cli.api.track")(function* (
  input: TrackApiCommandInput,
) {
  const fellowship = yield* Fellowship;

  const configuration = yield* loadMilestoneConfiguration({
    filePath: input.configurationFilePath,
  });

  const metadata = {
    configurationFilePath: input.configurationFilePath,
    dungeon: configuration.dungeon.name,
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

  yield* E.logInfo("Starting Fellowship API tracker.", metadata);

  return yield* processApiEventStream({
    configuration,
    events: fellowship.liveEvents(),
  });
});
