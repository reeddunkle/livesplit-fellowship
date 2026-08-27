import { createHash } from "node:crypto";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { serializeCanonicalMilestoneConfiguration } from "./canonicalize-configuration.ts";

export type ConfigurationFingerprint = {
  readonly canonicalJson: string;
  readonly fingerprint: string;
};

export function createConfigurationFingerprint(
  configuration: FellowshipMilestoneConfiguration,
): ConfigurationFingerprint {
  const canonicalJson = serializeCanonicalMilestoneConfiguration(configuration);

  const fingerprint = createHash("sha256")
    .update(canonicalJson, "utf8")
    .digest("hex");

  return {
    canonicalJson,
    fingerprint,
  };
}
