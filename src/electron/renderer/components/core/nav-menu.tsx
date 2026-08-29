import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/electron/renderer/components/core/theme-toggle.tsx";
import { navigationMenuTriggerStyle } from "@/electron/renderer/components/ui/navigation-menu.tsx";

export function NavMenu() {
  return (
    <nav className="flex items-center gap-1">
      <Link
        activeOptions={{
          exact: true,
        }}
        activeProps={{
          className: "bg-muted text-foreground shadow-sm",
        }}
        className={navigationMenuTriggerStyle()}
        to="/"
      >
        Configurations
      </Link>

      <Link
        activeProps={{
          className: "bg-muted text-foreground shadow-sm",
        }}
        className={navigationMenuTriggerStyle()}
        to="/settings"
      >
        Settings
      </Link>

      <div className="ml-2">
        <ThemeToggle />
      </div>
    </nav>
  );
}
