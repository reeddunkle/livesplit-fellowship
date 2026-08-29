import { useRouter } from "@tanstack/react-router";
import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as Record from "effect/Record";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useMemo,
  useOptimistic,
} from "react";

import * as configurationClient from "@/electron/renderer/api/configuration-client.ts";
import { type DecodedConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-form-schema.ts";
import { saveConfigurationApiRequest } from "@/electron/renderer/components/configuration/helpers/configuration-editor-adapter.ts";
import { useAppStore } from "@/electron/renderer/stores/app-state-store/use-app-store.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiConfigurationList,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type ConfigurationOptimisticAction =
  | {
      readonly configuration: ConfigurationApiConfiguration;
      readonly type: "SAVE";
    }
  | {
      readonly id: ConfigurationId;
      readonly type: "DELETE";
    };

type SaveConfigurationActionInput = {
  readonly previousSelectedConfigurationId: ConfigurationId | null;
  readonly value: DecodedConfigurationEditorValue;
};

type DeleteConfigurationActionInput = {
  readonly configuration: ConfigurationApiConfiguration;
  readonly previousSelectedConfigurationId: ConfigurationId | null;
};

type ConfigurationSaveActionState = {
  readonly error: unknown | undefined;
  readonly revision: number;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

type ConfigurationDeleteActionState = {
  readonly error: unknown | undefined;
};

type ConfigurationStateContextValue = {
  readonly configurations: ConfigurationApiConfigurationList;
  readonly selectedConfiguration: ConfigurationApiConfiguration | undefined;
  readonly selectedConfigurationId: ConfigurationId | null;
};

type ConfigurationActionContextValue = {
  readonly deleteConfiguration: (id: ConfigurationId) => void;
  readonly deleteError: unknown | undefined;
  readonly error: unknown | undefined;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly newConfiguration: () => void;
  readonly save: (value: DecodedConfigurationEditorValue) => void;
  readonly saveRevision: number;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
  readonly selectConfiguration: (id: ConfigurationId) => void;
};

type ConfigurationProviderProps = {
  readonly children: ReactNode;
  readonly configurations: ConfigurationApiConfigurationList;
};

export type ConfigurationLevelGroup = {
  readonly configurations: ConfigurationApiConfigurationList;
  readonly dungeonLevel: ConfigurationApiConfiguration["dungeonLevel"];
};

export type ConfigurationDungeonGroup = {
  readonly dungeonId: ConfigurationApiConfiguration["dungeonId"];
  readonly levels: ReadonlyArray<ConfigurationLevelGroup>;
};

const INITIAL_SAVE_ACTION_STATE: ConfigurationSaveActionState = {
  error: undefined,
  revision: 0,
  savedConfiguration: undefined,
};

const INITIAL_DELETE_ACTION_STATE: ConfigurationDeleteActionState = {
  error: undefined,
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
    case "DELETE": {
      return configurations.filter((configuration) => {
        return configuration.id !== action.id;
      });
    }

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

function groupConfigurations(
  configurations: ConfigurationApiConfigurationList,
): ReadonlyArray<ConfigurationDungeonGroup> {
  const configurationsByDungeon = A.groupBy(
    configurations,
    (configuration) => configuration.dungeonId,
  );

  return Record.toEntries(configurationsByDungeon).map(
    ([dungeonId, dungeonConfigurations]) => {
      const configurationsByLevel = A.groupBy(
        dungeonConfigurations,
        (configuration) => String(configuration.dungeonLevel),
      );

      const levels = Record.toEntries(configurationsByLevel)
        .map(([dungeonLevel, levelConfigurations]) => {
          return {
            configurations: levelConfigurations,
            dungeonLevel: Number(dungeonLevel),
          } satisfies ConfigurationLevelGroup;
        })
        .sort((left, right) => {
          return left.dungeonLevel - right.dungeonLevel;
        });

      return {
        dungeonId,
        levels,
      } satisfies ConfigurationDungeonGroup;
    },
  );
}

export function ConfigurationProvider({
  children,
  configurations,
}: ConfigurationProviderProps) {
  const router = useRouter();

  const { selectedConfigurationId, setSelectedConfigurationId } = useAppStore();

  const [optimisticConfigurations, updateOptimisticConfigurations] =
    useOptimistic(configurations, reduceConfigurations);

  const [saveState, dispatchSave, isSaving] = useActionState(
    async (
      previousState: ConfigurationSaveActionState,
      input: SaveConfigurationActionInput,
    ): Promise<ConfigurationSaveActionState> => {
      const request = saveConfigurationApiRequest(input.value);

      try {
        const savedConfiguration = await E.runPromise(
          configurationClient.saveConfiguration({
            request,
          }),
        );

        /*
         * The API response owns persisted identity. This covers both:
         *
         * - creating a new configuration, where the client did not have an ID
         * - saving a semantic duplicate, where the server may resolve the save
         *   to an already-existing configuration ID
         */
        updateOptimisticConfigurations({
          configuration: savedConfiguration,
          type: "SAVE",
        });

        setSelectedConfigurationId(savedConfiguration.id);

        await router.invalidate({
          sync: true,
        });

        return {
          error: undefined,
          revision: previousState.revision + 1,
          savedConfiguration,
        };
      } catch (error) {
        setSelectedConfigurationId(input.previousSelectedConfigurationId);

        return {
          error,
          revision: previousState.revision,
          savedConfiguration: undefined,
        };
      }
    },
    INITIAL_SAVE_ACTION_STATE,
  );

  const [deleteState, dispatchDelete, isDeleting] = useActionState(
    async (
      _previousState: ConfigurationDeleteActionState,
      input: DeleteConfigurationActionInput,
    ): Promise<ConfigurationDeleteActionState> => {
      const isSelected =
        input.configuration.id === input.previousSelectedConfigurationId;

      updateOptimisticConfigurations({
        id: input.configuration.id,
        type: "DELETE",
      });

      if (isSelected) {
        setSelectedConfigurationId(null);
      }

      try {
        await E.runPromise(
          configurationClient.deleteConfiguration({
            id: input.configuration.id,
          }),
        );

        await router.invalidate({
          sync: true,
        });

        return {
          error: undefined,
        };
      } catch (error) {
        setSelectedConfigurationId(input.previousSelectedConfigurationId);

        await router.invalidate({
          sync: true,
        });

        return {
          error,
        };
      }
    },
    INITIAL_DELETE_ACTION_STATE,
  );

  const selectedConfiguration = useMemo(() => {
    if (selectedConfigurationId === null) {
      return undefined;
    }

    return optimisticConfigurations.find((configuration) => {
      return configuration.id === selectedConfigurationId;
    });
  }, [optimisticConfigurations, selectedConfigurationId]);

  const actionContextValue = useMemo<ConfigurationActionContextValue>(() => {
    return {
      deleteConfiguration: (id) => {
        const configuration = optimisticConfigurations.find((candidate) => {
          return candidate.id === id;
        });

        if (configuration === undefined) {
          return;
        }

        startTransition(() => {
          dispatchDelete({
            configuration,
            previousSelectedConfigurationId: selectedConfigurationId,
          });
        });
      },

      deleteError: deleteState.error,
      error: saveState.error,
      isDeleting,
      isSaving,

      newConfiguration: () => {
        setSelectedConfigurationId(null);
      },

      save: (value) => {
        startTransition(() => {
          dispatchSave({
            previousSelectedConfigurationId: selectedConfigurationId,
            value,
          });
        });
      },
      savedConfiguration: saveState.savedConfiguration,

      saveRevision: saveState.revision,

      selectConfiguration: (id) => {
        setSelectedConfigurationId(id);
      },
    };
  }, [
    deleteState.error,
    dispatchDelete,
    dispatchSave,
    isDeleting,
    isSaving,
    optimisticConfigurations,
    saveState.error,
    saveState.revision,
    saveState.savedConfiguration,
    selectedConfigurationId,
    setSelectedConfigurationId,
  ]);

  const stateContextValue = useMemo<ConfigurationStateContextValue>(() => {
    return {
      configurations: optimisticConfigurations,
      selectedConfiguration,
      selectedConfigurationId,
    };
  }, [
    optimisticConfigurations,
    selectedConfiguration,
    selectedConfigurationId,
  ]);

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

export function useConfigurationGroups(): ReadonlyArray<ConfigurationDungeonGroup> {
  const configurations = useConfigurations();

  return useMemo(() => {
    return groupConfigurations(configurations);
  }, [configurations]);
}

export function useConfigurationById(
  id: ConfigurationId | null,
): ConfigurationApiConfiguration | undefined {
  const configurations = useConfigurations();

  if (id === null) {
    return undefined;
  }

  return configurations.find((configuration) => {
    return configuration.id === id;
  });
}

export function useSelectedConfiguration():
  | ConfigurationApiConfiguration
  | undefined {
  return useConfigurationState().selectedConfiguration;
}

export function useSelectedConfigurationId(): ConfigurationId | null {
  return useConfigurationState().selectedConfigurationId;
}

export type ConfigurationSaveStatus = {
  readonly error: unknown | undefined;
  readonly isSaving: boolean;
  readonly revision: number;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

export function useConfigurationSaveStatus(): ConfigurationSaveStatus {
  const { error, isSaving, saveRevision, savedConfiguration } =
    useConfigurationActions();

  return {
    error,
    isSaving,
    revision: saveRevision,
    savedConfiguration,
  };
}
