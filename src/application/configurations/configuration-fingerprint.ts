import * as E from "effect/Effect";

import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/configurations/configuration-types.ts";
import { type ConfigurationDefinitionFingerprint } from "@/validation/configuration/configuration-definition-fingerprint-schema.ts";
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint-schema.ts";

import {
  serializeCanonicalConfiguration,
  serializeCanonicalConfigurationDefinition,
} from "./canonicalize-configuration.ts";

export type ConfigurationDefinitionFingerprintResult = {
  readonly canonicalJson: string;
  readonly fingerprint: ConfigurationDefinitionFingerprint;
};

export type ConfigurationFingerprintResult = {
  readonly canonicalJson: string;
  readonly fingerprint: ConfigurationFingerprint;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function sha256(value: string): E.Effect<string, Error> {
  return E.tryPromise({
    catch: (cause) => {
      return cause instanceof Error
        ? cause
        : new Error("Failed to create SHA-256 digest.");
    },
    try: async () => {
      const bytes = new TextEncoder().encode(value);

      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

      return bytesToHex(new Uint8Array(digest));
    },
  });
}

export function createConfigurationDefinitionFingerprint(
  configuration: FellowshipMilestoneConfiguration,
): E.Effect<ConfigurationDefinitionFingerprintResult, Error> {
  const canonicalJson =
    serializeCanonicalConfigurationDefinition(configuration);

  return E.gen(function* () {
    const fingerprint = (yield* sha256(
      canonicalJson,
    )) as ConfigurationDefinitionFingerprint;

    return {
      canonicalJson,
      fingerprint,
    };
  });
}

export function createConfigurationFingerprint(
  configuration: FellowshipMilestoneConfiguration,
): E.Effect<ConfigurationFingerprintResult, Error> {
  const canonicalJson = serializeCanonicalConfiguration(configuration);

  return E.gen(function* () {
    const fingerprint = (yield* sha256(
      canonicalJson,
    )) as ConfigurationFingerprint;

    return {
      canonicalJson,
      fingerprint,
    };
  });
}
