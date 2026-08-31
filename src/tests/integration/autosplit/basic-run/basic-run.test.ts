import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { replayLog } from "@/application/run-processing/replay-log.ts";
import {
  appendEOL,
  LiveSplitSendCommand,
} from "@/services/live-split/core/live-split-command.ts";
import { makeLiveSplitAppMock } from "@/tests/common/layers/live-split-app-mock-layer.ts";
import { dungeonStartCommands } from "@/tests/common/live-split-test-commands.ts";
import { runTest } from "@/tests/common/run-test.ts";

import { configuration } from "./configuration.ts";

describe("LiveSplit replay", () => {
  test("sends LiveSplit commands for the configured run", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { harness, layer } = yield* makeLiveSplitAppMock();

        const logFilePath = path.join(import.meta.dirname, "log.txt");

        yield* replayLog({
          configuration,
          logFilePath,
        }).pipe(E.provide(layer));

        const commands = yield* harness.getCommands();

        const splitCommand = appendEOL(LiveSplitSendCommand.split);

        const configuredMilestoneCommands = configuration.milestones.map(() => {
          return splitCommand;
        });

        const expectedCommands = [
          ...dungeonStartCommands,
          ...configuredMilestoneCommands,
        ];

        expect(commands).toEqual(expectedCommands);

        expect(
          commands.filter((command) => {
            return command === splitCommand;
          }),
        ).toHaveLength(configuration.milestones.length);
      }),
    );

    await runTest(program);
  });
});
