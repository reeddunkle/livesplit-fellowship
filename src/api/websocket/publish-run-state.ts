import { type RunApiMessage } from "@/api/websocket/run-api-message-schema.ts";
import { createRunApiState } from "@/api/websocket/run-api-state.ts";
import { type WebSocketBroadcasterService } from "@/services/api/websocket-broadcaster-service.ts";
import { type RunProcessingState } from "@/services/fellowship/dungeon-runs/run-processing-state.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

type CreateRunApiMessageOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly state: RunProcessingState;
};

type PublishRunApiStateOptions = CreateRunApiMessageOptions & {
  readonly webSocketBroadcaster: WebSocketBroadcasterService;
};

function createRunApiMessage({
  configuration,
  state,
}: CreateRunApiMessageOptions): RunApiMessage {
  return {
    state: createRunApiState({
      configuration,
      state,
    }),
    version: 1,
  };
}

export function publishRunState({
  configuration,
  state,
  webSocketBroadcaster,
}: PublishRunApiStateOptions) {
  const message = createRunApiMessage({
    configuration,
    state,
  });

  return webSocketBroadcaster.publish(JSON.stringify(message));
}
