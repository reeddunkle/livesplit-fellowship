import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export function getLSSFileName(
  configuration: FellowshipMilestoneConfiguration,
): string {
  const dungeonSlug = configuration.dungeon.name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `${dungeonSlug}.lss`;
}
