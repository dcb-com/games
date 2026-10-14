// Tolerates SSR (no `window`), private-mode/quota errors, and disabled storage.
export const safeStorage = {
  get(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Caller falls back to in-memory state for the session.
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to fall back to.
    }
  },
};
