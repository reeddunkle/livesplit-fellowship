import * as E from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { type LiveSplitConnectionError } from "@/errors/live-split-client-error.ts";
import { LiveSplitApiService } from "@/services/api/live-split/live-split-api-service.ts";

function mapLiveSplitConnectionError(
  error: LiveSplitConnectionError,
): E.Effect<never, HttpApiError.InternalServerError> {
  return E.gen(function* () {
    yield* E.logError("LiveSplit connection failed.", {
      error,
    });

    return yield* E.fail(new HttpApiError.InternalServerError());
  });
}

const LiveSplitApiHandlersInferred = HttpApiBuilder.group(
  AppHttpApi,
  "liveSplit",
  E.fn(function* (handlers) {
    const liveSplitApiService = yield* LiveSplitApiService;

    return handlers
      .handle("getLiveSplitConnection", () => {
        return liveSplitApiService.getStatus();
      })
      .handle("connectLiveSplit", () => {
        return liveSplitApiService
          .connect()
          .pipe(E.catch(mapLiveSplitConnectionError));
      })
      .handle("disconnectLiveSplit", () => {
        return liveSplitApiService.disconnect();
      });
  }),
);

export const LiveSplitApiLive: Layer.Layer<
  Layer.Success<typeof LiveSplitApiHandlersInferred>,
  Layer.Error<typeof LiveSplitApiHandlersInferred>,
  LiveSplitApiService
> = LiveSplitApiHandlersInferred;
