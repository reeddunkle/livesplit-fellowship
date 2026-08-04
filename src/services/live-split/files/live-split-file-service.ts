import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import type * as PlatformError from "effect/PlatformError";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { createLSSFromConfiguration } from "./lss/create-lss-from-configuration.ts";

export type CreateLSSOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export type WriteLSSFileOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly filePath: string;
};

export interface LiveSplitFileService {
  readonly createLSS: (options: CreateLSSOptions) => string;

  readonly writeLSSFile: (
    options: WriteLSSFileOptions,
  ) => E.Effect<
    void,
    PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path
  >;
}

export class LiveSplitFile extends Context.Service<
  LiveSplitFile,
  LiveSplitFileService
>()("app/LiveSplitFile") {}

function makeLiveSplitFile(): LiveSplitFileService {
  const createLSS = ({ configuration }: CreateLSSOptions): string => {
    return createLSSFromConfiguration({
      configuration,
    });
  };

  const writeLSSFile = ({ configuration, filePath }: WriteLSSFileOptions) => {
    return E.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const contents = createLSS({
        configuration,
      });

      yield* fileSystem.makeDirectory(path.dirname(filePath), {
        recursive: true,
      });

      yield* fileSystem.writeFileString(filePath, contents);
    });
  };

  return {
    createLSS,
    writeLSSFile,
  };
}

export const LiveSplitFileLive = Layer.succeed(
  LiveSplitFile,
  makeLiveSplitFile(),
);
