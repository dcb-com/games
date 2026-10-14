import type { Thrown } from "~/console/lib/error-messages";
import type { LeftLive, LiveView } from "~/mock/types";
import { useMock } from "~/mock/store";
import { useNow as useClock } from "~/mock/use-now";

// The real console keeps the person's live state on the server and streams
// it in. Here the same two hooks read the mock store, so the copied parts
// of the console (live control, call bar, lists) work unchanged.

export function useLive(): {
  live: LiveView | null;
  isLoaded: boolean;
  serverNow: number;
  left: LeftLive | null;
  elsewhere: boolean;
  error: Thrown;
} {
  const { agent } = useMock();
  const live: LiveView | null =
    agent.phase === "not_live"
      ? null
      : {
          state:
            agent.phase === "available"
              ? "available"
              : agent.phase === "ringer_off"
                ? "ringer_off"
                : "busy",
          phase:
            agent.phase === "offered" ||
            agent.phase === "on_call" ||
            agent.phase === "wrap_up"
              ? agent.phase
              : "free",
          ringer: agent.phase !== "ringer_off",
          stateSince: agent.since,
          wrapUpEndsAt: agent.wrapUpEndsAt,
        };
  return {
    live,
    isLoaded: true,
    serverNow: 0,
    left: agent.leftReason
      ? { reason: agent.leftReason, emailsReturned: 0 }
      : null,
    elsewhere: false,
    error: null,
  };
}

// The time now, moving once a second. The real hook corrects for the
// server's clock; the mock has none.
export function useNow(_serverNow?: number): number {
  return useClock();
}
