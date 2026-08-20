import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type RunApiState } from "@/api/validation/run-api-message-schema.ts";
import {
  API_CONNECTION_STATE,
  makeApiEventStream,
} from "@/electron/renderer/api-client.ts";

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
        return `${requirement.type}:${requirement.id} ${requirement.observations.length}/${requirement.requiredCount}`;
      })
      .join(", ");

    const elapsedTime =
      milestone.elapsedMilliseconds === null
        ? "pending"
        : formatMilliseconds(milestone.elapsedMilliseconds);

    element.textContent =
      `${milestone.label}: ${elapsedTime}` +
      (requirementProgress.length > 0 ? ` (${requirementProgress})` : "");

    requiredEventsElement.append(element);
  });
}

const program = makeApiEventStream().pipe(
  Stream.runForEach((event) => {
    switch (event.type) {
      case "CONNECTION_STATE_CHANGED": {
        requiredConnectionStatusElement.textContent = event.state;

        return E.void;
      }

      case "MESSAGE_RECEIVED": {
        renderState(event.message.state);

        return E.void;
      }
    }
  }),
  E.catch((error) => {
    console.error(error);

    requiredConnectionStatusElement.textContent =
      API_CONNECTION_STATE.DISCONNECTED;

    return E.void;
  }),
);

E.runFork(program);
