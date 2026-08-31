import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { LiveSplitApiStatusSchema } from "@/services/api/live-split/live-split-api-schema.ts";

const LIVE_SPLIT_ROUTE = "/live-split" as const;
const LIVE_SPLIT_CONNECTION_ROUTE = `${LIVE_SPLIT_ROUTE}/connect` as const;

const GetLiveSplitEndpoint = HttpApiEndpoint.get(
  "getLiveSplit",
  LIVE_SPLIT_CONNECTION_ROUTE,
  {
    success: LiveSplitApiStatusSchema,
  },
);

const ConnectLiveSplitEndpoint = HttpApiEndpoint.post(
  "connectLiveSplit",
  LIVE_SPLIT_CONNECTION_ROUTE,
  {
    error: HttpApiError.InternalServerErrorNoContent,
    success: LiveSplitApiStatusSchema,
  },
);

const DisconnectLiveSplitEndpoint = HttpApiEndpoint.delete(
  "disconnectLiveSplit",
  LIVE_SPLIT_CONNECTION_ROUTE,
  {
    success: LiveSplitApiStatusSchema,
  },
);

export const LiveSplitApi = HttpApiGroup.make("liveSplit").add(
  GetLiveSplitEndpoint,
  ConnectLiveSplitEndpoint,
  DisconnectLiveSplitEndpoint,
);
