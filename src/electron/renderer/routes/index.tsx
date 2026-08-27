import { createFileRoute } from "@tanstack/react-router";
import * as E from "effect/Effect";

import { getConfigurations } from "@/electron/renderer/api/configuration-client.ts";
import { getDungeons } from "@/electron/renderer/api/dungeon-client.ts";
import { HomePage } from "@/electron/renderer/components/home/home-page";

export const Route = createFileRoute("/")({
  component: HomeRoute,
  loader: () => {
    return E.runPromise(
      E.all({
        configurations: getConfigurations(),
        dungeons: getDungeons(),
      }),
    );
  },
});

function HomeRoute() {
  const { configurations, dungeons } = Route.useLoaderData();

  return <HomePage configurations={configurations} dungeons={dungeons} />;
}
