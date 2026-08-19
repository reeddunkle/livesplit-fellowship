import "dotenv/config";

import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { runLiveSplitCLI } from "@/cli/live-split-main.ts";
import { logCause } from "@/logging/log-cause.ts";
import { LiveSplitRuntime } from "@/runtimes/live-split-runtime.ts";

const exit = await LiveSplitRuntime.runPromiseExit(
  runLiveSplitCLI(process.argv.slice(2)).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  process.exitCode = 1;
}

await LiveSplitRuntime.dispose();
