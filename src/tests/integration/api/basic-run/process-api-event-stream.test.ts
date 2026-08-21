import path from "node:path";
import * as E from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe, expect, test } from "vitest";

import { RunApiMessageSchema } from "@/api/websocket/run-api-message-schema.ts";
import { processApiEventStream } from "@/application/run-processing/process-api-event-stream.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { makeApiAppMock } from "@/tests/layers/api-app-mock-layer.ts";

import { configuration } from "./configuration.ts";

describe("processApiEventStream", () => {
  test("publishes API state updates for the run", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { harness, layer } = yield* makeApiAppMock();

        yield* E.gen(function* () {
          const fellowship = yield* Fellowship;

          const logFilePath = path.join(import.meta.dirname, "log.txt");

          yield* processApiEventStream({
            configuration,
            events: fellowship.streamEvents(logFilePath),
          });
        }).pipe(E.provide(layer));

        const messages = yield* harness.getParsedMessages();

        expect(messages.length).toBeGreaterThan(0);

        const firstMessage = messages[0];

        expect(firstMessage).toBeDefined();

        if (firstMessage === undefined) {
          return;
        }

        const decodedFirstMessage =
          Schema.decodeUnknownSync(RunApiMessageSchema)(firstMessage);

        expect(decodedFirstMessage).toMatchObject({
          state: {
            run: {
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

        const decodedFinalMessage =
          Schema.decodeUnknownSync(RunApiMessageSchema)(finalMessage);

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
