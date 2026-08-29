import { NavMenu } from "@/electron/renderer/components/core/nav-menu.tsx";

export function AppHeader() {
  return (
    <header className="flex items-center justify-end border-b px-6 py-3">
      <NavMenu />
    </header>
  );
}
