import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  FellowshipTracker,
  type FellowshipTrackerServiceShape,
} from "@/application/tracking/fellowship-tracker-service.ts";

export type MakeFellowshipTrackerMockOptions =
  Partial<FellowshipTrackerServiceShape>;

function makeFellowshipTrackerMock({
  start = () => {
    return E.void;
  },
  startConfiguration = () => {
    return E.void;
  },
  status = E.succeed({
    _tag: "Idle",
  }),
  stop = () => {
    return E.void;
  },
}: MakeFellowshipTrackerMockOptions = {}) {
  return Layer.succeed(FellowshipTracker, {
    start,
    startConfiguration,
    status,
    stop,
  } satisfies FellowshipTrackerServiceShape);
}

export const FellowshipTrackerMock = makeFellowshipTrackerMock();
