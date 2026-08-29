import * as A from "effect/Array";
import * as Match from "effect/Match";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { type ConfigurationEditorValue } from "./configuration-form-schema.ts";

type RequirementLocation = {
  readonly milestoneIndex: number;
  readonly requirementIndex: number;
};

type EncounterSuggestionData = {
  unmatchedTargetCounts: Map<string, number>;
};

type UnitDeathSuggestionData = {
  maxEventCountByTargetId: Map<string, number>;
  lastTargetId: string | undefined;
};

type RequirementSuggestionState = {
  [FELLOWSHIP_EVENT.ENCOUNTER_END]: EncounterSuggestionData;
  [FELLOWSHIP_EVENT.ENCOUNTER_START]: EncounterSuggestionData;
  [FELLOWSHIP_EVENT.UNIT_DEATH]: UnitDeathSuggestionData;
};

export type SuggestedRequirementValues = {
  readonly requiredCount?: string;
  readonly startOccurrence?: string;
  readonly targetId?: string;
};

type GetSuggestedRequirementValuesOptions = {
  readonly eventType: MilestoneRequirementEventType;
  readonly milestoneIndex: number;
  readonly requirementIndex: number;
  readonly value: ConfigurationEditorValue;
};

type IndexedRequirement = {
  readonly milestoneIndex: number;
  readonly requirementIndex: number;
  readonly requirement: ConfigurationEditorValue["milestones"][number]["requirements"][number];
};

function toPositiveInteger(value: string): number | undefined {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function getFirstUnmatchedTargetId(
  data: EncounterSuggestionData,
): string | undefined {
  for (const [targetId, count] of data.unmatchedTargetCounts) {
    if (count > 0) {
      return targetId;
    }
  }

  return undefined;
}

function createRequirementSuggestionState(
  value: ConfigurationEditorValue,
  currentRequirement: RequirementLocation,
): RequirementSuggestionState {
  const requirements = A.flatMap(
    value.milestones,
    (milestone, milestoneIndex) => {
      return A.map(milestone.requirements, (requirement, requirementIndex) => {
        return {
          milestoneIndex,
          requirement,
          requirementIndex,
        } satisfies IndexedRequirement;
      });
    },
  );

  const initialState: RequirementSuggestionState = {
    [FELLOWSHIP_EVENT.ENCOUNTER_END]: {
      unmatchedTargetCounts: new Map<string, number>(),
    },
    [FELLOWSHIP_EVENT.ENCOUNTER_START]: {
      unmatchedTargetCounts: new Map<string, number>(),
    },
    [FELLOWSHIP_EVENT.UNIT_DEATH]: {
      lastTargetId: undefined,
      maxEventCountByTargetId: new Map<string, number>(),
    },
  };

  return A.reduce(requirements, initialState, (state, indexedRequirement) => {
    const { milestoneIndex, requirement, requirementIndex } =
      indexedRequirement;

    if (
      milestoneIndex === currentRequirement.milestoneIndex &&
      requirementIndex === currentRequirement.requirementIndex
    ) {
      return state;
    }

    if (requirement.targetId === "") {
      return state;
    }

    return Match.value(requirement).pipe(
      Match.when(
        {
          type: FELLOWSHIP_EVENT.ENCOUNTER_START,
        },
        (encounterStartRequirement) => {
          const encounterStartState = state[FELLOWSHIP_EVENT.ENCOUNTER_START];
          const encounterEndState = state[FELLOWSHIP_EVENT.ENCOUNTER_END];

          const matchingEndCount =
            encounterEndState.unmatchedTargetCounts.get(
              encounterStartRequirement.targetId,
            ) ?? 0;

          if (matchingEndCount > 0) {
            encounterEndState.unmatchedTargetCounts.set(
              encounterStartRequirement.targetId,
              matchingEndCount - 1,
            );

            return state;
          }

          const currentStartCount =
            encounterStartState.unmatchedTargetCounts.get(
              encounterStartRequirement.targetId,
            ) ?? 0;

          encounterStartState.unmatchedTargetCounts.set(
            encounterStartRequirement.targetId,
            currentStartCount + 1,
          );

          return state;
        },
      ),
      Match.when(
        {
          type: FELLOWSHIP_EVENT.ENCOUNTER_END,
        },
        (encounterEndRequirement) => {
          const encounterStartState = state[FELLOWSHIP_EVENT.ENCOUNTER_START];
          const encounterEndState = state[FELLOWSHIP_EVENT.ENCOUNTER_END];

          const matchingStartCount =
            encounterStartState.unmatchedTargetCounts.get(
              encounterEndRequirement.targetId,
            ) ?? 0;

          if (matchingStartCount > 0) {
            encounterStartState.unmatchedTargetCounts.set(
              encounterEndRequirement.targetId,
              matchingStartCount - 1,
            );

            return state;
          }

          const currentEndCount =
            encounterEndState.unmatchedTargetCounts.get(
              encounterEndRequirement.targetId,
            ) ?? 0;

          encounterEndState.unmatchedTargetCounts.set(
            encounterEndRequirement.targetId,
            currentEndCount + 1,
          );

          return state;
        },
      ),
      Match.when(
        {
          type: FELLOWSHIP_EVENT.UNIT_DEATH,
        },
        (unitDeathRequirement) => {
          const startOccurrence = toPositiveInteger(
            unitDeathRequirement.startOccurrence,
          );

          const requiredCount = toPositiveInteger(
            unitDeathRequirement.requiredCount,
          );

          if (startOccurrence === undefined || requiredCount === undefined) {
            return state;
          }

          const unitDeathState = state[FELLOWSHIP_EVENT.UNIT_DEATH];

          const currentMaxEventCount =
            unitDeathState.maxEventCountByTargetId.get(
              unitDeathRequirement.targetId,
            ) ?? 0;

          const requirementMaxEventCount = startOccurrence + requiredCount;

          unitDeathState.maxEventCountByTargetId.set(
            unitDeathRequirement.targetId,
            Math.max(currentMaxEventCount, requirementMaxEventCount),
          );

          unitDeathState.lastTargetId = unitDeathRequirement.targetId;

          return state;
        },
      ),
      Match.orElse(() => state),
    );
  });
}

export function getSuggestedRequirementValues({
  eventType,
  milestoneIndex,
  requirementIndex,
  value,
}: GetSuggestedRequirementValuesOptions): SuggestedRequirementValues {
  const state = createRequirementSuggestionState(value, {
    milestoneIndex,
    requirementIndex,
  });

  return Match.value(eventType).pipe(
    Match.when(FELLOWSHIP_EVENT.ENCOUNTER_END, () => {
      const targetId = getFirstUnmatchedTargetId(
        state[FELLOWSHIP_EVENT.ENCOUNTER_START],
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
        state[FELLOWSHIP_EVENT.ENCOUNTER_END],
      );

      if (targetId === undefined) {
        return {};
      }

      return {
        targetId,
      };
    }),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, () => {
      const unitDeathState = state[FELLOWSHIP_EVENT.UNIT_DEATH];

      if (unitDeathState.lastTargetId === undefined) {
        return {
          requiredCount: "1",
          startOccurrence: "1",
        };
      }

      const maxEventCount =
        unitDeathState.maxEventCountByTargetId.get(
          unitDeathState.lastTargetId,
        ) ?? 0;

      return {
        requiredCount: "1",
        startOccurrence: String(maxEventCount + 1),
        targetId: unitDeathState.lastTargetId,
      };
    }),
    Match.orElse(() => {
      return {};
    }),
  );
}
