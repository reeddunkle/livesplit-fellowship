import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import type * as PlatformError from "effect/PlatformError";
import * as Schema from "effect/Schema";

import {
  MilestoneConfigurationJsonError,
  UnknownFellowshipDungeonError,
} from "@/errors/milestone-configuration-file-error.ts";
import {
  FELLOWSHIP_DUNGEON,
  type FellowshipDungeon,
} from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type FellowshipMilestoneConfigurationFile,
  FellowshipMilestoneConfigurationFileSchema,
} from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { parseJson } from "@/util/parse-json.ts";

export type LoadMilestoneConfigurationOptions = {
  readonly filePath: string;
};

export type LoadMilestoneConfigurationError =
  | MilestoneConfigurationJsonError
  | PlatformError.PlatformError
  | Schema.SchemaError
  | UnknownFellowshipDungeonError;

type ResolveDungeonOptions = {
  readonly dungeonKey: string;
  readonly filePath: string;
};

type ResolveConfigurationOptions = {
  readonly configurationFile: FellowshipMilestoneConfigurationFile;
  readonly filePath: string;
};

function resolveDungeon({
  dungeonKey,
  filePath,
}: ResolveDungeonOptions): E.Effect<
  FellowshipDungeon,
  UnknownFellowshipDungeonError
> {
  if (!Object.hasOwn(FELLOWSHIP_DUNGEON, dungeonKey)) {
    return E.fail(
      new UnknownFellowshipDungeonError({
        dungeonKey,
        filePath,
      }),
    );
  }

  const resolvedDungeonKey = dungeonKey as keyof typeof FELLOWSHIP_DUNGEON;

  return E.succeed(FELLOWSHIP_DUNGEON[resolvedDungeonKey]);
}

function resolveConfiguration({
  configurationFile,
  filePath,
}: ResolveConfigurationOptions): E.Effect<
  FellowshipMilestoneConfiguration,
  UnknownFellowshipDungeonError
> {
  return E.gen(function* () {
    const dungeon = yield* resolveDungeon({
      dungeonKey: configurationFile.dungeonKey,
      filePath,
    });

    const configuration = {
      dungeon,
      milestones: configurationFile.milestones,
    };

    return configuration;
  });
}

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

  const configuration = yield* resolveConfiguration({
    configurationFile,
    filePath,
  });

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
