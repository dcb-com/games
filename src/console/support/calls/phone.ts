// The real phone runs in the browser and can fail to connect. The mock
// phone always works.

export function usePhone(): { status: "ready" | "failed"; failure: null } {
  return { status: "ready", failure: null };
}

export function retryPhone() {
  // Nothing to retry.
}
