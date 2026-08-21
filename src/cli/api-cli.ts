import "dotenv/config";

import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { logCause } from "@/logging/log-cause.ts";
import { makeApiRuntime } from "@/runtimes/api-runtime.ts";

import { runApiCLI } from "./api-main.ts";

const databaseFilename =
  process.env.DATABASE_FILENAME ?? "livesplit-fellowship.db";

const apiRuntime = makeApiRuntime({
  databaseFilename,
});

const exit = await apiRuntime.runPromiseExit(
  runApiCLI(process.argv.slice(2)).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  process.exitCode = 1;
}

await apiRuntime.dispose();
