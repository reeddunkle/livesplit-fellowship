import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type DetachedWindowContextValue = {
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly open: () => void;
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

  const open = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      console.warn(
        "[DetachedWindowProvider]",
        "Skipping `setIsOpen(true)` because state is already true.",
      );
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      close,
      isOpen,
      open,
    }),
    [close, isOpen, open],
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
