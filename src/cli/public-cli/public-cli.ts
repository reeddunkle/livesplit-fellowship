import "dotenv/config";

import * as Cause from "effect/Cause";
import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { runCLI } from "@/cli/public-cli/run-public-cli.ts";
import { logCause } from "@/logging/log-cause.ts";
import { makeAppRuntime } from "@/runtimes/app-runtime.ts";

const databaseFilename =
  process.env.DATABASE_FILENAME ?? "livesplit-fellowship.db";

const appRuntime = makeAppRuntime({
  databaseFilename,
});

const exit = await appRuntime.runPromiseExit(
  runCLI(process.argv.slice(2)).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  console.error(Cause.pretty(exit.cause));

  process.exitCode = 1;
}

await appRuntime.dispose();
