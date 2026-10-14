// The shapes the real console and dashboard get from their server, written
// out by hand. Here they are filled by the mock store (store.ts), never by a
// server. Field names match the real ones, so code moves over unchanged.

// ---- Support console ----

export type LiveState = "available" | "ringer_off" | "busy";
export type LivePhase = "free" | "offered" | "on_call" | "wrap_up";

// The person's live state, as the console's live control shows it.
export interface LiveView {
  state: LiveState;
  phase: LivePhase;
  ringer: boolean;
  // When the current state began, in ms.
  stateSince: number;
  wrapUpEndsAt: number | null;
}

export type LeaveReason =
  | "end"
  | "idle"
  | "closed_console"
  | "ignored_call"
  | "signed_out"
  | "blocked";

export interface LeftLive {
  reason: LeaveReason;
  emailsReturned: number;
}

export type RowIcon =
  | "new_email"
  | "reply"
  | "call"
  | "made_after_call"
  | "follow_up"
  | "no_owner_case";

export type Mark =
  | { kind: "yours" }
  | { kind: "owner"; name: string; live: boolean }
  | { kind: "no_owner" };

// One row in New: an email, a missed call or a case nobody holds.
export interface NewRow {
  id: string;
  kind: "email" | "call" | "case";
  channel: "email" | "call" | null;
  icon: RowIcon;
  who: string | null;
  subject: string | null;
  preview: string | null;
  summary: string | null;
  since: Date;
  mark: Mark | null;
  continuesCaseNumber: number | null;
}

export interface Caller {
  number: string | null;
  appCaller: "signed_in" | "signed_out" | null;
}

// What the call bar draws.
export interface CallBarData {
  waiting: { count: number; oldestSince: Date | null };
  offer: {
    conversationId: string;
    caller: Caller;
    waitingSince: Date | null;
    transfer: { fromName: string; note: string | null } | null;
    endsAt: number;
  } | null;
  offerSeconds: number;
  call: {
    conversationId: string;
    caller: Caller;
    caseId: string | null;
    caseNumber: number | null;
    answeredAt: number | null;
    muted: boolean;
    onHold: boolean;
    heldAt: number | null;
    reconnecting: boolean;
  } | null;
  wrapUp: {
    conversationId: string;
    caseId: string | null;
    caseNumber: number | null;
    inHand: boolean;
    endsAt: number;
  } | null;
}

// ---- Payroll dashboard ----

// What the run reports while it is worked out: the vendor's step text and
// a percent. The real text is playful ("Counting beans…");
// run-processing.tsx reads it only to know the stage.
export interface RunStatus {
  procStepDesc: string | null;
  procStepProgress: number | null;
}
