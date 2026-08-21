import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import type * as PlatformError from "effect/PlatformError";
import * as Schema from "effect/Schema";

import { MilestoneConfigurationJsonError } from "@/errors/milestone-configuration-file-error.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { FellowshipMilestoneConfigurationFileSchema } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { parseJson } from "@/util/parse-json.ts";

export type LoadMilestoneConfigurationOptions = {
  readonly filePath: string;
};

export type LoadMilestoneConfigurationError =
  | MilestoneConfigurationJsonError
  | PlatformError.PlatformError
  | Schema.SchemaError;

export const loadMilestoneConfiguration = E.fn(
  "fellowship.load-milestone-configuration",
)(function* ({
  filePath,
}: LoadMilestoneConfigurationOptions): E.fn.Return<
  FellowshipMilestoneConfiguration,
  LoadMilestoneConfigurationError,
  FileSystem.FileSystem
> {
  const fileSystem = yield* FileSystem.FileSystem;
  const contents = yield* fileSystem.readFileString(filePath);

  const json = yield* parseJson({
    contents,
    onError: (cause) => {
      return new MilestoneConfigurationJsonError({
        cause,
        filePath,
      });
    },
  });

  const configurationFile = yield* Schema.decodeUnknownEffect(
    FellowshipMilestoneConfigurationFileSchema,
  )(json);

  const configuration = {
    dungeon: FELLOWSHIP_DUNGEON[configurationFile.dungeonKey],
    milestones: configurationFile.milestones,
  } satisfies FellowshipMilestoneConfiguration;

  yield* E.annotateCurrentSpan(
    "fellowship.dungeon",
    configuration.dungeon.name,
  );

  yield* E.annotateCurrentSpan(
    "fellowship.milestone-count",
    configuration.milestones.length,
  );

  return configuration;
});
