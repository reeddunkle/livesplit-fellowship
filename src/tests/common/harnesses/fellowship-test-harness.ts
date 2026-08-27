import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipService } from "@/services/fellowship/fellowship-service.ts";

type FellowshipLiveEvents = ReturnType<FellowshipService["liveEvents"]>;

export type MakeFellowshipTestHarnessOptions = {
  readonly liveEvents?: FellowshipLiveEvents;
};

export function makeFellowshipTestHarness({
  liveEvents = Stream.never,
}: MakeFellowshipTestHarnessOptions = {}) {
  const fellowship = {
    liveEvents: () => {
      return liveEvents;
    },

    readEvents: () => {
      return E.succeed([]);
    },

    streamEvents: () => {
      return Stream.empty;
    },
  } satisfies FellowshipService;

  return {
    fellowship,
  };
}
