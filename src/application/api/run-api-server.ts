import * as E from "effect/Effect";
import * as HttpServer from "effect/unstable/http/HttpServer";

import { publishLiveSplitStatusChanges } from "@/api/websocket/live-split/publish-live-split-status-changes.ts";
import { publishTrackingStatusChanges } from "@/api/websocket/tracking/publish-tracking-status-changes.ts";

const startApiServer = E.gen(function* () {
  const httpServer = yield* HttpServer.HttpServer;

  yield* E.logInfo("Fellowship API server running.", {
    address: HttpServer.formatAddress(httpServer.address),
  });

  return httpServer;
});

export const runApiServer = E.scoped(
  E.gen(function* () {
    yield* startApiServer;

    yield* publishLiveSplitStatusChanges.pipe(E.forkScoped);
    yield* publishTrackingStatusChanges.pipe(E.forkScoped);

    return yield* E.never;
  }),
);
