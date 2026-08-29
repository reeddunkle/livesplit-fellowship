import { useRouter } from "@tanstack/react-router";
import * as E from "effect/Effect";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useMemo,
  useOptimistic,
} from "react";

import { saveConfiguration as saveConfigurationApi } from "@/electron/renderer/api/configuration-client.ts";
import { saveConfigurationApiRequest } from "@/electron/renderer/components/configuration/configuration-editor-adapter.ts";
import { type DecodedConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-form-schema.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiConfigurationList,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type ConfigurationOptimisticAction = {
  readonly configuration: ConfigurationApiConfiguration;
  readonly type: "SAVE";
};

type ConfigurationSaveActionState = {
  readonly error: unknown | undefined;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

type ConfigurationStateContextValue = {
  readonly configurations: ConfigurationApiConfigurationList;
};

type ConfigurationActionContextValue = {
  readonly error: unknown | undefined;
  readonly isSaving: boolean;
  readonly save: (value: DecodedConfigurationEditorValue) => void;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

type ConfigurationProviderProps = {
  readonly children: ReactNode;
  readonly configurations: ConfigurationApiConfigurationList;
};

const INITIAL_SAVE_ACTION_STATE: ConfigurationSaveActionState = {
  error: undefined,
  savedConfiguration: undefined,
};

const ConfigurationStateContext = createContext<
  ConfigurationStateContextValue | undefined
>(undefined);

const ConfigurationActionContext = createContext<
  ConfigurationActionContextValue | undefined
>(undefined);

function reduceConfigurations(
  configurations: ConfigurationApiConfigurationList,
  action: ConfigurationOptimisticAction,
): ConfigurationApiConfigurationList {
  switch (action.type) {
    case "SAVE": {
      const exists = configurations.some((configuration) => {
        return configuration.id === action.configuration.id;
      });

      if (!exists) {
        return [...configurations, action.configuration];
      }

      return configurations.map((configuration) => {
        return configuration.id === action.configuration.id
          ? action.configuration
          : configuration;
      });
    }
  }
}

export function ConfigurationProvider({
  children,
  configurations,
}: ConfigurationProviderProps) {
  const router = useRouter();

  const [optimisticConfigurations, updateOptimisticConfigurations] =
    useOptimistic(configurations, reduceConfigurations);

  const [saveState, dispatchSave, isSaving] = useActionState(
    async (
      _previousState: ConfigurationSaveActionState,
      value: DecodedConfigurationEditorValue,
    ): Promise<ConfigurationSaveActionState> => {
      const request = saveConfigurationApiRequest(value);

      try {
        const savedConfiguration = await E.runPromise(
          saveConfigurationApi({
            request,
          }),
        );

        /*
         * The server has accepted the mutation, so expose its result
         * immediately while the route loader refreshes its authoritative
         * configuration snapshot.
         */
        updateOptimisticConfigurations({
          configuration: savedConfiguration,
          type: "SAVE",
        });

        await router.invalidate({
          sync: true,
        });

        return {
          error: undefined,
          savedConfiguration,
        };
      } catch (error) {
        return {
          error,
          savedConfiguration: undefined,
        };
      }
    },
    INITIAL_SAVE_ACTION_STATE,
  );

  const actionContextValue = useMemo<ConfigurationActionContextValue>(() => {
    return {
      error: saveState.error,
      isSaving,
      save: (value) => {
        startTransition(() => {
          dispatchSave(value);
        });
      },
      savedConfiguration: saveState.savedConfiguration,
    };
  }, [dispatchSave, isSaving, saveState.error, saveState.savedConfiguration]);

  const stateContextValue = useMemo<ConfigurationStateContextValue>(() => {
    return {
      configurations: optimisticConfigurations,
    };
  }, [optimisticConfigurations]);

  return (
    <ConfigurationActionContext.Provider value={actionContextValue}>
      <ConfigurationStateContext.Provider value={stateContextValue}>
        {children}
      </ConfigurationStateContext.Provider>
    </ConfigurationActionContext.Provider>
  );
}

export function useConfigurationState(): ConfigurationStateContextValue {
  const context = useContext(ConfigurationStateContext);

  if (context === undefined) {
    throw new Error(
      "useConfigurationState must be used within a ConfigurationProvider.",
    );
  }

  return context;
}

export function useConfigurationActions(): ConfigurationActionContextValue {
  const context = useContext(ConfigurationActionContext);

  if (context === undefined) {
    throw new Error(
      "useConfigurationActions must be used within a ConfigurationProvider.",
    );
  }

  return context;
}

export function useConfigurations(): ConfigurationApiConfigurationList {
  return useConfigurationState().configurations;
}

export function useConfigurationById(
  configurationId: ConfigurationId | null,
): ConfigurationApiConfiguration | undefined {
  const configurations = useConfigurations();

  if (configurationId === null) {
    return undefined;
  }

  return configurations.find((configuration) => {
    return configuration.id === configurationId;
  });
}
