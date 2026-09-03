import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  type CompletedDungeonRunMilestone,
  type DungeonRunLifecycleEvent,
} from "@/services/fellowship/dungeon-runs/dungeon-run-processing-result.ts";
import { type LiveSplitClientService } from "@/services/live-split/core/live-split-client-service.ts";

type HandleLiveSplitDungeonRunResultOptions = {
  readonly completedMilestones: ReadonlyArray<CompletedDungeonRunMilestone>;
  readonly lifecycleEvents: ReadonlyArray<DungeonRunLifecycleEvent>;
  readonly liveSplitClient: LiveSplitClientService;
};

function handleLifecycleEvent({
  event,
  liveSplitClient,
}: {
  readonly event: DungeonRunLifecycleEvent;
  readonly liveSplitClient: LiveSplitClientService;
}) {
  return Match.value(event).pipe(
    Match.when({ type: "RUN_STARTED" }, () => {
      return E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      });
    }),
    Match.when({ type: "RUN_COMPLETED" }, () => {
      return E.void;
    }),
    Match.when({ type: "RUN_EXITED" }, () => {
      return liveSplitClient.pause();
    }),
    Match.exhaustive,
  );
}

export function handleLiveSplitDungeonRunResult({
  completedMilestones,
  lifecycleEvents,
  liveSplitClient,
}: HandleLiveSplitDungeonRunResultOptions) {
  const handleLifecycleEvents = E.forEach(
    lifecycleEvents,
    (event) => {
      return handleLifecycleEvent({
        event,
        liveSplitClient,
      });
    },
    {
      discard: true,
    },
  );

  const handleCompletedMilestones = E.forEach(
    completedMilestones,
    () => {
      return liveSplitClient.split();
    },
    {
      discard: true,
    },
  );

  return E.all([handleLifecycleEvents, handleCompletedMilestones], {
    concurrency: "unbounded",
    discard: true,
  });
}
