import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { createLiveSplitApiResponse } from "@/services/api/live-split/create-live-split-api-response.ts";
import {
  LiveSplitApiService,
  type LiveSplitApiServiceShape,
} from "@/services/api/live-split/live-split-api-service.ts";

export type MakeLiveSplitApiServiceMockOptions =
  Partial<LiveSplitApiServiceShape>;

const DEFAULT_STATUS = createLiveSplitApiResponse({
  _tag: "Disconnected",
});

export function makeLiveSplitApiServiceMock({
  connect = () => {
    return E.succeed(DEFAULT_STATUS);
  },
  disconnect = () => {
    return E.succeed(DEFAULT_STATUS);
  },
  getStatus = () => {
    return E.succeed(DEFAULT_STATUS);
  },
}: MakeLiveSplitApiServiceMockOptions = {}) {
  return Layer.succeed(LiveSplitApiService, {
    connect,
    disconnect,
    getStatus,
  } satisfies LiveSplitApiServiceShape);
}

export const LiveSplitApiServiceMock = makeLiveSplitApiServiceMock();
