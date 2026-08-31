import * as Data from "effect/Data";

import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

export const FELLOWSHIP_TRACKER_ALREADY_RUNNING_ERROR =
  "FellowshipTrackerAlreadyRunningError" as const;

export class FellowshipTrackerAlreadyRunningError extends Data.TaggedError(
  FELLOWSHIP_TRACKER_ALREADY_RUNNING_ERROR,
)<Record<never, never>> {
  override get message(): string {
    return "Fellowship tracker is already running.";
  }
}

export const FELLOWSHIP_TRACKER_CONFIGURATION_NOT_FOUND_ERROR =
  "FellowshipTrackerConfigurationNotFoundError" as const;

export class FellowshipTrackerConfigurationNotFoundError extends Data.TaggedError(
  FELLOWSHIP_TRACKER_CONFIGURATION_NOT_FOUND_ERROR,
)<{
  readonly configurationId: ConfigurationId;
}> {
  constructor(configurationId: ConfigurationId) {
    super({
      configurationId,
    });
  }

  override get message(): string {
    return `Configuration not found: ${this.configurationId}`;
  }
}
