import { useEffect } from "react";

import { applyPreset, tick } from "~/mock/store";

// Moves the mock world on once a second: an unanswered call rings out,
// wrap-up ends, a payroll run finishes. On first load it also reads
// `?state=` from the address (see PRESETS in store.ts).
// Read once per page load. StrictMode runs effects twice in dev, and a
// preset that adds rows would add them twice.
let presetRead = false;

export function MockClock() {
  useEffect(() => {
    if (!presetRead) {
      presetRead = true;
      applyPreset(new URLSearchParams(window.location.search).get("state"));
    }
    const id = setInterval(() => tick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
