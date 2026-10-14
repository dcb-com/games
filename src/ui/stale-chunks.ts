// After a deploy, a tab opened before it may ask for a page's code under a
// name the new build no longer has. Vite then fires `vite:preloadError`.
// The page reloads once to pick up the new build. A second failure within
// a minute is left to the page's own error screen, so a file that is
// truly missing cannot reload the tab forever.

const KEY = "dcb:stale-chunk-reload";
const WITHIN_MS = 60_000;

function lastReload(): number {
  try {
    return Number(sessionStorage.getItem(KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function reloadOnStaleChunk(): void {
  window.addEventListener("vite:preloadError", (event) => {
    const now = Date.now();
    if (now - lastReload() < WITHIN_MS) return;
    try {
      sessionStorage.setItem(KEY, String(now));
    } catch {
      // Storage refused: still reload once; the next failure shows the
      // error screen because this page is gone.
    }
    event.preventDefault();
    window.location.reload();
  });
}
