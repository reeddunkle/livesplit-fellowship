import { type DungeonRunApiMessage } from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { createRunApiState } from "@/api/websocket/dungeon-run/dungeon-run-api-state.ts";
import { type WebSocketBroadcasterService } from "@/services/api/websocket-broadcaster-service.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";

type CreateDungeonRunApiMessageOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly state: DungeonRunProcessingState;
};

type PublishDungeonRunStateApiOptions = CreateDungeonRunApiMessageOptions & {
  readonly webSocketBroadcaster: WebSocketBroadcasterService;
};

function createDungeonRunApiMessage({
  configuration,
  state,
}: CreateDungeonRunApiMessageOptions): DungeonRunApiMessage {
  return {
    state: createRunApiState({
      configuration,
      state,
    }),
    version: 1,
  };
}

export function publishDungeonRunState({
  configuration,
  state,
  webSocketBroadcaster,
}: PublishDungeonRunStateApiOptions) {
  const message = createDungeonRunApiMessage({
    configuration,
    state,
  });

  return webSocketBroadcaster.publish(JSON.stringify(message));
}
