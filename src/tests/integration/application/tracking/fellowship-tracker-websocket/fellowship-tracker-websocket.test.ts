import path from "node:path";
import * as E from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe, expect, test } from "vitest";

import { DungeonRunApiMessageSchema } from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";
import { makeAppTestHarness } from "@/tests/common/harnesses/app-test-harness.ts";
import { runTest } from "@/tests/common/run-test.ts";

import { configuration } from "./configuration.ts";

describe("FellowshipTracker dungeon run WebSocket messages", () => {
  test("broadcasts dungeon run state updates while processing a run", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { dungeonRunWebSocketBroadcasterHarness, layer } =
          yield* makeAppTestHarness();

        const logFilePath = path.join(import.meta.dirname, "log.txt");

        yield* E.gen(function* () {
          const fellowshipTracker = yield* FellowshipTracker;

          yield* fellowshipTracker.replayLog({
            configuration,
            logFilePath,
          });
        }).pipe(E.provide(layer));

        const messages =
          yield* dungeonRunWebSocketBroadcasterHarness.getParsedMessages();

        expect(messages.length).toBeGreaterThan(0);

        const firstMessage = messages[0];

        expect(firstMessage).toBeDefined();

        if (firstMessage === undefined) {
          return;
        }

        const decodedFirstMessage = Schema.decodeUnknownSync(
          DungeonRunApiMessageSchema,
        )(firstMessage);

        expect(decodedFirstMessage).toMatchObject({
          state: {
            dungeonRun: {
              startedAtMilliseconds: expect.any(Number),
            },
          },
          version: 1,
        });

        const finalMessage = messages.at(-1);

        expect(finalMessage).toBeDefined();

        if (finalMessage === undefined) {
          return;
        }

        const decodedFinalMessage = Schema.decodeUnknownSync(
          DungeonRunApiMessageSchema,
        )(finalMessage);

        const desecrator1 = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Desecrator 1 Killed";
          },
        );

        expect(desecrator1).toBeDefined();

        expect(desecrator1?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 1,
            targetId: "42",
            type: "UNIT_DEATH",
          }),
        ]);

        const desecrator2 = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Desecrator 2 Killed";
          },
        );

        expect(desecrator2).toBeDefined();

        expect(desecrator2?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 2,
            targetId: "42",
            type: "UNIT_DEATH",
          }),
        ]);

        const butcher2 = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Butcher 2 Killed";
          },
        );

        expect(butcher2).toBeDefined();

        expect(butcher2?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 2,
            targetId: "41",
            type: "UNIT_DEATH",
          }),
        ]);

        const shadowlord2 = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Shadowlord 2 Killed";
          },
        );

        expect(shadowlord2).toBeDefined();

        expect(shadowlord2?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 2,
            targetId: "274",
            type: "UNIT_DEATH",
          }),
        ]);

        const bossPull = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Boss Pull";
          },
        );

        expect(bossPull).toBeDefined();

        expect(bossPull?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 1,
            targetId: "30",
            type: "ENCOUNTER_START",
          }),
        ]);

        const bossKill = decodedFinalMessage.state.milestones.find(
          (milestone) => {
            return milestone.label === "Boss Kill";
          },
        );

        expect(bossKill).toBeDefined();

        expect(bossKill?.requirements).toEqual([
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                timestampMilliseconds: expect.any(Number),
              }),
            ],
            requiredCount: 1,
            startOccurrence: 1,
            targetId: "30",
            type: "ENCOUNTER_END",
          }),
        ]);
      }),
    );

    await runTest(program);
  });
});
