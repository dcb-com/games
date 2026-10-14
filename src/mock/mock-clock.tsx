import { useEffect } from "react";

import { applyPreset, tick } from "~/mock/store";

// Moves the mock world on once a second: an unanswered call rings out,
// wrap-up ends, a payroll run finishes. On first load it also reads
// `?state=` from the address (see PRESETS in store.ts).
export function MockClock() {
  useEffect(() => {
    applyPreset(new URLSearchParams(window.location.search).get("state"));
    const id = setInterval(() => tick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
