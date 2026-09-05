import * as A from "effect/Array";
import { pipe } from "effect/Function";
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
};

type DungeonRunMilestoneProps = {
  readonly comparison: DungeonRunComparison;
  readonly milestone: DungeonRunMilestoneRow;
};

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
}: {
  readonly comparison: DungeonRunComparison;
  readonly row: DungeonRunRequirementRow;
}) {
  const observation = row.completedObservation;

  const comparisonElapsedMilliseconds =
    observation === undefined
      ? undefined
      : getObservationComparisonElapsedMilliseconds({
          comparison,
          observation,
        });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center gap-x-2 border-t px-3 py-1.5 text-xs">
      <div className="min-w-0 pl-5">
        <div className="truncate text-muted-foreground">
          {row.requirement.type}
          <span className="px-1">·</span>
          {row.requirement.targetId}
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
        segmentMilliseconds={
          observation?.elapsedFromPreviousObservationMilliseconds
        }
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

  const completedRequirementObservations = pipe(
    milestone.requirementRows,
    A.map((row) => {
      return row.completedObservation;
    }),
    A.filter(
      (observation): observation is DungeonRunObservationInterpretation => {
        return observation !== undefined;
      },
    ),
  );

  const lastCompletedRequirementObservation =
    completedRequirementObservations.at(-1);

  const segmentMilliseconds =
    lastCompletedRequirementObservation?.elapsedFromPreviousObservationMilliseconds;

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-card",
          milestone.isCompleted && "border-border",
        )}
      >
        <CollapsibleTrigger className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center gap-x-2 px-3 py-2 text-left text-sm hover:bg-muted/40">
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
            segmentMilliseconds={segmentMilliseconds}
            totalMilliseconds={milestone.elapsedMilliseconds}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {A.map(milestone.requirementRows, (row, index) => {
            return (
              <RequirementRow
                comparison={comparison}
                key={`${row.requirement.type}:${row.requirement.targetId}:${index}`}
                row={row}
              />
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
