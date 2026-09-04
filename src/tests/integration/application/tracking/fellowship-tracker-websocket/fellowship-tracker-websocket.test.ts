import path from "node:path";
import * as A from "effect/Array";
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
              status: "ACTIVE",
            },
          },
          version: 1,
        });

        const finalMessage = A.last(messages);

        expect(finalMessage._tag).toBe("Some");

        if (finalMessage._tag === "None") {
          return;
        }

        const decodedFinalMessage = Schema.decodeUnknownSync(
          DungeonRunApiMessageSchema,
        )(finalMessage.value);

        expect(decodedFinalMessage.state.dungeonRun).toMatchObject({
          endedAtMilliseconds: expect.any(Number),
          startedAtMilliseconds: expect.any(Number),
        });

        const unitDeath42Observations =
          decodedFinalMessage.state.observations.filter((observation) => {
            return (
              observation.type === "UNIT_DEATH" && observation.targetId === "42"
            );
          });

        expect(unitDeath42Observations).toHaveLength(2);

        expect(unitDeath42Observations).toEqual([
          {
            targetId: "42",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
          {
            targetId: "42",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
        ]);

        const unitDeath41Observations =
          decodedFinalMessage.state.observations.filter((observation) => {
            return (
              observation.type === "UNIT_DEATH" && observation.targetId === "41"
            );
          });

        expect(unitDeath41Observations).toHaveLength(2);

        expect(unitDeath41Observations).toEqual([
          {
            targetId: "41",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
          {
            targetId: "41",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
        ]);

        const unitDeath274Observations =
          decodedFinalMessage.state.observations.filter((observation) => {
            return (
              observation.type === "UNIT_DEATH" &&
              observation.targetId === "274"
            );
          });

        expect(unitDeath274Observations).toHaveLength(2);

        expect(unitDeath274Observations).toEqual([
          {
            targetId: "274",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
          {
            targetId: "274",
            timestampMilliseconds: expect.any(Number),
            type: "UNIT_DEATH",
          },
        ]);

        const bossPullObservations =
          decodedFinalMessage.state.observations.filter((observation) => {
            return (
              observation.type === "ENCOUNTER_START" &&
              observation.targetId === "30"
            );
          });

        expect(bossPullObservations).toEqual([
          {
            targetId: "30",
            timestampMilliseconds: expect.any(Number),
            type: "ENCOUNTER_START",
          },
        ]);

        const bossKillObservations =
          decodedFinalMessage.state.observations.filter((observation) => {
            return (
              observation.type === "ENCOUNTER_END" &&
              observation.targetId === "30"
            );
          });

        expect(bossKillObservations).toEqual([
          {
            targetId: "30",
            timestampMilliseconds: expect.any(Number),
            type: "ENCOUNTER_END",
          },
        ]);
      }),
    );

    await runTest(program);
  });
});
