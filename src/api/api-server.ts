import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { ROUTES } from "@/api/constants/routes.ts";
import { ConfigurationsApiLive } from "@/api/http/groups/configurations-api-live.ts";
import { AppHttpApi } from "@/api/http/http-api.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";

const handleEventsRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const pushEventServer = yield* PushEventServer;

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

      yield* pushEventServer.registerClient(writeMessage);

      const clientCount = yield* pushEventServer.clientCount;

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

            yield* pushEventServer.sendLatestToClient(writeMessage).pipe(
              E.catch((error) => {
                return E.logWarning(
                  "Failed to send latest API state to client.",
                  {
                    error,
                    url: request.url,
                  },
                );
              }),
            );
          }),
        },
      );
    }),
  ).pipe(
    E.ensuring(
      E.gen(function* () {
        const clientCount = yield* pushEventServer.clientCount;

        yield* E.logInfo("WebSocket client disconnected.", {
          clientCount,
          url: request.url,
        });
      }),
    ),
  );

  return HttpServerResponse.empty();
});

const HttpApiRoutes = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(ConfigurationsApiLive),
);

const EventsRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", ROUTES.events, handleEventsRequest),
]);

const ApiRoutes = Layer.mergeAll(HttpApiRoutes, EventsRoutes);

export const ApiServer = HttpRouter.serve(ApiRoutes);
