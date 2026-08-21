import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { ConfigurationsApiLive } from "@/api/http/groups/configurations-api-live.ts";
import { AppHttpApi } from "@/api/http/http-api.ts";
import { EventsRoutes } from "@/api/websocket/events-route.ts";

const HttpApiRoutes = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(ConfigurationsApiLive),
);

const ApiRoutes = Layer.mergeAll(HttpApiRoutes, EventsRoutes);

export const ApiServer = HttpRouter.serve(ApiRoutes);
