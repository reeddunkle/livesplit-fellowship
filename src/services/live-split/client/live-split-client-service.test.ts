import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { describe, expect, test } from "vitest";

import { makeLiveSplitClient } from "./live-split-client-service.ts";
import { appendEOL, LiveSplitRequestCommand } from "./live-split-command.ts";
import { type LiveSplitTransport } from "./node-live-split-transport.ts";

function makeTestTransport() {
  return E.gen(function* () {
    const incomingChunks = yield* Queue.unbounded<string>();
    const writtenData = yield* Queue.unbounded<string>();

    const transport: LiveSplitTransport = {
      chunks: Stream.fromQueue(incomingChunks),

      write: (data) => {
        return Queue.offer(writtenData, data).pipe(E.asVoid);
      },
    };

    return {
      incomingChunks,
      transport,
      writtenData,
    };
  });
}

describe("LiveSplitClient", () => {
  test("gets the current time", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { incomingChunks, transport, writtenData } =
          yield* makeTestTransport();

        const client = yield* makeLiveSplitClient({
          transport,
        });

        const requestFiber = yield* client.getCurrentTime().pipe(E.forkScoped);

        const command = yield* Queue.take(writtenData);

        expect(command).toBe(appendEOL(LiveSplitRequestCommand.getCurrentTime));

        yield* Queue.offer(incomingChunks, appendEOL("00:01:23"));

        const response = yield* Fiber.join(requestFiber);

        expect(response).toBe("00:01:23");
      }),
    );

    await E.runPromise(program);
  });

  test("assembles a response split across multiple chunks", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { incomingChunks, transport, writtenData } =
          yield* makeTestTransport();

        const client = yield* makeLiveSplitClient({
          transport,
        });

        const requestFiber = yield* client.getCurrentTime().pipe(E.forkScoped);

        yield* Queue.take(writtenData);

        yield* Queue.offer(incomingChunks, "00:01");
        yield* Queue.offer(incomingChunks, ":23\r");
        yield* Queue.offer(incomingChunks, "\n");

        const response = yield* Fiber.join(requestFiber);

        expect(response).toBe("00:01:23");
      }),
    );

    await E.runPromise(program);
  });

  test("handles multiple responses in one chunk", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { incomingChunks, transport, writtenData } =
          yield* makeTestTransport();

        const client = yield* makeLiveSplitClient({
          transport,
        });

        const currentTimeFiber = yield* client
          .getCurrentTime()
          .pipe(E.forkScoped);

        yield* Queue.take(writtenData);

        yield* Queue.offer(
          incomingChunks,
          `${appendEOL("00:01:23")}${appendEOL("4")}`,
        );

        const currentTime = yield* Fiber.join(currentTimeFiber);

        expect(currentTime).toBe("00:01:23");

        const splitIndex = yield* client.getSplitIndex();

        expect(splitIndex).toBe(4);
      }),
    );

    await E.runPromise(program);
  });

  test("serializes concurrent response-producing requests", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const { incomingChunks, transport, writtenData } =
          yield* makeTestTransport();

        const client = yield* makeLiveSplitClient({
          transport,
        });

        const currentTimeFiber = yield* client
          .getCurrentTime()
          .pipe(E.forkScoped);

        const splitIndexFiber = yield* client
          .getSplitIndex()
          .pipe(E.forkScoped);

        const firstCommand = yield* Queue.take(writtenData);

        expect(firstCommand).toBe(
          appendEOL(LiveSplitRequestCommand.getCurrentTime),
        );

        yield* Queue.offer(incomingChunks, appendEOL("00:01:23"));

        const secondCommand = yield* Queue.take(writtenData);

        expect(secondCommand).toBe(
          appendEOL(LiveSplitRequestCommand.getSplitIndex),
        );

        yield* Queue.offer(incomingChunks, appendEOL("4"));

        const currentTime = yield* Fiber.join(currentTimeFiber);
        const splitIndex = yield* Fiber.join(splitIndexFiber);

        expect(currentTime).toBe("00:01:23");
        expect(splitIndex).toBe(4);
      }),
    );

    await E.runPromise(program);
  });
});
