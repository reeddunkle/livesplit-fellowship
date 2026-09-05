import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ResizeToContent = () => void;

type DetachedWindowContextValue = {
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly resizeToContent: () => void;
  readonly setResizeToContent: (
    resizeToContent: ResizeToContent | null,
  ) => void;
};

const DetachedWindowContext = createContext<
  DetachedWindowContextValue | undefined
>(undefined);

type DetachedWindowProviderProps = {
  readonly children: ReactNode;
};

export function DetachedWindowProvider({
  children,
}: DetachedWindowProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const resizeToContentRef = useRef<ResizeToContent | null>(null);

  const open = useCallback(() => {
    setIsOpen((currentIsOpen) => {
      if (currentIsOpen) {
        console.warn(
          "[DetachedWindowProvider]",
          "Skipping `setIsOpen(true)` because state is already true.",
        );
      }

      return true;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resizeToContent = useCallback(() => {
    resizeToContentRef.current?.();
  }, []);

  const setResizeToContent = useCallback(
    (nextResizeToContent: ResizeToContent | null) => {
      resizeToContentRef.current = nextResizeToContent;
    },
    [],
  );

  const value = useMemo(
    () => ({
      close,
      isOpen,
      open,
      resizeToContent,
      setResizeToContent,
    }),
    [close, isOpen, open, resizeToContent, setResizeToContent],
  );

  return (
    <DetachedWindowContext value={value}>{children}</DetachedWindowContext>
  );
}

export function useDetachedWindow(): DetachedWindowContextValue {
  const context = useContext(DetachedWindowContext);

  if (context === undefined) {
    throw new Error(
      "useDetachedWindow must be used within a DetachedWindowProvider.",
    );
  }

  return context;
}
