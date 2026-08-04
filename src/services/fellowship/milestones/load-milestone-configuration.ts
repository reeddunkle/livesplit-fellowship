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
import {
  type FellowshipMilestoneConfigurationFile,
  FellowshipMilestoneConfigurationFileSchema,
} from "@/services/fellowship/milestones/milestone-configuration-file-schema.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export type LoadMilestoneConfigurationOptions = {
  readonly filePath: string;
};

export type LoadMilestoneConfigurationError =
  | MilestoneConfigurationJsonError
  | PlatformError.PlatformError
  | Schema.SchemaError
  | UnknownFellowshipDungeonError;

type ParseJsonOptions = {
  readonly contents: string;
  readonly filePath: string;
};

type ResolveDungeonOptions = {
  readonly dungeonKey: string;
  readonly filePath: string;
};

type ResolveConfigurationOptions = {
  readonly configurationFile: FellowshipMilestoneConfigurationFile;
  readonly filePath: string;
};

function parseJson({
  contents,
  filePath,
}: ParseJsonOptions): E.Effect<unknown, MilestoneConfigurationJsonError> {
  return E.try({
    catch: (cause) => {
      return new MilestoneConfigurationJsonError({
        cause,
        filePath,
      });
    },
    try: () => JSON.parse(contents),
  });
}

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

    if (configurationFile.keyLevel === undefined) {
      return configuration;
    }

    return {
      ...configuration,
      keyLevel: configurationFile.keyLevel,
    };
  });
}

export function loadMilestoneConfiguration({
  filePath,
}: LoadMilestoneConfigurationOptions): E.Effect<
  FellowshipMilestoneConfiguration,
  LoadMilestoneConfigurationError,
  FileSystem.FileSystem
> {
  return E.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const contents = yield* fileSystem.readFileString(filePath);

    const json = yield* parseJson({
      contents,
      filePath,
    });

    const configurationFile = yield* Schema.decodeUnknownEffect(
      FellowshipMilestoneConfigurationFileSchema,
    )(json);

    return yield* resolveConfiguration({
      configurationFile,
      filePath,
    });
  });
}
