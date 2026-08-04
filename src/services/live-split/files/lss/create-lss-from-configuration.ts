import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

import { createXMLElement, renderXMLDocument, type XMLElement } from "./xml.ts";

export type CreateLSSFromConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

function createGameName(
  configuration: FellowshipMilestoneConfiguration,
): string {
  const baseName = `Fellowship ${configuration.dungeon.name}`;

  if (configuration.keyLevel === undefined) {
    return baseName;
  }

  return `${baseName} +${configuration.keyLevel}`;
}

function createSegment(label: string): XMLElement {
  return createXMLElement({
    children: [
      createXMLElement({
        children: [label],
        name: "Name",
      }),
      createXMLElement({
        name: "Icon",
      }),

      /*
       * Keep the standard LiveSplit containers but omit all timing data.
       * These render as self-closing XML elements.
       */
      createXMLElement({
        name: "SplitTimes",
      }),
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
        children: configuration.milestones.map((milestone) => {
          return createSegment(milestone.label);
        }),
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
