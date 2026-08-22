import { type RunApiState } from "@/api/websocket/run-api-message-schema.ts";

function formatMilliseconds(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(3)}s`;
}

export function renderRunState({
  element,
  state,
}: {
  readonly element: HTMLOListElement;
  readonly state: RunApiState;
}): void {
  element.replaceChildren();

  if (state.run === null) {
    const item = document.createElement("li");

    item.textContent = "No active run.";

    element.append(item);

    return;
  }

  state.milestones.forEach((milestone) => {
    const item = document.createElement("li");

    const requirementProgress = milestone.requirements
      .map((requirement) => {
        return `${requirement.type}:${requirement.targetId} ${requirement.observations.length}/${requirement.requiredCount}`;
      })
      .join(", ");

    const elapsedTime =
      milestone.elapsedMilliseconds === null
        ? "pending"
        : formatMilliseconds(milestone.elapsedMilliseconds);

    item.textContent =
      `${milestone.label}: ${elapsedTime}` +
      (requirementProgress.length > 0 ? ` (${requirementProgress})` : "");

    element.append(item);
  });
}
