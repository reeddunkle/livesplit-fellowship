import { AppLayout } from "@/electron/renderer/components/core/app-layout";

export function SettingsPage() {
  return (
    <AppLayout>
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </main>
    </AppLayout>
  );
}
