import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { RUN_API_EVENT } from "@/api/run-api-event.ts";

import { makeApiEventStream } from "./api-client.ts";
import "./styles.css";

const connectionStatusElement =
  document.querySelector<HTMLElement>("#connection-status");

const eventsElement = document.querySelector<HTMLOListElement>("#events");

if (connectionStatusElement === null || eventsElement === null) {
  throw new Error("Required renderer elements are missing.");
}

const requiredEventsElement = eventsElement;

function appendEvent(text: string): void {
  const element = document.createElement("li");

  element.textContent = text;

  requiredEventsElement.append(element);
}

const program = E.gen(function* () {
  connectionStatusElement.textContent = "Connected";

  yield* makeApiEventStream().pipe(
    Stream.runForEach((message) => {
      return E.sync(() => {
        switch (message.event.type) {
          case RUN_API_EVENT.RUN_STARTED: {
            appendEvent("Run started");
            break;
          }

          case RUN_API_EVENT.MILESTONE_COMPLETED: {
            appendEvent(
              `${message.event.milestone.label}: ` +
                `${message.event.milestone.elapsedMilliseconds} ms`,
            );
            break;
          }

          case RUN_API_EVENT.RUN_EXITED: {
            appendEvent("Run exited");
            break;
          }
        }
      });
    }),
  );
});

void E.runPromise(
  program.pipe(
    E.catch((cause) => {
      return E.sync(() => {
        connectionStatusElement.textContent = "Disconnected";

        console.error(cause);
      });
    }),
  ),
);
