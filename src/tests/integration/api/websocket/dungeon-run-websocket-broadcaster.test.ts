import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import { ROUTES } from "@/api/constants/routes.ts";
import {
  DungeonRunWebSocketBroadcaster,
  type WebSocketBroadcasterService,
} from "@/services/api/websocket-broadcaster-service.ts";
import {
  ApiServicesTest,
  makeApiServerTestLayer,
} from "@/tests/common/layers/api-server-test-layer.ts";
import { runTest } from "@/tests/common/run-test.ts";

const TEST_TIMEOUT = "1 second";

const ApiServerTest = makeApiServerTestLayer(ApiServicesTest);

function waitForWebSocketOpen(websocket: WebSocket): E.Effect<void, Error> {
  return E.callback<void, Error>((resume) => {
    const handleOpen = () => {
      resume(E.void);
    };

    const handleError = () => {
      resume(E.fail(new Error("WebSocket failed to open.")));
    };

    websocket.addEventListener("open", handleOpen, {
      once: true,
    });

    websocket.addEventListener("error", handleError, {
      once: true,
    });

    return E.sync(() => {
      websocket.removeEventListener("open", handleOpen);
      websocket.removeEventListener("error", handleError);
    });
  });
}

function createWebSocketMessagePromise(websocket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      cleanup();
      resolve(String(event.data));
    };

    const handleError = () => {
      cleanup();
      reject(new Error("WebSocket failed while receiving a message."));
    };

    const cleanup = () => {
      websocket.removeEventListener("message", handleMessage);
      websocket.removeEventListener("error", handleError);
    };

    websocket.addEventListener("message", handleMessage);
    websocket.addEventListener("error", handleError);
  });
}

function waitForWebSocketMessage(
  messagePromise: Promise<string>,
): E.Effect<string, Error> {
  return E.tryPromise({
    catch: (cause) => {
      return cause instanceof Error
        ? cause
        : new Error("Failed while waiting for WebSocket message.");
    },
    try: () => {
      return messagePromise;
    },
  });
}

function closeWebSocket(websocket: WebSocket): E.Effect<void> {
  return E.callback<void>((resume) => {
    if (websocket.readyState === WebSocket.CLOSED) {
      resume(E.void);

      return;
    }

    const handleClose = () => {
      resume(E.void);
    };

    websocket.addEventListener("close", handleClose, {
      once: true,
    });

    websocket.close();

    return E.sync(() => {
      websocket.removeEventListener("close", handleClose);
    });
  });
}

function waitForClientCount({
  clientCount,
  webSocketBroadcaster,
}: {
  readonly clientCount: number;
  readonly webSocketBroadcaster: WebSocketBroadcasterService;
}): E.Effect<void> {
  return E.gen(function* () {
    while ((yield* webSocketBroadcaster.clientCount) !== clientCount) {
      yield* E.sleep("1 millis");
    }
  });
}

describe("DungeonRunWebSocketBroadcaster integration", () => {
  test("registers, publishes to, and unregisters a dungeon run WebSocket client", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const webSocketBroadcaster = yield* DungeonRunWebSocketBroadcaster;
        const httpServer = yield* HttpServer.HttpServer;

        const address = HttpServer.formatAddress(httpServer.address);

        const websocketUrl = `${address
          .replace(/^http:/, "ws:")
          .replace("0.0.0.0", "127.0.0.1")}${ROUTES.dungeonRunEvents}`;

        const websocket = yield* E.acquireRelease(
          E.sync(() => {
            return new WebSocket(websocketUrl);
          }),
          closeWebSocket,
        );

        yield* waitForWebSocketOpen(websocket).pipe(E.timeout(TEST_TIMEOUT));

        yield* waitForClientCount({
          clientCount: 1,
          webSocketBroadcaster,
        }).pipe(E.timeout(TEST_TIMEOUT));

        expect(yield* webSocketBroadcaster.clientCount).toBe(1);

        /*
         * Register the native message listener before publishing so the
         * response cannot arrive before the listener is installed.
         */
        const messagePromise = yield* E.sync(() => {
          return createWebSocketMessagePromise(websocket);
        });

        yield* webSocketBroadcaster
          .publish("hello")
          .pipe(E.timeout(TEST_TIMEOUT));

        const message = yield* waitForWebSocketMessage(messagePromise).pipe(
          E.timeout(TEST_TIMEOUT),
        );

        expect(message).toBe("hello");

        yield* closeWebSocket(websocket).pipe(E.timeout(TEST_TIMEOUT));

        yield* waitForClientCount({
          clientCount: 0,
          webSocketBroadcaster,
        }).pipe(E.timeout(TEST_TIMEOUT));

        expect(yield* webSocketBroadcaster.clientCount).toBe(0);
      }).pipe(E.provide(ApiServerTest)),
    );

    await runTest(program);
  });
});
