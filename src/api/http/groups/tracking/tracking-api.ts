import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import {
  StartTrackingApiRequestSchema,
  TrackingApiStatusSchema,
} from "./tracking-api-schema.ts";

const TRACKING_ROUTE = "/tracking" as const;

const GetTrackingEndpoint = HttpApiEndpoint.get("getTracking", TRACKING_ROUTE, {
  success: TrackingApiStatusSchema,
});

const StartTrackingEndpoint = HttpApiEndpoint.post(
  "startTracking",
  TRACKING_ROUTE,
  {
    error: [
      HttpApiError.NotFoundNoContent,
      HttpApiError.ConflictNoContent,
      HttpApiError.InternalServerErrorNoContent,
    ],
    payload: StartTrackingApiRequestSchema,
    success: TrackingApiStatusSchema,
  },
);

const StopTrackingEndpoint = HttpApiEndpoint.delete(
  "stopTracking",
  TRACKING_ROUTE,
  {
    success: TrackingApiStatusSchema,
  },
);

export const TrackingApi = HttpApiGroup.make("tracking").add(
  GetTrackingEndpoint,
  StartTrackingEndpoint,
  StopTrackingEndpoint,
);
