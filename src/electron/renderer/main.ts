import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type RunApiState } from "@/api/validation/run-api-message-schema.ts";

import { makeApiEventStream } from "./api-client.ts";
import "./styles.css";

const connectionStatusElement =
  document.querySelector<HTMLElement>("#connection-status");

const eventsElement = document.querySelector<HTMLOListElement>("#events");

if (connectionStatusElement === null || eventsElement === null) {
  throw new Error("Required renderer elements are missing.");
}

const requiredConnectionStatusElement = connectionStatusElement;
const requiredEventsElement = eventsElement;

function formatMilliseconds(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(3)}s`;
}

function renderState(state: RunApiState): void {
  requiredEventsElement.replaceChildren();

  if (state.run === null) {
    const element = document.createElement("li");

    element.textContent = "No active run.";

    requiredEventsElement.append(element);

    return;
  }

  state.milestones.forEach((milestone) => {
    const element = document.createElement("li");

    const requirementProgress = milestone.requirements
      .map((requirement) => {
        return (
          `${requirement.type}:${requirement.id} ` +
          `${requirement.observations.length}/${requirement.requiredCount}`
        );
      })
      .join(", ");

    const elapsedTime =
      milestone.elapsedMilliseconds === undefined
        ? "pending"
        : formatMilliseconds(milestone.elapsedMilliseconds);

    element.textContent =
      `${milestone.label}: ${elapsedTime}` +
      (requirementProgress.length > 0 ? ` (${requirementProgress})` : "");

    requiredEventsElement.append(element);
  });
}

const program = makeApiEventStream().pipe(
  Stream.runForEach((message) => {
    return E.sync(() => {
      requiredConnectionStatusElement.textContent = "Connected";

      renderState(message.state);
    });
  }),
);

void E.runPromise(
  program.pipe(
    E.catch((cause) => {
      return E.sync(() => {
        requiredConnectionStatusElement.textContent = "Disconnected";

        console.error(cause);
      });
    }),
  ),
);
