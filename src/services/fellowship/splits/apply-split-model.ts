import * as E from "effect/Effect";

import {
  type FellowshipSplitModelError,
  MilestoneOrderMismatchError,
  MissingMilestoneError,
} from "@/errors/fellowship-split-model-error.ts";
import {
  type FellowshipMilestoneConfiguration,
  type FellowshipSplitModel,
} from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type FellowshipRunMilestone,
  type FellowshipSplitResult,
} from "@/services/fellowship/types.ts";

export type ApplySplitModelOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly splitModel: FellowshipSplitModel;
};

export function applySplitModel({
  configuration,
  milestones,
  splitModel,
}: ApplySplitModelOptions): E.Effect<
  ReadonlyArray<FellowshipSplitResult>,
  FellowshipSplitModelError
> {
  const milestonesById = new Map(
    milestones.map((milestone) => {
      return [milestone.milestoneId, milestone] as const;
    }),
  );

  const definitionsById = new Map(
    configuration.milestones.map((definition) => {
      return [definition.milestoneId, definition] as const;
    }),
  );

  return E.gen(function* () {
    const results: FellowshipSplitResult[] = [];
    let previousMilestone: FellowshipRunMilestone | undefined;

    for (const milestoneId of splitModel.milestoneIds) {
      const milestone = milestonesById.get(milestoneId);

      if (milestone === undefined) {
        return yield* new MissingMilestoneError({
          milestoneId,
        });
      }

      if (
        previousMilestone !== undefined &&
        milestone.elapsedMilliseconds < previousMilestone.elapsedMilliseconds
      ) {
        return yield* new MilestoneOrderMismatchError({
          currentMilestoneId: milestone.milestoneId,
          currentTimeMilliseconds: milestone.elapsedMilliseconds,
          previousMilestoneId: previousMilestone.milestoneId,
          previousTimeMilliseconds: previousMilestone.elapsedMilliseconds,
        });
      }

      const definition = definitionsById.get(milestoneId);

      if (definition === undefined) {
        return yield* new MissingMilestoneError({
          milestoneId,
        });
      }

      const segmentMilliseconds =
        milestone.elapsedMilliseconds -
        (previousMilestone?.elapsedMilliseconds ?? 0);

      results.push({
        elapsedMilliseconds: milestone.elapsedMilliseconds,
        label: definition.label,
        milestoneId,
        segmentMilliseconds,
      });

      previousMilestone = milestone;
    }

    return results;
  });
}
