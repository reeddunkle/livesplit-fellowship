import * as Match from "effect/Match";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { type ConfigurationEditorRequirementMetadata } from "./configuration-editor-metadata.ts";

export type SuggestedRequirementValues = {
  readonly requiredCount?: string;
  readonly startOccurrence?: string;
  readonly targetId?: string;
};

type GetSuggestedRequirementValuesOptions = {
  readonly eventType: MilestoneRequirementEventType;
  readonly metadata: ConfigurationEditorRequirementMetadata;
};

function getFirstUnmatchedTargetId(
  unmatchedTargetCounts: ReadonlyMap<string, number>,
): string | undefined {
  for (const [targetId, count] of unmatchedTargetCounts) {
    if (count > 0) {
      return targetId;
    }
  }

  return undefined;
}

export function getSuggestedRequirementValues({
  eventType,
  metadata,
}: GetSuggestedRequirementValuesOptions): SuggestedRequirementValues {
  return Match.value(eventType).pipe(
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_END, () => {
      const targetId = getFirstUnmatchedTargetId(
        metadata.encounterStart.unmatchedTargetCounts,
      );

      if (targetId === undefined) {
        return {};
      }

      return {
        targetId,
      };
    }),
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_START, () => {
      const targetId = getFirstUnmatchedTargetId(
        metadata.encounterEnd.unmatchedTargetCounts,
      );

      if (targetId === undefined) {
        return {};
      }

      return {
        targetId,
      };
    }),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, () => {
      const { lastTargetId, nextStartOccurrenceByTargetId } =
        metadata.unitDeath;

      if (lastTargetId === undefined) {
        return {
          requiredCount: "1",
          startOccurrence: "1",
        };
      }

      const nextStartOccurrence =
        nextStartOccurrenceByTargetId.get(lastTargetId) ?? 1;

      return {
        requiredCount: "1",
        startOccurrence: String(nextStartOccurrence),
        targetId: lastTargetId,
      };
    }),
    Match.orElse(() => {
      return {};
    }),
  );
}
