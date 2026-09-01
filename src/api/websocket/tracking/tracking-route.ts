import * as E from "effect/Effect";
import * as Stream from "effect/Stream";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ROUTES } from "@/api/constants/routes.ts";
import { type TrackingApiMessage } from "@/api/websocket/tracking/tracking-api-message-schema.ts";
import { createTrackingApiStatus } from "@/application/tracking/create-tracking-api-status.ts";
import { FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";

const handleTrackingRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const fellowshipTracker = yield* FellowshipTracker;

  yield* E.logDebug("Tracking WebSocket upgrade requested.", {
    method: request.method,
    url: request.url,
  });

  yield* E.scoped(
    E.gen(function* () {
      const scope = yield* E.scope;
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      yield* socket.runRaw(
        () => {
          return E.void;
        },
        {
          onOpen: E.gen(function* () {
            yield* E.logInfo("Tracking WebSocket client connected.", {
              url: request.url,
            });

            const statusStream = fellowshipTracker.statusChanges.pipe(
              Stream.map((status): TrackingApiMessage => {
                return {
                  status: createTrackingApiStatus(status),
                  version: 1,
                };
              }),
              Stream.map((message) => {
                return JSON.stringify(message);
              }),
              Stream.runForEach((message) => {
                return writer(message);
              }),
            );

            yield* E.forkIn(statusStream, scope);
          }),
        },
      );
    }),
  ).pipe(
    E.ensuring(
      E.logInfo("Tracking WebSocket client disconnected.", {
        url: request.url,
      }),
    ),
  );

  return HttpServerResponse.empty();
});

export const TrackingRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", ROUTES.trackingEvents, handleTrackingRequest),
]);
