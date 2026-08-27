import * as E from "effect/Effect";
import * as Schema from "effect/Schema";

import { FellowshipLogParseError } from "@/errors/fellowship-log-parse-error.ts";
import { getEventType } from "@/services/fellowship/parsing/get-event-type.ts";
import {
  type FellowshipEvent,
  fellowshipEventSchemas,
  isParsedFellowshipEventType,
} from "@/services/fellowship/validation/fellowship-event-schema.ts";

export function parseFellowshipLogLine(
  line: string,
): E.Effect<FellowshipEvent, FellowshipLogParseError> {
  const eventType = getEventType(line);

  if (!isParsedFellowshipEventType(eventType)) {
    return E.fail(
      new FellowshipLogParseError({
        cause: new Error(
          `Unsupported Fellowship event type: ${eventType ?? "(unknown)"}`,
        ),
        line,
      }),
    );
  }

  const schema = fellowshipEventSchemas[eventType];

  return Schema.decodeUnknownEffect(schema)(line.split("|")).pipe(
    E.mapError((cause) => {
      return new FellowshipLogParseError({
        cause,
        line,
      });
    }),
  );
}
