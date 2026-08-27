import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
    </main>
  );
}
