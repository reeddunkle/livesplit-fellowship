import * as E from "effect/Effect";

import { type DungeonRunApiMessage } from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { createRunApiState } from "@/api/websocket/dungeon-run/dungeon-run-api-state.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { type CompiledConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";

type PublishDungeonRunStateOptions = {
  readonly configuration: CompiledConfiguration;
  readonly state: DungeonRunProcessingState;
};

function createDungeonRunApiMessage({
  configuration,
  state,
}: PublishDungeonRunStateOptions): DungeonRunApiMessage {
  return {
    state: createRunApiState({
      configuration,
      state,
    }),
    version: 1,
  };
}

export const publishDungeonRunState = E.fn(
  "fellowship.dungeon-run.publish-state",
)(function* ({ configuration, state }: PublishDungeonRunStateOptions) {
  const webSocketBroadcaster = yield* DungeonRunWebSocketBroadcaster;

  const message = createDungeonRunApiMessage({
    configuration,
    state,
  });

  yield* webSocketBroadcaster.publish(JSON.stringify(message));
});
