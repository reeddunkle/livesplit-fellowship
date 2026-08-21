import { type RunApiMessage } from "@/api/websocket/run-api-message-schema.ts";
import { createRunApiState } from "@/api/websocket/run-api-state.ts";
import { type PushEventServerService } from "@/services/api/push-event-server-service.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type RunProcessingState } from "@/services/fellowship/runs/run-processing-state.ts";

type PublishRunApiStateOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly pushEventServer: PushEventServerService;
  readonly state: RunProcessingState;
};

export function publishRunApiState({
  configuration,
  pushEventServer,
  state,
}: PublishRunApiStateOptions) {
  const message = {
    state: createRunApiState({
      configuration,
      state,
    }),
    version: 1,
  } satisfies RunApiMessage;

  return pushEventServer.publish(JSON.stringify(message));
}
