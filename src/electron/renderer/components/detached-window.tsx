import {
  type ReactNode,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useDetachedWindow } from "@/electron/renderer/components/providers/detached-window-provider.tsx";

type DetachedWindowProps = {
  readonly children: ReactNode;
  readonly onClose: () => void;
};

function DetachedWindow({ children, onClose }: DetachedWindowProps) {
  const childWindowRef = useRef<Window | null>(null);
  const childContainerRef = useRef<HTMLElement | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const childWindow = window.open("", "tracking-window");

      if (childWindow === null) {
        return () => {};
      }

      const childContainer = childWindow.document.createElement("div");
      childContainer.id = "root";

      childWindow.document.body.append(childContainer);

      childWindowRef.current = childWindow;
      childContainerRef.current = childContainer;

      const handleClose = () => {
        childWindowRef.current = null;
        childContainerRef.current = null;

        onStoreChange();
        onClose();
      };

      childWindow.addEventListener("beforeunload", handleClose);

      onStoreChange();

      return () => {
        childWindow.removeEventListener("beforeunload", handleClose);
        childWindow.close();

        childWindowRef.current = null;
        childContainerRef.current = null;
      };
    },
    [onClose],
  );

  const getSnapshot = useCallback(() => {
    return childContainerRef.current;
  }, []);

  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);

  const childContainer = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (childContainer === null) {
    return null;
  }

  return createPortal(children, childContainer);
}

type ManagedDetachedWindowProps = {
  readonly children: ReactNode;
};

export function ManagedDetachedWindow({
  children,
}: ManagedDetachedWindowProps) {
  const { close, isOpen } = useDetachedWindow();

  if (!isOpen) {
    return null;
  }

  return <DetachedWindow onClose={close}>{children}</DetachedWindow>;
}
