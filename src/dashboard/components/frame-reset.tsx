import { createContext, useCallback, useContext, useState } from "react";

// No postMessage back to us, so the only reset available is reloading a frame
// to its entry page via a per-page nonce bump.
interface FrameResetValue {
  nonces: Record<number, number>;
  resetFrame: (page: number) => void;
}

const FrameResetContext = createContext<FrameResetValue | null>(null);

export function FrameResetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nonces, setNonces] = useState<Record<number, number>>({});

  const resetFrame = useCallback((page: number) => {
    setNonces((prev) => ({ ...prev, [page]: (prev[page] ?? 0) + 1 }));
  }, []);

  return (
    <FrameResetContext.Provider value={{ nonces, resetFrame }}>
      {children}
    </FrameResetContext.Provider>
  );
}

export function useFrameReset() {
  const value = useContext(FrameResetContext);
  if (!value) {
    throw new Error("useFrameReset must be used within a FrameResetProvider");
  }
  return value;
}
