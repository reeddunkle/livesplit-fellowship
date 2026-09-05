import {
  type ReactNode,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useDetachedWindow } from "@/electron/renderer/components/detached-window/detached-window-provider";

const WINDOW_VERTICAL_MARGIN = 32;
const WINDOW_HORIZONTAL_MARGIN = 32;

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

  const scrollbarWidth =
    childWindow.innerWidth - childWindow.document.documentElement.clientWidth;

  const maxHeight = childWindow.screen.availHeight - WINDOW_VERTICAL_MARGIN;
  const maxWidth = childWindow.screen.availWidth - WINDOW_HORIZONTAL_MARGIN;

  const height = Math.min(
    Math.ceil(contentHeight) + windowChromeHeight,
    maxHeight,
  );

  const width = Math.min(
    Math.ceil(contentWidth) + windowChromeWidth + scrollbarWidth,
    maxWidth,
  );

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
      const childWindow = window.open(
        "",
        "tracking-window",
        "width=460,detachedWindow=true",
      );

      if (childWindow === null) {
        return () => {};
      }

      const childDocument = childWindow.document;

      document
        .querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
          'link[rel="stylesheet"], style',
        )
        .forEach((styleElement) => {
          childDocument.head.append(styleElement.cloneNode(true));
        });

      childDocument.documentElement.className =
        document.documentElement.className;

      childDocument.documentElement.classList.add(
        "[scrollbar-gutter:stable_both-edges]",
      );

      childDocument.body.className = document.body.className;

      const childContainer = childDocument.createElement("div");
      childContainer.id = "root";

      childDocument.body.append(childContainer);

      childWindowRef.current = childWindow;
      childContainerRef.current = childContainer;

      setPortalContainer(childDocument.body);

      const resizeToContent = () => {
        resizeDetachedWindowToContent({
          childContainer,
          childWindow,
        });
      };

      setResizeToContent(resizeToContent);

      const handleClose = () => {
        setPortalContainer(null);
        setResizeToContent(null);

        childWindowRef.current = null;
        childContainerRef.current = null;

        onStoreChange();
        onClose();
      };

      childWindow.addEventListener("beforeunload", handleClose);

      onStoreChange();

      let animationFrameId: number | undefined;
      let isCancelled = false;

      const initializeWindow = async () => {
        await childDocument.fonts.ready;

        if (isCancelled) {
          return;
        }

        animationFrameId = childWindow.requestAnimationFrame(() => {
          resizeToContent();
          childWindow.electronAPI.showWindow();
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
