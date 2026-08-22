import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import {
  API_CONNECTION_STATE,
  makeApiEventStream,
} from "@/electron/renderer/api/run-event-stream.ts";
import { renderRunState } from "@/electron/renderer/run/render-run-state.ts";

import "./styles.css";

const connectionStatusElement =
  document.querySelector<HTMLElement>("#connection-status");

const eventsElement = document.querySelector<HTMLOListElement>("#events");

if (connectionStatusElement === null || eventsElement === null) {
  throw new Error("Required renderer elements are missing.");
}

const program = makeApiEventStream().pipe(
  Stream.runForEach((event) => {
    switch (event.type) {
      case "CONNECTION_STATE_CHANGED": {
        connectionStatusElement.textContent = event.state;

        return E.void;
      }

      case "MESSAGE_RECEIVED": {
        renderRunState({
          element: eventsElement,
          state: event.message.state,
        });

        return E.void;
      }
    }
  }),
  E.catch((error) => {
    console.error(error);

    connectionStatusElement.textContent = API_CONNECTION_STATE.DISCONNECTED;

    return E.void;
  }),
);

E.runFork(program);
