import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/electron/renderer/components/settings-page/settings-page";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
