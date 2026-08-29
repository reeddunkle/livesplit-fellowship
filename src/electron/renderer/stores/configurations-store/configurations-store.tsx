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

import { createConfigurationFingerprint } from "@/application/configurations/configuration-fingerprint.ts";
import * as configurationClient from "@/electron/renderer/api/configuration-client.ts";
import { type DecodedConfigurationEditorValue } from "@/electron/renderer/components/configuration/configuration-form-schema.ts";
import { saveConfigurationApiRequest } from "@/electron/renderer/components/configuration/helpers/configuration-editor-adapter";
import { useAppStore } from "@/electron/renderer/stores/app-state-store/use-app-store.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiConfigurationList,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";

type ConfigurationOptimisticAction =
  | {
      readonly configuration: ConfigurationApiConfiguration;
      readonly type: "SAVE";
    }
  | {
      readonly fingerprint: ConfigurationFingerprint;
      readonly type: "DELETE";
    };

type SaveConfigurationActionInput = {
  readonly previousSelectedConfigurationFingerprint: ConfigurationFingerprint | null;
  readonly value: DecodedConfigurationEditorValue;
};

type DeleteConfigurationActionInput = {
  readonly configuration: ConfigurationApiConfiguration;
  readonly previousSelectedConfigurationFingerprint: ConfigurationFingerprint | null;
};

type ConfigurationSaveActionState = {
  readonly error: unknown | undefined;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

type ConfigurationDeleteActionState = {
  readonly error: unknown | undefined;
};

type ConfigurationStateContextValue = {
  readonly configurations: ConfigurationApiConfigurationList;
  readonly selectedConfiguration: ConfigurationApiConfiguration | undefined;
  readonly selectedConfigurationFingerprint: ConfigurationFingerprint | null;
};

type ConfigurationActionContextValue = {
  readonly deleteConfiguration: (fingerprint: ConfigurationFingerprint) => void;
  readonly deleteError: unknown | undefined;
  readonly error: unknown | undefined;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly newConfiguration: () => void;
  readonly save: (value: DecodedConfigurationEditorValue) => void;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
  readonly selectConfiguration: (fingerprint: ConfigurationFingerprint) => void;
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
        return configuration.fingerprint !== action.fingerprint;
      });
    }

    case "SAVE": {
      const exists = configurations.some((configuration) => {
        return configuration.fingerprint === action.configuration.fingerprint;
      });

      if (!exists) {
        return [...configurations, action.configuration];
      }

      return configurations.map((configuration) => {
        return configuration.fingerprint === action.configuration.fingerprint
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

  const {
    selectedConfigurationFingerprint,
    setSelectedConfigurationFingerprint,
  } = useAppStore();

  const [optimisticConfigurations, updateOptimisticConfigurations] =
    useOptimistic(configurations, reduceConfigurations);

  const [saveState, dispatchSave, isSaving] = useActionState(
    async (
      _previousState: ConfigurationSaveActionState,
      input: SaveConfigurationActionInput,
    ): Promise<ConfigurationSaveActionState> => {
      const request = saveConfigurationApiRequest(input.value);

      try {
        /*
         * Calculate only the configuration currently being saved. This lets
         * the UI identify its semantic configuration before the HTTP
         * transaction completes without re-hashing the persisted collection.
         */
        const candidateFingerprint = await E.runPromise(
          createConfigurationFingerprint(request.configuration),
        );

        setSelectedConfigurationFingerprint(candidateFingerprint.fingerprint);

        const savedConfiguration = await E.runPromise(
          configurationClient.saveConfiguration({
            request,
          }),
        );

        /*
         * The server-returned fingerprint is authoritative. Reconcile the
         * optimistic collection using that value rather than retaining the
         * client-calculated fingerprint as source of truth.
         */
        updateOptimisticConfigurations({
          configuration: savedConfiguration,
          type: "SAVE",
        });

        setSelectedConfigurationFingerprint(savedConfiguration.fingerprint);

        await router.invalidate({
          sync: true,
        });

        return {
          error: undefined,
          savedConfiguration,
        };
      } catch (error) {
        setSelectedConfigurationFingerprint(
          input.previousSelectedConfigurationFingerprint,
        );

        return {
          error,
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
        input.configuration.fingerprint ===
        input.previousSelectedConfigurationFingerprint;

      updateOptimisticConfigurations({
        fingerprint: input.configuration.fingerprint,
        type: "DELETE",
      });

      if (isSelected) {
        setSelectedConfigurationFingerprint(null);
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
        setSelectedConfigurationFingerprint(
          input.previousSelectedConfigurationFingerprint,
        );

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
    if (selectedConfigurationFingerprint === null) {
      return undefined;
    }

    return optimisticConfigurations.find((configuration) => {
      return configuration.fingerprint === selectedConfigurationFingerprint;
    });
  }, [optimisticConfigurations, selectedConfigurationFingerprint]);

  const actionContextValue = useMemo<ConfigurationActionContextValue>(() => {
    return {
      deleteConfiguration: (fingerprint) => {
        const configuration = optimisticConfigurations.find((candidate) => {
          return candidate.fingerprint === fingerprint;
        });

        if (configuration === undefined) {
          return;
        }

        startTransition(() => {
          dispatchDelete({
            configuration,
            previousSelectedConfigurationFingerprint:
              selectedConfigurationFingerprint,
          });
        });
      },

      deleteError: deleteState.error,
      error: saveState.error,
      isDeleting,
      isSaving,

      newConfiguration: () => {
        setSelectedConfigurationFingerprint(null);
      },

      save: (value) => {
        startTransition(() => {
          dispatchSave({
            previousSelectedConfigurationFingerprint:
              selectedConfigurationFingerprint,
            value,
          });
        });
      },

      savedConfiguration: saveState.savedConfiguration,

      selectConfiguration: (fingerprint) => {
        setSelectedConfigurationFingerprint(fingerprint);
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
    saveState.savedConfiguration,
    selectedConfigurationFingerprint,
    setSelectedConfigurationFingerprint,
  ]);

  const stateContextValue = useMemo<ConfigurationStateContextValue>(() => {
    return {
      configurations: optimisticConfigurations,
      selectedConfiguration,
      selectedConfigurationFingerprint,
    };
  }, [
    optimisticConfigurations,
    selectedConfiguration,
    selectedConfigurationFingerprint,
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

export function useConfigurationByFingerprint(
  fingerprint: ConfigurationFingerprint | null,
): ConfigurationApiConfiguration | undefined {
  const configurations = useConfigurations();

  if (fingerprint === null) {
    return undefined;
  }

  return configurations.find((configuration) => {
    return configuration.fingerprint === fingerprint;
  });
}

export function useSelectedConfiguration():
  | ConfigurationApiConfiguration
  | undefined {
  return useConfigurationState().selectedConfiguration;
}

export function useSelectedConfigurationFingerprint(): ConfigurationFingerprint | null {
  return useConfigurationState().selectedConfigurationFingerprint;
}

export type ConfigurationSaveStatus = {
  readonly error: unknown | undefined;
  readonly isSaving: boolean;
  readonly savedConfiguration: ConfigurationApiConfiguration | undefined;
};

export function useConfigurationSaveStatus(): ConfigurationSaveStatus {
  const { error, isSaving, savedConfiguration } = useConfigurationActions();

  return {
    error,
    isSaving,
    savedConfiguration,
  };
}
