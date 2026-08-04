import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { type FellowshipLogParseError } from "@/errors/fellowship-log-parse-error.ts";
import { getEventType } from "@/services/fellowship/parsing/get-event-type.ts";
import {
  type FellowshipEvent,
  isParsedFellowshipEventType,
} from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { parseFellowshipLogLine } from "./parse-fellowship-log-line.ts";

export function parseFellowshipEventStream<E, R>(
  lines: Stream.Stream<string, E, R>,
): Stream.Stream<FellowshipEvent, E | FellowshipLogParseError, R> {
  return lines.pipe(
    Stream.filterEffect((line) => {
      const eventType = getEventType(line);
      const isParsedEventType = isParsedFellowshipEventType(eventType);

      return E.gen(function* () {
        yield* E.logInfo("Checked Fellowship event type.", {
          eventType,
          isParsedEventType,
          preview: line.slice(0, 200),
        });

        return isParsedEventType;
      });
    }),
    Stream.mapEffect((line) => {
      return parseFellowshipLogLine(line).pipe(
        E.tap((event) => {
          return E.logInfo("Parsed Fellowship event.", {
            event,
            eventType: event.type,
          });
        }),
        E.tapError((error) => {
          return E.logError("Failed to parse Fellowship log line.", {
            error,
            line,
          });
        }),
      );
    }),
  );
}
