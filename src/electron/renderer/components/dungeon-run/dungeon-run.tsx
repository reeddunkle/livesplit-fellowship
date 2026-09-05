import * as A from "effect/Array";
import { pipe } from "effect/Function";
import * as Order from "effect/Order";
import * as Predicate from "effect/Predicate";
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  MenuIcon,
  SquareDashedBottomIcon,
  SquareIcon,
} from "lucide-react";
import { useMemo } from "react";

import { useDetachedWindow } from "@/electron/renderer/components/detached-window/detached-window-provider";
import { useResizeDetachedWindowAfterUpdate } from "@/electron/renderer/components/detached-window/use-resize-detached-window-after-update.tsx";
import { DungeonRunDropdownMenu } from "@/electron/renderer/components/dungeon-run/dungeon-run-dropdown-menu.tsx";
import {
  DungeonRunMilestone,
  type DungeonRunMilestoneRow,
} from "@/electron/renderer/components/dungeon-run/dungeon-run-milestone.tsx";
import {
  DungeonRunTable,
  DungeonRunTableLabelCell,
  DungeonRunTableRow,
  DungeonRunTableTimeHeaders,
} from "@/electron/renderer/components/dungeon-run/dungeon-run-table.tsx";
import { getComparisonElapsedMilliseconds } from "@/electron/renderer/components/dungeon-run/dungeon-run-time.ts";
import { DungeonRunTimer } from "@/electron/renderer/components/dungeon-run/dungeon-run-timer.tsx";
import { Button } from "@/electron/renderer/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/electron/renderer/components/ui/dropdown-menu.tsx";
import { Separator } from "@/electron/renderer/components/ui/separator";
import {
  useConfigurations,
  useSelectedConfigurationId,
} from "@/electron/renderer/stores/configurations-store/configurations-store";
import {
  type DungeonRunObservationInterpretation,
  useDungeonRunDisplayState,
  useDungeonRunInterpretationState,
  useDungeonRunServerState,
} from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-provider";
import {
  useTrackingActionState,
  useTrackingActions,
  useTrackingServerState,
} from "@/electron/renderer/stores/tracking-store/tracking-store";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { isNil } from "@/util/is-nil.ts";

const UndefinedLastNumberOrder = Order.make<number | undefined>(
  (left, right) => {
    if (left === undefined && right === undefined) {
      return 0;
    }

    if (left === undefined) {
      return 1;
    }

    if (right === undefined) {
      return -1;
    }

    return Order.Number(left, right);
  },
);

const MilestoneCompletionOrder = Order.mapInput(
  UndefinedLastNumberOrder,
  (milestone: DungeonRunMilestoneRow) => {
    return milestone.completedAtMilliseconds;
  },
);

function getConfigurationById({
  configurationId,
  configurations,
}: {
  readonly configurationId: string | null | undefined;
  readonly configurations: ReadonlyArray<ConfigurationApiConfiguration>;
}): ConfigurationApiConfiguration | undefined {
  if (configurationId === null || configurationId === undefined) {
    return undefined;
  }

  return A.findFirst(configurations, (configuration) => {
    return configuration.id === configurationId;
  }).pipe((option) => (option._tag === "Some" ? option.value : undefined));
}

export function DungeonRun() {
  const { resizeToContent } = useDetachedWindow();
  const resizeAfterUpdate = useResizeDetachedWindowAfterUpdate();
  const configurations = useConfigurations();
  const selectedConfigurationId = useSelectedConfigurationId();
  const {
    collapseAllMilestones,
    comparison,
    expandAllMilestones,
    isMilestoneExpanded,
  } = useDungeonRunDisplayState();

  const { trackingStatus } = useTrackingServerState();
  const { stop } = useTrackingActions();
  const { isPending } = useTrackingActionState();
  const { dungeonRun, history } = useDungeonRunServerState();
  const { latestObservation, observations } =
    useDungeonRunInterpretationState();

  const trackedConfigurationId =
    trackingStatus?.status === "Tracking" &&
    trackingStatus.source.type === "Persisted"
      ? trackingStatus.source.configurationId
      : undefined;

  const configurationId = trackedConfigurationId ?? selectedConfigurationId;

  const configuration = useMemo(() => {
    return getConfigurationById({
      configurationId,
      configurations,
    });
  }, [configurationId, configurations]);

  const milestoneRows = useMemo(() => {
    if (configuration === undefined) {
      return [];
    }

    return A.map(configuration.milestones, (milestone, milestoneIndex) => {
      const requirementRows = A.map(milestone.requirements, (requirement) => {
        const matchingObservations = A.filter(observations, (observation) => {
          return A.every(
            [
              observation.observation.type === requirement.type,
              observation.observation.targetId === requirement.targetId,
              observation.occurrence >= requirement.startOccurrence,
              observation.occurrence <
                requirement.startOccurrence + requirement.requiredCount,
            ],
            Boolean,
          );
        });

        const completedObservation =
          matchingObservations.length < requirement.requiredCount
            ? undefined
            : matchingObservations.at(-1);

        return {
          completedObservation,
          matchingObservations,
          requirement,
        };
      });

      const completedRequirementObservations = pipe(
        requirementRows,
        A.map((row) => {
          return row.completedObservation;
        }),
        A.filter(
          (observation): observation is DungeonRunObservationInterpretation => {
            return observation !== undefined;
          },
        ),
      );

      const isCompleted =
        requirementRows.length > 0 &&
        completedRequirementObservations.length === requirementRows.length;

      const completedAtMilliseconds = isCompleted
        ? Math.max(
            ...A.map(completedRequirementObservations, (observation) => {
              return observation.observation.timestampMilliseconds;
            }),
          )
        : undefined;

      const startedAtMilliseconds = dungeonRun?.startedAtMilliseconds;

      const elapsedMilliseconds =
        Predicate.isUndefined(completedAtMilliseconds) ||
        isNil(startedAtMilliseconds)
          ? undefined
          : completedAtMilliseconds - startedAtMilliseconds;

      const comparisonElapsedMilliseconds = getComparisonElapsedMilliseconds({
        comparison,
        requirements: requirementRows,
      });

      return {
        comparisonElapsedMilliseconds,
        completedAtMilliseconds,
        elapsedMilliseconds,
        isCompleted,
        milestone,
        milestoneIndex,
        requirementRows,
        segmentElapsedMilliseconds: undefined,
        segmentStartedAtMilliseconds: undefined,
      };
    });
  }, [
    comparison,
    configuration,
    dungeonRun?.startedAtMilliseconds,
    observations,
  ]);

  const sortedMilestones = useMemo(() => {
    const sorted = A.sort(milestoneRows, MilestoneCompletionOrder);
    const startedAtMilliseconds = dungeonRun?.startedAtMilliseconds;

    return A.map(sorted, (milestone, index) => {
      if (
        Predicate.isUndefined(milestone.completedAtMilliseconds) ||
        isNil(startedAtMilliseconds)
      ) {
        return milestone;
      }

      const previousMilestone = sorted[index - 1];

      const segmentStartedAtMilliseconds =
        previousMilestone?.completedAtMilliseconds ?? startedAtMilliseconds;

      return {
        ...milestone,
        segmentElapsedMilliseconds:
          milestone.completedAtMilliseconds - segmentStartedAtMilliseconds,
        segmentStartedAtMilliseconds,
      };
    });
  }, [dungeonRun?.startedAtMilliseconds, milestoneRows]);

  const areAllMilestonesExpanded =
    sortedMilestones.length > 0 &&
    A.every(sortedMilestones, (milestone) => {
      return isMilestoneExpanded(String(milestone.milestoneIndex));
    });

  if (configuration === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Select a configuration to view dungeon run data.
      </div>
    );
  }

  const isTracking = trackingStatus?.status === "Tracking";

  const hasMatchingHistory = history?.configurationId === configuration.id;

  const isTimerRunning = dungeonRun?.status === "ACTIVE";

  const timerStartTimeMilliseconds = isNil(dungeonRun?.startedAtMilliseconds)
    ? undefined
    : latestObservation === undefined
      ? isTimerRunning
        ? 0
        : undefined
      : latestObservation.observation.timestampMilliseconds -
        dungeonRun.startedAtMilliseconds;

  return (
    <section className="grid min-w-105 w-fit gap-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={() => {
            resizeAfterUpdate(
              areAllMilestonesExpanded
                ? collapseAllMilestones
                : expandAllMilestones,
            );
          }}
          size="icon"
          title={
            areAllMilestonesExpanded
              ? "Collapse all milestones"
              : "Expand all milestones"
          }
          variant="outline"
        >
          {areAllMilestonesExpanded ? (
            <ChevronsDownUpIcon />
          ) : (
            <ChevronsUpDownIcon />
          )}
        </Button>
        <Button onClick={resizeToContent} size="icon" variant="outline">
          <SquareDashedBottomIcon />
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="outline">
                <MenuIcon />
              </Button>
            }
          />
          <DungeonRunDropdownMenu />
        </DropdownMenu>
      </div>
      <header className="grid w-full gap-1">
        <h2 className="truncate text-sm font-semibold">
          {configuration.label}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isTracking
            ? "Live run"
            : hasMatchingHistory
              ? "Historical comparison"
              : "No historical data loaded"}
        </p>
      </header>
      <DungeonRunTable>
        <DungeonRunTableRow className="px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <DungeonRunTableLabelCell>Milestone</DungeonRunTableLabelCell>
          <DungeonRunTableTimeHeaders />
        </DungeonRunTableRow>
        <div className="grid gap-1">
          {A.map(sortedMilestones, (milestone) => {
            return (
              <DungeonRunMilestone
                comparison={comparison}
                key={`${configuration.id}:${milestone.milestoneIndex}`}
                milestone={milestone}
              />
            );
          })}
        </div>
      </DungeonRunTable>
      <Separator />
      <DungeonRunTimer
        className="justify-self-end text-end"
        initialElapsedMilliseconds={timerStartTimeMilliseconds}
        isRunning={isTimerRunning}
      />
      <Button
        className="min-w-32"
        disabled={!isTracking || isPending}
        onClick={stop}
        size="xl"
        type="button"
        variant="destructive"
      >
        <SquareIcon className="fill-current" />
        Stop
      </Button>
    </section>
  );
}
