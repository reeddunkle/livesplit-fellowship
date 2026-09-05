import * as A from "effect/Array";
import * as Order from "effect/Order";
import * as Predicate from "effect/Predicate";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import {
  type DungeonRunComparison,
  formatDuration,
  formatSignedDuration,
  getObservationComparisonElapsedMilliseconds,
} from "@/electron/renderer/components/dungeon-run/dungeon-run-time.ts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/electron/renderer/components/ui/collapsible.tsx";
import { type DungeonRunObservationInterpretation } from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-provider";
import { useFellowshipDataStore } from "@/electron/renderer/stores/fellowship-data/fellowship-data-store";
import { getRequirementTargetLabel } from "@/helpers/requirement-target-label";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { cn } from "@/util/class-names";

type Milestone = ConfigurationApiConfiguration["milestones"][number];

type Requirement = Milestone["requirements"][number];

export type DungeonRunRequirementRow = {
  readonly completedObservation:
    | DungeonRunObservationInterpretation
    | undefined;
  readonly matchingObservations: ReadonlyArray<DungeonRunObservationInterpretation>;
  readonly requirement: Requirement;
};

export type DungeonRunMilestoneRow = {
  readonly comparisonElapsedMilliseconds: number | undefined;
  readonly completedAtMilliseconds: number | undefined;
  readonly elapsedMilliseconds: number | undefined;
  readonly isCompleted: boolean;
  readonly milestone: Milestone;
  readonly milestoneIndex: number;
  readonly requirementRows: ReadonlyArray<DungeonRunRequirementRow>;
  readonly segmentElapsedMilliseconds: number | undefined;
  readonly segmentStartedAtMilliseconds: number | undefined;
};

type DungeonRunMilestoneProps = {
  readonly comparison: DungeonRunComparison;
  readonly milestone: DungeonRunMilestoneRow;
};

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

const RequirementCompletionOrder = Order.mapInput(
  UndefinedLastNumberOrder,
  (row: DungeonRunRequirementRow) => {
    return row.completedObservation?.observation.timestampMilliseconds;
  },
);

function TimeColumns({
  comparisonElapsedMilliseconds,
  segmentMilliseconds,
  totalMilliseconds,
}: {
  readonly comparisonElapsedMilliseconds: number | undefined;
  readonly segmentMilliseconds: number | undefined;
  readonly totalMilliseconds: number | undefined;
}) {
  const deltaMilliseconds =
    totalMilliseconds === undefined ||
    comparisonElapsedMilliseconds === undefined
      ? undefined
      : totalMilliseconds - comparisonElapsedMilliseconds;

  return (
    <>
      <div className="text-right font-mono tabular-nums">
        {formatSignedDuration(deltaMilliseconds)}
      </div>
      <div className="text-right font-mono tabular-nums">
        {formatDuration(segmentMilliseconds)}
      </div>
      <div className="text-right font-mono tabular-nums">
        {formatDuration(totalMilliseconds)}
      </div>
    </>
  );
}

function RequirementRow({
  comparison,
  row,
  segmentElapsedMilliseconds,
}: {
  readonly comparison: DungeonRunComparison;
  readonly row: DungeonRunRequirementRow;
  readonly segmentElapsedMilliseconds: number | undefined;
}) {
  const abilities = useFellowshipDataStore((state) => state.abilities);
  const dungeons = useFellowshipDataStore((state) => state.dungeons);
  const encounters = useFellowshipDataStore((state) => state.encounters);
  const units = useFellowshipDataStore((state) => state.units);

  const observation = row.completedObservation;

  const comparisonElapsedMilliseconds =
    observation === undefined
      ? undefined
      : getObservationComparisonElapsedMilliseconds({
          comparison,
          observation,
        });

  const targetLabel = getRequirementTargetLabel({
    abilities,
    dungeons,
    encounters,
    eventType: row.requirement.type,
    targetId: row.requirement.targetId,
    units,
  });

  return (
    <div className="grid grid-cols-[minmax(2rem,1fr)_4.25rem_4.25rem_4.25rem] items-center gap-x-2 border-t px-3 py-1.5 text-xs">
      <div className="min-w-0 pl-5">
        <div className="truncate text-muted-foreground">
          {targetLabel}
          <span className="px-1">·</span>
          {row.requirement.type}
        </div>
        <div className="text-[10px] text-muted-foreground/70">
          occurrence {row.requirement.startOccurrence}
          {row.requirement.requiredCount > 1 &&
            `–${
              row.requirement.startOccurrence +
              row.requirement.requiredCount -
              1
            }`}
        </div>
      </div>
      <TimeColumns
        comparisonElapsedMilliseconds={comparisonElapsedMilliseconds}
        segmentMilliseconds={segmentElapsedMilliseconds}
        totalMilliseconds={observation?.elapsedFromStartMilliseconds}
      />
    </div>
  );
}

export function DungeonRunMilestone({
  comparison,
  milestone,
}: DungeonRunMilestoneProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedRequirementRows = A.sort(
    milestone.requirementRows,
    RequirementCompletionOrder,
  );

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-card",
          milestone.isCompleted && "border-border",
        )}
      >
        <CollapsibleTrigger className="grid w-full grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_4.25rem] items-center gap-x-2 px-3 py-2 text-left text-sm hover:bg-muted/40">
          <div className="flex min-w-0 items-center gap-1.5">
            <ChevronRightIcon
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isOpen && "rotate-90",
              )}
            />
            <span
              className={cn(
                "truncate font-medium",
                !milestone.isCompleted && "text-muted-foreground",
              )}
            >
              {milestone.milestone.label}
            </span>
          </div>
          <TimeColumns
            comparisonElapsedMilliseconds={
              milestone.comparisonElapsedMilliseconds
            }
            segmentMilliseconds={milestone.segmentElapsedMilliseconds}
            totalMilliseconds={milestone.elapsedMilliseconds}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {A.map(sortedRequirementRows, (row, index) => {
            const observationTimestamp =
              row.completedObservation?.observation.timestampMilliseconds;

            const previousRequirement = sortedRequirementRows[index - 1];

            const previousTimestamp =
              previousRequirement?.completedObservation?.observation
                .timestampMilliseconds ??
              milestone.segmentStartedAtMilliseconds;

            const segmentElapsedMilliseconds =
              Predicate.isUndefined(observationTimestamp) ||
              Predicate.isUndefined(previousTimestamp)
                ? undefined
                : observationTimestamp - previousTimestamp;

            return (
              <RequirementRow
                comparison={comparison}
                key={`${row.requirement.type}:${row.requirement.targetId}:${index}`}
                row={row}
                segmentElapsedMilliseconds={segmentElapsedMilliseconds}
              />
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
