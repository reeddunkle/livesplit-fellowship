import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { replayLog } from "@/application/run-processing/replay-log.ts";
import {
  appendEOL,
  LiveSplitSendCommand,
} from "@/services/live-split/client/live-split-command.ts";
import { dungeonStartCommands } from "@/tests/common/live-split-test-commands.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { makeLiveSplitAppMock } from "@/tests/layers/live-split-app-mock-layer.ts";

import { configuration } from "./configuration.ts";

describe("replayLog", () => {
  test("sends LiveSplit commands for completed milestones", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { harness, layer } = yield* makeLiveSplitAppMock();

        const logFilePath = path.join(import.meta.dirname, "log.txt");

        yield* replayLog({
          configuration,
          logFilePath,
        }).pipe(E.provide(layer));

        const commands = yield* harness.getCommands();

        const configuredMilestoneCommands = configuration.milestones.map(() => {
          return appendEOL(LiveSplitSendCommand.split);
        });

        expect(commands).toEqual([
          ...dungeonStartCommands,
          ...configuredMilestoneCommands,
        ]);
      }),
    );

    await runTest(program);
  });
});
