import { type RunApiMessage } from "@/api/websocket/run-api-message-schema.ts";
import { createRunApiState } from "@/api/websocket/run-api-state.ts";
import { type WebSocketBroadcasterService } from "@/services/api/websocket-broadcaster-service.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

type CreateRunApiMessageOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly state: DungeonRunProcessingState;
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

export function publishRunApiState({
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
