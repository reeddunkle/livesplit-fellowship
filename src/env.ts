import "dotenv/config";

import * as Schema from "effect/Schema";

import {
  NonEmptyStringSchema,
  PositiveIntegerFromStringSchema,
} from "./validation/common-schemas.ts";

const RawEnvSchema = Schema.Struct({
  DATABASE_FILENAME: NonEmptyStringSchema,
  ELECTRON_RENDERER_HOST: NonEmptyStringSchema,
  ELECTRON_RENDERER_PORT: PositiveIntegerFromStringSchema,
  FELLOWSHIP_LOG_DIRECTORY: NonEmptyStringSchema,
  LIVE_SPLITS_HOST: NonEmptyStringSchema,
  LIVE_SPLITS_PORT: PositiveIntegerFromStringSchema,
  PUBLIC_API_HOST: NonEmptyStringSchema,
  PUBLIC_API_PORT: PositiveIntegerFromStringSchema,
});

export type Env = {
  readonly databaseFilename: string;
  readonly electronRenderer: {
    readonly host: string;
    readonly port: number;
  };
  readonly fellowshipLogDirectory: string;
  readonly liveSplits: {
    readonly host: string;
    readonly port: number;
  };
  readonly public: {
    readonly api: {
      readonly host: string;
      readonly port: number;
    };
  };
};

export function parseEnv(source: unknown): Env {
  const rawEnv = Schema.decodeUnknownSync(RawEnvSchema)(source);

  return {
    databaseFilename: rawEnv.DATABASE_FILENAME,
    electronRenderer: {
      host: rawEnv.ELECTRON_RENDERER_HOST,
      port: rawEnv.ELECTRON_RENDERER_PORT,
    },
    fellowshipLogDirectory: rawEnv.FELLOWSHIP_LOG_DIRECTORY,
    liveSplits: {
      host: rawEnv.LIVE_SPLITS_HOST,
      port: rawEnv.LIVE_SPLITS_PORT,
    },
    public: {
      api: {
        host: rawEnv.PUBLIC_API_HOST,
        port: rawEnv.PUBLIC_API_PORT,
      },
    },
  };
}

export const env = parseEnv(process.env);
