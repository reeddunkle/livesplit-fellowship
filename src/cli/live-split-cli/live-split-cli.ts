import "dotenv/config";

import * as Cause from "effect/Cause";
import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { runLiveSplitCLI } from "@/cli/live-split-cli/run-live-split-cli.ts";
import { logCause } from "@/logging/log-cause.ts";
import { makeLiveSplitRuntime } from "@/runtimes/live-split-runtime.ts";

const databaseFilename =
  process.env.DATABASE_FILENAME ?? "livesplit-fellowship.db";

const liveSplitRuntime = makeLiveSplitRuntime({
  databaseFilename,
});

const exit = await liveSplitRuntime.runPromiseExit(
  runLiveSplitCLI(process.argv.slice(2)).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  console.error(Cause.pretty(exit.cause));

  process.exitCode = 1;
}

await liveSplitRuntime.dispose();
