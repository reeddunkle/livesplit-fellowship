import * as Http from "node:http";
import { NodeHttpServer } from "@effect/platform-node";
import * as Config from "effect/Config";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

const makeNodeApiHttpServer = E.gen(function* () {
  const host = yield* Config.string("PUBLIC_API_HOST");
  const port = yield* Config.port("PUBLIC_API_PORT");

  yield* E.annotateCurrentSpan("public.api.host", host);
  yield* E.annotateCurrentSpan("public.api.port", port);

  return NodeHttpServer.layer(Http.createServer, {
    host,
    port,
  });
});

export const NodeApiHttpServerLive = Layer.unwrap(makeNodeApiHttpServer);
