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
  const contentHeight = childContainer.scrollHeight;
  const contentWidth = childContainer.scrollWidth;

  const windowChromeHeight = childWindow.outerHeight - childWindow.innerHeight;
  const windowChromeWidth = childWindow.outerWidth - childWindow.innerWidth;

  const maxHeight = childWindow.screen.availHeight - WINDOW_VERTICAL_MARGIN;
  const maxWidth = childWindow.screen.availWidth - WINDOW_VERTICAL_MARGIN;

  const height = Math.min(
    Math.ceil(contentHeight) + windowChromeHeight,
    maxHeight,
  );

  const width = Math.min(Math.ceil(contentWidth) + windowChromeWidth, maxWidth);

  childWindow.resizeTo(width, height);
}

type DetachedWindowProps = {
  readonly children: ReactNode;
  readonly onClose: () => void;
};

function DetachedWindow({ children, onClose }: DetachedWindowProps) {
  const childWindowRef = useRef<Window | null>(null);
  const childContainerRef = useRef<HTMLElement | null>(null);
  const { setPortalContainer, setResizeToContent } = useDetachedWindow();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const isDarkTheme = document.documentElement.classList.contains("dark");

      const backgroundColor = isDarkTheme
        ? "rgb(36, 36, 36)"
        : "rgb(255, 255, 255)";

      const childWindow = window.open(
        "",
        "tracking-window",
        `width=460,backgroundColor=${backgroundColor}`,
      );

      if (childWindow === null) {
        return () => {};
      }

      const childDocumentElement = childWindow.document.documentElement;

      childDocumentElement.style.backgroundColor = isDarkTheme
        ? "oklch(0.145 0 0)"
        : "oklch(1 0 0)";

      childDocumentElement.style.overflow = "hidden";
      childDocumentElement.style.visibility = "hidden";

      document
        .querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
          'link[rel="stylesheet"], style',
        )
        .forEach((styleElement) => {
          childWindow.document.head.append(styleElement.cloneNode(true));
        });

      childDocumentElement.className = document.documentElement.className;

      childWindow.document.body.className = document.body.className;
      childWindow.document.body.style.backgroundColor = "var(--background)";

      const childContainer = childWindow.document.createElement("div");
      childContainer.id = "root";

      childWindow.document.body.append(childContainer);

      childWindowRef.current = childWindow;
      childContainerRef.current = childContainer;

      setPortalContainer(childWindow.document.body);

      const handleClose = () => {
        setPortalContainer(null);

        childWindowRef.current = null;
        childContainerRef.current = null;

        onStoreChange();
        onClose();
      };

      childWindow.addEventListener("beforeunload", handleClose);

      const resizeToContent = () => {
        resizeDetachedWindowToContent({
          childContainer,
          childWindow,
        });
      };

      setResizeToContent(resizeToContent);

      onStoreChange();

      let animationFrameId: number | undefined;
      let isCancelled = false;

      const initializeWindow = async () => {
        await childWindow.document.fonts.ready;

        if (isCancelled) {
          return;
        }

        animationFrameId = childWindow.requestAnimationFrame(() => {
          resizeToContent();

          childDocumentElement.style.backgroundColor = "";
          childDocumentElement.style.overflow = "";
          childDocumentElement.style.visibility = "";
        });
      };

      void initializeWindow();

      return () => {
        isCancelled = true;

        if (animationFrameId !== undefined) {
          childWindow.cancelAnimationFrame(animationFrameId);
        }

        setPortalContainer(null);
        setResizeToContent(null);

        childWindow.removeEventListener("beforeunload", handleClose);
        childWindow.close();

        childWindowRef.current = null;
        childContainerRef.current = null;
      };
    },
    [onClose, setPortalContainer, setResizeToContent],
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
      <main className="mx-auto w-fit p-2 sidebar-gutter-auto">{children}</main>
    </DetachedWindow>
  );
}
