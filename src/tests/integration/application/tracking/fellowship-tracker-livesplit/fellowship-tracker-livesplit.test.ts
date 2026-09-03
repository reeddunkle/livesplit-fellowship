import path from "node:path";
import * as E from "effect/Effect";
import { describe, expect, test } from "vitest";

import { FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";
import {
  appendEOL,
  LiveSplitSendCommand,
} from "@/services/live-split/core/live-split-command.ts";
import { makeAppTestHarness } from "@/tests/common/harnesses/app-test-harness.ts";
import {
  dungeonEndCommands,
  dungeonStartCommands,
} from "@/tests/common/live-split-test-commands.ts";
import { runTest } from "@/tests/common/run-test.ts";

import { configuration } from "./configuration.ts";

describe("FellowshipTracker LiveSplit", () => {
  test("sends LiveSplit commands for the configured run", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { layer, liveSplitHarness } = yield* makeAppTestHarness();

        const logFilePath = path.join(import.meta.dirname, "log.txt");

        yield* E.gen(function* () {
          const fellowshipTracker = yield* FellowshipTracker;

          yield* fellowshipTracker.replayLog({
            configuration,
            logFilePath,
          });
        }).pipe(E.provide(layer));

        const commands = yield* liveSplitHarness.getCommands();

        const splitCommand = appendEOL(LiveSplitSendCommand.split);

        const configuredMilestoneCommands = configuration.milestones.map(() => {
          return splitCommand;
        });

        const expectedCommands = [
          ...dungeonStartCommands,
          ...configuredMilestoneCommands,
          ...dungeonEndCommands,
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
