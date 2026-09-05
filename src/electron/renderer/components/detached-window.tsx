import {
  type ReactNode,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useDetachedWindow } from "@/electron/renderer/components/providers/detached-window-provider.tsx";

const WINDOW_VERTICAL_MARGIN = 32;

function resizeDetachedWindowToContent({
  childContainer,
  childWindow,
}: {
  readonly childContainer: HTMLElement;
  readonly childWindow: Window;
}) {
  const contentHeight = childContainer.getBoundingClientRect().height;

  const windowChromeHeight = childWindow.outerHeight - childWindow.innerHeight;

  const maxHeight = childWindow.screen.availHeight - WINDOW_VERTICAL_MARGIN;

  const height = Math.min(
    Math.ceil(contentHeight) + windowChromeHeight,
    maxHeight,
  );

  childWindow.resizeTo(childWindow.outerWidth, height);
}

type DetachedWindowProps = {
  readonly children: ReactNode;
  readonly onClose: () => void;
};

function DetachedWindow({ children, onClose }: DetachedWindowProps) {
  const childWindowRef = useRef<Window | null>(null);
  const childContainerRef = useRef<HTMLElement | null>(null);
  const { setResizeToContent } = useDetachedWindow();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const childWindow = window.open("", "tracking-window", "width=450");

      if (childWindow === null) {
        return () => {};
      }

      document
        .querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
          'link[rel="stylesheet"], style',
        )
        .forEach((styleElement) => {
          childWindow.document.head.append(styleElement.cloneNode(true));
        });

      childWindow.document.documentElement.className =
        document.documentElement.className;

      childWindow.document.documentElement.style.scrollbarGutter = "auto";

      childWindow.document.body.className = document.body.className;

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

      const resizeToContent = () => {
        resizeDetachedWindowToContent({
          childContainer,
          childWindow,
        });
      };

      setResizeToContent(resizeToContent);

      return () => {
        setResizeToContent(null);

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

  return (
    <DetachedWindow onClose={close}>
      <main className="mx-auto w-full p-2">{children}</main>
    </DetachedWindow>
  );
}
