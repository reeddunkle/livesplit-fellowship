import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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

type ConfigurationEditorContextValue = {
  readonly focusedRequirement: FocusedRequirement | undefined;

  readonly getRequirementMetadata: (
    options?: CreateRequirementMetadataOptions,
  ) => ConfigurationEditorRequirementMetadata;

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

  const contextValue = useMemo<ConfigurationEditorContextValue>(() => {
    return {
      focusedRequirement,
      getRequirementMetadata,
      requirementMetadata,
      setFocusedRequirement,
      value,
    };
  }, [focusedRequirement, getRequirementMetadata, requirementMetadata, value]);

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
