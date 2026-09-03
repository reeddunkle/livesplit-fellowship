import * as E from "effect/Effect";

import { type DungeonRunRequirementSatisfiedApiMessage } from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { type WebSocketBroadcasterService } from "@/services/api/websocket-broadcaster-service.ts";
import { type SatisfiedDungeonRunRequirement } from "@/services/fellowship/dungeon-runs/dungeon-run-processing-result.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/configuration-types.ts";

type PublishDungeonRunRequirementSatisfiedOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly requirement: SatisfiedDungeonRunRequirement;
  readonly webSocketBroadcaster: WebSocketBroadcasterService;
};

export const publishDungeonRunRequirementSatisfied = E.fn(
  "fellowship.dungeon-run.publish-requirement-satisfied",
)(function* ({
  configuration,
  requirement,
  webSocketBroadcaster,
}: PublishDungeonRunRequirementSatisfiedOptions) {
  yield* E.annotateCurrentSpan("fellowship.dungeonId", configuration.dungeonId);

  const message = {
    requirement,
    type: "REQUIREMENT_SATISFIED",
    version: 1,
  } satisfies DungeonRunRequirementSatisfiedApiMessage;

  yield* webSocketBroadcaster.publish(JSON.stringify(message));
});
