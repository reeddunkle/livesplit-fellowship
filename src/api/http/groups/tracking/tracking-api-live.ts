import * as E from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { createTrackingApiStatus } from "@/application/tracking/create-tracking-api-status.ts";
import {
  FellowshipTracker,
  FellowshipTrackerAlreadyRunningError,
  FellowshipTrackerConfigurationNotFoundError,
  type FellowshipTrackerStartError,
} from "@/application/tracking/fellowship-tracker-service.ts";

function mapFellowshipTrackerStartError(
  error: FellowshipTrackerStartError,
): E.Effect<
  never,
  | HttpApiError.Conflict
  | HttpApiError.InternalServerError
  | HttpApiError.NotFound
> {
  if (error instanceof FellowshipTrackerAlreadyRunningError) {
    return E.fail(new HttpApiError.Conflict());
  }

  if (error instanceof FellowshipTrackerConfigurationNotFoundError) {
    return E.fail(new HttpApiError.NotFound());
  }

  return E.gen(function* () {
    yield* E.logError("Fellowship tracker failed to start.", {
      error,
    });

    return yield* E.fail(new HttpApiError.InternalServerError());
  });
}

const TrackingApiHandlersInferred = HttpApiBuilder.group(
  AppHttpApi,
  "tracking",
  E.fn(function* (handlers) {
    const fellowshipTracker = yield* FellowshipTracker;

    return handlers
      .handle("getTracking", () => {
        return fellowshipTracker.status.pipe(E.map(createTrackingApiStatus));
      })
      .handle("startTracking", ({ payload }) => {
        return E.gen(function* () {
          yield* fellowshipTracker
            .start({
              configurationId: payload.configurationId,
            })
            .pipe(E.catch(mapFellowshipTrackerStartError));

          const status = yield* fellowshipTracker.status;

          return createTrackingApiStatus(status);
        });
      })
      .handle("stopTracking", () => {
        return E.gen(function* () {
          yield* fellowshipTracker.stop();

          const status = yield* fellowshipTracker.status;

          return createTrackingApiStatus(status);
        });
      });
  }),
);

export const TrackingApiLive: Layer.Layer<
  Layer.Success<typeof TrackingApiHandlersInferred>,
  Layer.Error<typeof TrackingApiHandlersInferred>,
  FellowshipTracker
> = TrackingApiHandlersInferred;
