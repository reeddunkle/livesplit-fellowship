import { useCallback } from "react";

import { useDetachedWindow } from "./detached-window-provider.tsx";

export function useResizeDetachedWindowAfterUpdate() {
  const { resizeToContent } = useDetachedWindow();

  return useCallback(
    (update: () => void) => {
      update();

      window.requestAnimationFrame(() => {
        resizeToContent();
      });
    },
    [resizeToContent],
  );
}
