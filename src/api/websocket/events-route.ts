import * as E from "effect/Effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ROUTES } from "@/api/constants/routes.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";

const handleEventsRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const webSocketBroadcaster = yield* WebSocketBroadcaster;

  yield* E.logDebug("WebSocket upgrade requested.", {
    method: request.method,
    url: request.url,
  });

  yield* E.scoped(
    E.gen(function* () {
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      const writeMessage = (message: string) => {
        return writer(message);
      };

      yield* webSocketBroadcaster.registerClient(writeMessage);

      const clientCount = yield* webSocketBroadcaster.clientCount;

      yield* E.logInfo("WebSocket client connected.", {
        clientCount,
        url: request.url,
      });

      yield* socket.runRaw(
        () => {
          return E.void;
        },
        {
          onOpen: E.gen(function* () {
            yield* E.logDebug("WebSocket socket opened.", {
              url: request.url,
            });

            yield* webSocketBroadcaster.sendLatestToClient(writeMessage);
          }),
        },
      );
    }),
  ).pipe(
    E.ensuring(
      E.gen(function* () {
        const clientCount = yield* webSocketBroadcaster.clientCount;

        yield* E.logInfo("WebSocket client disconnected.", {
          clientCount,
          url: request.url,
        });
      }),
    ),
  );

  return HttpServerResponse.empty();
});

export const EventsRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", ROUTES.runEvents, handleEventsRequest),
]);
