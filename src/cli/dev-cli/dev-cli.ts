import "dotenv/config";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Cause from "effect/Cause";
import * as E from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { logCause } from "@/logging/log-cause.ts";

import { runDevCLI } from "./run-dev-cli.ts";

const databaseFilename =
  process.env.DATABASE_FILENAME ?? "./data/livesplit-fellowship.db";

const DevCLILive = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const devCLIRuntime = ManagedRuntime.make(DevCLILive);

const exit = await devCLIRuntime.runPromiseExit(
  runDevCLI(process.argv.slice(2), databaseFilename).pipe(E.tapCause(logCause)),
);

if (Exit.isFailure(exit)) {
  console.error(Cause.pretty(exit.cause));

  process.exitCode = 1;
}

await devCLIRuntime.dispose();
