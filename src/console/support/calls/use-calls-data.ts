import type { CallBarData } from "~/mock/types";
import { OFFER_MS, useMock } from "~/mock/store";

// The call bar's data, built from the mock store. The real hook asks the
// server and listens to the live stream. Numbers use 555-01xx, which is set
// aside for made-up numbers.
export function useCallBarData(_enabled: boolean): {
  data: CallBarData | undefined;
} {
  const { agent } = useMock();
  const caller = { number: "+15555550142", appCaller: null };
  const data: CallBarData = {
    waiting: {
      count: agent.waitingCalls,
      oldestSince:
        agent.waitingSince === null ? null : new Date(agent.waitingSince),
    },
    offerSeconds: OFFER_MS / 1000,
    offer:
      agent.phase === "offered" && agent.offerEndsAt !== null
        ? {
            conversationId: "call-1",
            caller,
            waitingSince: new Date(agent.since - 12_000),
            transfer: null,
            endsAt: agent.offerEndsAt,
          }
        : null,
    call:
      agent.phase === "on_call"
        ? {
            conversationId: "call-1",
            caller,
            caseId: "case-1006",
            caseNumber: 1006,
            answeredAt: agent.answeredAt,
            muted: agent.muted,
            onHold: agent.onHold,
            heldAt: agent.heldAt,
            reconnecting: false,
          }
        : null,
    wrapUp:
      agent.phase === "wrap_up" && agent.wrapUpEndsAt !== null
        ? {
            conversationId: "call-1",
            caseId: "case-1006",
            caseNumber: 1006,
            inHand: true,
            endsAt: agent.wrapUpEndsAt,
          }
        : null,
  };
  return { data };
}
