import * as Match from "effect/Match";

import { type FellowshipTrackerStatus } from "@/application/tracking/fellowship-tracker-service.ts";
import { type TrackingApiStatus } from "@/application/tracking/tracking-api-schema.ts";

export function createTrackingApiStatus(
  status: FellowshipTrackerStatus,
): TrackingApiStatus {
  return Match.value(status).pipe(
    Match.when(
      {
        _tag: "Idle",
      },
      (): TrackingApiStatus => {
        return {
          status: "Idle",
        };
      },
    ),
    Match.when(
      {
        _tag: "Tracking",
      },
      ({ dungeonId, source }): TrackingApiStatus => {
        return Match.value(source).pipe(
          Match.when(
            {
              _tag: "Persisted",
            },
            ({ configurationId }): TrackingApiStatus => {
              return {
                dungeonId,
                source: {
                  configurationId,
                  type: "Persisted",
                },
                status: "Tracking",
              };
            },
          ),
          Match.when(
            {
              _tag: "External",
            },
            (): TrackingApiStatus => {
              return {
                dungeonId,
                source: {
                  type: "External",
                },
                status: "Tracking",
              };
            },
          ),
          Match.exhaustive,
        );
      },
    ),
    Match.exhaustive,
  );
}
