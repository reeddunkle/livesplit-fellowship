import * as E from "effect/Effect";

import { type DungeonRunApiMessage } from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { createDungeonRunApiState } from "@/api/websocket/dungeon-run/dungeon-run-api-state.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { type DungeonRunProcessingState } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-state.ts";

type PublishDungeonRunStateOptions = {
  readonly state: DungeonRunProcessingState;
};

function createDungeonRunApiMessage({
  state,
}: PublishDungeonRunStateOptions): DungeonRunApiMessage {
  return {
    state: createDungeonRunApiState({
      state,
    }),
    version: 1,
  };
}

export const publishDungeonRunState = E.fn(
  "fellowship.dungeon-run.publish-state",
)(function* ({ state }: PublishDungeonRunStateOptions) {
  const webSocketBroadcaster = yield* DungeonRunWebSocketBroadcaster;

  const message = createDungeonRunApiMessage({
    state,
  });

  yield* webSocketBroadcaster.publish(JSON.stringify(message));
});
