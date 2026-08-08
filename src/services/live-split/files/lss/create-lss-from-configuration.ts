import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipMilestoneDefinition } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";

import { createXMLElement, renderXMLDocument, type XMLElement } from "./xml.ts";

export type CreateLSSFromConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

function createGameName(
  configuration: FellowshipMilestoneConfiguration,
): string {
  return `Fellowship ${configuration.dungeon.name}`;
}

function createSplitTimes(targetElapsedTime: string | undefined): XMLElement {
  if (targetElapsedTime === undefined) {
    return createXMLElement({
      name: "SplitTimes",
    });
  }

  return createXMLElement({
    children: [
      createXMLElement({
        attributes: {
          name: "Goal",
        },
        children: [
          createXMLElement({
            children: [targetElapsedTime],
            name: "RealTime",
          }),
        ],
        name: "SplitTime",
      }),
    ],
    name: "SplitTimes",
  });
}

function createSegment(milestone: FellowshipMilestoneDefinition): XMLElement {
  return createXMLElement({
    children: [
      createXMLElement({
        children: [milestone.label],
        name: "Name",
      }),
      createXMLElement({
        name: "Icon",
      }),
      createSplitTimes(milestone.targetElapsedTime),
      createXMLElement({
        name: "BestSegmentTime",
      }),
      createXMLElement({
        name: "SegmentHistory",
      }),
    ],
    name: "Segment",
  });
}

function createLSSXMLTree(
  configuration: FellowshipMilestoneConfiguration,
): XMLElement {
  return createXMLElement({
    attributes: {
      version: "1.7.0",
    },
    children: [
      createXMLElement({
        name: "GameIcon",
      }),
      createXMLElement({
        children: [createGameName(configuration)],
        name: "GameName",
      }),
      createXMLElement({
        name: "CategoryName",
      }),
      createXMLElement({
        name: "LayoutPath",
      }),
      createXMLElement({
        children: [
          createXMLElement({
            attributes: {
              id: "",
            },
            name: "Run",
          }),
          createXMLElement({
            attributes: {
              usesEmulator: "False",
            },
            name: "Platform",
          }),
          createXMLElement({
            name: "Region",
          }),
          createXMLElement({
            name: "Variables",
          }),
          createXMLElement({
            name: "CustomVariables",
          }),
        ],
        name: "Metadata",
      }),
      createXMLElement({
        children: ["00:00:00"],
        name: "Offset",
      }),
      createXMLElement({
        children: ["0"],
        name: "AttemptCount",
      }),
      createXMLElement({
        children: configuration.milestones.map(createSegment),
        name: "Segments",
      }),
      createXMLElement({
        name: "AutoSplitterSettings",
      }),
    ],
    name: "Run",
  });
}

export function createLSSFromConfiguration({
  configuration,
}: CreateLSSFromConfigurationOptions): string {
  return renderXMLDocument(createLSSXMLTree(configuration));
}
