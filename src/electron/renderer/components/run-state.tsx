import { type RunApiState } from "@/api/websocket/run-api-message-schema.ts";

type RunStateProps = {
  readonly state: RunApiState | null;
};

function formatMilliseconds(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(3)}s`;
}

function formatRequirementProgress(
  requirement: RunApiState["milestones"][number]["requirements"][number],
): string {
  return `${requirement.type}:${requirement.targetId} ${requirement.observations.length}/${requirement.requiredCount}`;
}

export function RunState({ state }: RunStateProps) {
  if (state === null || state.run === null) {
    return <p>No active run.</p>;
  }

  return (
    <ol>
      {state.milestones.map((milestone) => {
        const elapsedTime =
          milestone.elapsedMilliseconds === null
            ? "pending"
            : formatMilliseconds(milestone.elapsedMilliseconds);

        const requirementProgress = milestone.requirements
          .map(formatRequirementProgress)
          .join(", ");

        return (
          <li key={milestone.milestoneId}>
            {milestone.label}: {elapsedTime}
            {requirementProgress.length > 0 && ` (${requirementProgress})`}
          </li>
        );
      })}
    </ol>
  );
}
