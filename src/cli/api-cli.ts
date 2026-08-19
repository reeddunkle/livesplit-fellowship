import "dotenv/config";

import * as E from "effect/Effect";
import * as Exit from "effect/Exit";

import { logCause } from "@/logging/log-cause.ts";
import { ApiRuntime } from "@/runtimes/api-runtime.ts";

import { runApiCLI } from "./api-main.ts";

const exit = await ApiRuntime.runPromiseExit(
  runApiCLI(process.argv.slice(2)).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  process.exitCode = 1;
}

await ApiRuntime.dispose();
