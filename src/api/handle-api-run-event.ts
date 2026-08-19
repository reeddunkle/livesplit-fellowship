import * as Match from "effect/Match";

import { type PushEventServerService } from "@/services/api/push-event-server-service.ts";
import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";

import { RUN_API_EVENT, type RunApiMessage } from "./run-api-event.ts";

export function handleApiRunEvent({
  event,
  pushEventServer,
}: {
  readonly event: RunProcessingEvent;
  readonly pushEventServer: PushEventServerService;
}) {
  const apiEvent = Match.value(event).pipe(
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_STARTED }, ({ timestamp }) => {
      return {
        timestampMilliseconds: timestamp.epochMilliseconds,
        type: RUN_API_EVENT.RUN_STARTED,
      } as const;
    }),
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_EXITED }, ({ timestamp }) => {
      return {
        timestampMilliseconds: timestamp.epochMilliseconds,
        type: RUN_API_EVENT.RUN_EXITED,
      } as const;
    }),
    Match.when(
      { type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED },
      ({ milestone }) => {
        return {
          milestone: {
            elapsedMilliseconds: milestone.elapsedMilliseconds,
            label: milestone.label,
            milestoneId: milestone.milestoneId,
            timestampMilliseconds: milestone.timestamp.epochMilliseconds,
          },
          type: RUN_API_EVENT.MILESTONE_COMPLETED,
        } as const;
      },
    ),
    Match.exhaustive,
  );

  const message: RunApiMessage = {
    event: apiEvent,
    version: 1,
  };

  return pushEventServer.publish(JSON.stringify(message));
}
