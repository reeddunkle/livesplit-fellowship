import * as DateTime from "effect/DateTime";

const LocalDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatLocalDateTime(dateTime: DateTime.Utc): string {
  return LocalDateTimeFormatter.format(
    new Date(DateTime.toEpochMillis(dateTime)),
  );
}
