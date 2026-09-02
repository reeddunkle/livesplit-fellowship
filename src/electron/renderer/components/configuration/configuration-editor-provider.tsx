import * as A from "effect/Array";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

import { type ConfigurationFormApi } from "./configuration-form.ts";
import { type ConfigurationEditorValue } from "./configuration-form-schema.ts";
import {
  type ConfigurationEditorRequirementMetadata,
  type CreateRequirementMetadataOptions,
  createRequirementMetadata,
  type RequirementLocation,
} from "./helpers/configuration-editor-metadata.ts";

type ConfigurationEditorRequirement =
  ConfigurationEditorValue["milestones"][number]["requirements"][number];

export type FocusedRequirement = {
  readonly location: RequirementLocation;
  readonly requirement: ConfigurationEditorRequirement;
};

export type FocusedRequirementMetadata = {
  readonly eventType: MilestoneRequirementEventType;
  readonly targetId: string;
};

export type EncounterSuggestion = {
  readonly targetId: string;
  readonly unmatchedCount: number;
};

export type UnitDeathSuggestion = {
  readonly requiredCount: string;
  readonly startOccurrence: string;
};

export type RequirementValuesForEventType = {
  readonly requiredCount: string;
  readonly startOccurrence: string;
  readonly targetId: string;
};

type GetEncounterSuggestionsOptions = {
  readonly eventType:
    | typeof FELLOWSHIP_EVENT.ENCOUNTER_START
    | typeof FELLOWSHIP_EVENT.ENCOUNTER_END;
  readonly location: RequirementLocation;
};

type GetUnitDeathSuggestionOptions = {
  readonly location: RequirementLocation;
  readonly targetId: string;
};

type GetRequirementValuesForEventTypeOptions = {
  readonly eventType: MilestoneRequirementEventType;
  readonly location: RequirementLocation;
};

type ConfigurationEditorContextValue = {
  readonly focusedRequirement: FocusedRequirement | undefined;
  readonly focusedRequirementMetadata: FocusedRequirementMetadata | undefined;

  readonly getEncounterSuggestions: (
    options: GetEncounterSuggestionsOptions,
  ) => ReadonlyArray<EncounterSuggestion>;

  readonly getRequirementMetadata: (
    options?: CreateRequirementMetadataOptions,
  ) => ConfigurationEditorRequirementMetadata;

  readonly getRequirementValuesForEventType: (
    options: GetRequirementValuesForEventTypeOptions,
  ) => RequirementValuesForEventType;

  readonly getUnitDeathSuggestion: (
    options: GetUnitDeathSuggestionOptions,
  ) => UnitDeathSuggestion;

  readonly requirementMetadata: ConfigurationEditorRequirementMetadata;

  readonly setFocusedRequirement: (
    location: RequirementLocation | undefined,
  ) => void;

  readonly value: ConfigurationEditorValue;
};

type ConfigurationEditorProviderProps = {
  readonly children: ReactNode;
  readonly form: ConfigurationFormApi;
};

type ConfigurationEditorProviderInnerProps = {
  readonly children: ReactNode;
  readonly value: ConfigurationEditorValue;
};

const ConfigurationEditorContext = createContext<
  ConfigurationEditorContextValue | undefined
>(undefined);

function getRequirementAtLocation(
  value: ConfigurationEditorValue,
  location: RequirementLocation | undefined,
): ConfigurationEditorRequirement | undefined {
  if (location === undefined) {
    return undefined;
  }

  return value.milestones[location.milestoneIndex]?.requirements[
    location.requirementIndex
  ];
}

function ConfigurationEditorProviderInner({
  children,
  value,
}: ConfigurationEditorProviderInnerProps) {
  const [focusedRequirementLocation, setFocusedRequirement] = useState<
    RequirementLocation | undefined
  >(undefined);

  const requirementMetadata = useMemo(() => {
    return createRequirementMetadata(value);
  }, [value]);

  const getRequirementMetadata = useCallback(
    (
      options?: CreateRequirementMetadataOptions,
    ): ConfigurationEditorRequirementMetadata => {
      return createRequirementMetadata(value, options);
    },
    [value],
  );

  const getEncounterSuggestions = useCallback(
    ({
      eventType,
      location,
    }: GetEncounterSuggestionsOptions): ReadonlyArray<EncounterSuggestion> => {
      const metadata = createRequirementMetadata(value, {
        excluding: location,
      });

      const unmatchedTargetCounts =
        eventType === FELLOWSHIP_EVENT.ENCOUNTER_START
          ? metadata.encounterEnd.unmatchedTargetCounts
          : metadata.encounterStart.unmatchedTargetCounts;

      return Array.from(unmatchedTargetCounts)
        .filter(([, count]) => {
          return count > 0;
        })
        .map(([targetId, unmatchedCount]) => {
          return {
            targetId,
            unmatchedCount,
          };
        });
    },
    [value],
  );

  const getUnitDeathSuggestion = useCallback(
    ({
      location,
      targetId,
    }: GetUnitDeathSuggestionOptions): UnitDeathSuggestion => {
      const metadata = createRequirementMetadata(value, {
        excluding: location,
      });

      const nextStartOccurrence =
        metadata.unitDeath.nextStartOccurrenceByTargetId.get(targetId) ?? 1;

      return {
        requiredCount: "1",
        startOccurrence: String(nextStartOccurrence),
      };
    },
    [value],
  );

  const getRequirementValuesForEventType = useCallback(
    ({
      eventType,
      location,
    }: GetRequirementValuesForEventTypeOptions): RequirementValuesForEventType => {
      return Match.value(eventType).pipe(
        Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, () => {
          const metadata = createRequirementMetadata(value, {
            excluding: location,
          });

          const targetId = metadata.unitDeath.lastTargetId;

          if (targetId === undefined) {
            return {
              requiredCount: "1",
              startOccurrence: "1",
              targetId: "",
            };
          }

          const nextStartOccurrence =
            metadata.unitDeath.nextStartOccurrenceByTargetId.get(targetId) ?? 1;

          return {
            requiredCount: "1",
            startOccurrence: String(nextStartOccurrence),
            targetId,
          };
        }),
        Match.whenOr(
          FELLOWSHIP_EVENT.ENCOUNTER_START,
          FELLOWSHIP_EVENT.ENCOUNTER_END,
          (matchedEventType) => {
            const suggestions = getEncounterSuggestions({
              eventType: matchedEventType,
              location,
            });

            const targetId = A.head(suggestions).pipe(
              Option.match({
                onNone: () => "",
                onSome: (suggestion) => suggestion.targetId,
              }),
            );

            return {
              requiredCount: "1",
              startOccurrence: "1",
              targetId,
            };
          },
        ),
        Match.orElse(() => {
          return {
            requiredCount: "1",
            startOccurrence: "1",
            targetId: "",
          };
        }),
      );
    },
    [getEncounterSuggestions, value],
  );

  const focusedRequirement = useMemo<FocusedRequirement | undefined>(() => {
    if (focusedRequirementLocation === undefined) {
      return undefined;
    }

    const requirement = getRequirementAtLocation(
      value,
      focusedRequirementLocation,
    );

    if (requirement === undefined) {
      return undefined;
    }

    return {
      location: focusedRequirementLocation,
      requirement,
    };
  }, [focusedRequirementLocation, value]);

  const focusedRequirementMetadata = useMemo<
    FocusedRequirementMetadata | undefined
  >(() => {
    if (focusedRequirement === undefined) {
      return undefined;
    }

    return {
      eventType: focusedRequirement.requirement.type,
      targetId: focusedRequirement.requirement.targetId,
    };
  }, [focusedRequirement]);

  const contextValue = useMemo<ConfigurationEditorContextValue>(() => {
    return {
      focusedRequirement,
      focusedRequirementMetadata,
      getEncounterSuggestions,
      getRequirementMetadata,
      getRequirementValuesForEventType,
      getUnitDeathSuggestion,
      requirementMetadata,
      setFocusedRequirement,
      value,
    };
  }, [
    focusedRequirement,
    focusedRequirementMetadata,
    getEncounterSuggestions,
    getRequirementMetadata,
    getRequirementValuesForEventType,
    getUnitDeathSuggestion,
    requirementMetadata,
    value,
  ]);

  return (
    <ConfigurationEditorContext.Provider value={contextValue}>
      {children}
    </ConfigurationEditorContext.Provider>
  );
}

export function ConfigurationEditorProvider({
  children,
  form,
}: ConfigurationEditorProviderProps) {
  return (
    <form.Subscribe
      selector={(state) => {
        return state.values;
      }}
    >
      {(value) => {
        return (
          <ConfigurationEditorProviderInner value={value}>
            {children}
          </ConfigurationEditorProviderInner>
        );
      }}
    </form.Subscribe>
  );
}

export function useConfigurationEditor(): ConfigurationEditorContextValue {
  const context = useContext(ConfigurationEditorContext);

  if (context === undefined) {
    throw new Error(
      "useConfigurationEditor must be used within a ConfigurationEditorProvider.",
    );
  }

  return context;
}
