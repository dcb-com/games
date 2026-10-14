import { match } from "ts-pattern";

import { formatPhone } from "@dcb/phone/phone";

import type { CallBarData, Caller, LivePhase, LiveState } from "~/mock/types";
import { caseNumber } from "~/console/support/case-words";

// The rules and words of the phone in the console that need no screen.

export type { CallBarData };

// A person on the Calls page and in the transfer list.
export interface TeamRow {
  staffId: string;
  name: string;
  state: LiveState;
  phase: LivePhase;
}

// Wrap-up lasts this long on the server. The
// call bar's data carries only when it ends, so the bar needs the length
// to drain.
export const WRAP_UP_MS = 120_000;

// A wait is calm under 20 seconds, slow from 20 to 60, and late past 60.
type WaitTone = "calm" | "slow" | "late";

export function waitTone(ms: number): WaitTone {
  if (ms > 60_000) return "late";
  if (ms >= 20_000) return "slow";
  return "calm";
}

export function waitClass(ms: number): string {
  return match(waitTone(ms))
    .with("calm", () => "text-muted-foreground")
    .with("slow", () => "text-warning-foreground")
    .with("late", () => "text-destructive")
    .exhaustive();
}

// How much of a countdown is left, from 1 (all of it) to 0.
export function remainingFraction(
  endsAt: number,
  now: number,
  totalMs: number,
): number {
  if (totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, (endsAt - now) / totalMs));
}

// The ring plays for an offer, in the tab that holds the phone, and never
// while the person is already on a call.
export function shouldRing(args: {
  offered: boolean;
  onCall: boolean;
  ownsPhone: boolean;
}): boolean {
  return args.offered && args.ownsPhone && !args.onCall;
}

// The waiting count takes one soft wash when it rises, for an available
// person not on a call, unless they asked for less motion.
export function shouldBump(args: {
  before: number | null;
  count: number;
  available: boolean;
  onCall: boolean;
  reducedMotion: boolean;
}): boolean {
  return (
    args.before !== null &&
    args.count > args.before &&
    args.available &&
    !args.onCall &&
    !args.reducedMotion
  );
}

// The tab's title while a call is offered.
export const INCOMING_TITLE = "(1) Incoming call";

// A caller shows as their number and nothing else: no "May be C-1042",
// no "No match". The number is a key for the server, never shown as a
// match.

// Who is calling, in place of a number. A call from the DCB app has no
// number: it says whether the caller was signed in (the server checked the
// app's ticket, so the call is verified) or not.
export function callerNumber(caller: Caller): string {
  return match(caller.appCaller)
    .with("signed_in", () => "Verified: called from the app")
    .with("signed_out", () => "From the app, not signed in")
    .with(null, () =>
      caller.number ? formatPhone(caller.number) : "Unknown number",
    )
    .exhaustive();
}

// A person's state on the Calls page and in the transfer list.
export function teamStateWords(row: Pick<TeamRow, "state" | "phase">): string {
  return match(row.state)
    .with("available", () => "Available")
    .with("ringer_off", () => "Ringer off")
    .with("busy", () =>
      match(row.phase)
        .with("offered", () => "Being offered a call")
        .with("on_call", () => "On a call")
        .with("wrap_up", () => "Wrap-up")
        .with("free", () => "Busy")
        .exhaustive(),
    )
    .exhaustive();
}

export function teamDotClass(state: TeamRow["state"]): string {
  return match(state)
    .with("available", () => "bg-success-foreground")
    .with("ringer_off", () => "bg-muted-foreground")
    .with("busy", () => "bg-warning-foreground")
    .exhaustive();
}

// The live agents a call may go to, available first. The list comes
// sorted from the server; this keeps that order and marks the rest.
export function transferChoices(
  rows: TeamRow[],
): { row: TeamRow; nextFree: boolean }[] {
  const available = rows.filter((r) => r.state === "available");
  const others = rows.filter((r) => r.state !== "available");
  return [
    ...available.map((row) => ({ row, nextFree: false })),
    ...others.map((row) => ({ row, nextFree: true })),
  ];
}

export const TRANSFER_NOTE_MAX = 200;

// Where a call is worked: its own page until it is in a case, then the
// case. The call's page moves on to the case by itself once there is one.
type CallPlace =
  | { to: "/support/c/$id"; params: { id: string } }
  | { to: "/support/cases/$id"; params: { id: string } };

export function callPageLink(conversationId: string): CallPlace {
  return { to: "/support/c/$id", params: { id: conversationId } };
}

// The call bar's link for the call in progress or in wrap-up: the case
// number when it is in a case, or "Not in a case yet" leading to the
// call's page. No link when the call is no longer the person's (they
// transferred it) and it is in no case.
export function callBarLink(args: {
  conversationId: string;
  caseId: string | null;
  caseNumber: number | null;
  inHand: boolean;
}): { label: string; inCase: boolean; place: CallPlace | null } {
  if (args.caseId && args.caseNumber !== null) {
    return {
      label: caseNumber(args.caseNumber),
      inCase: true,
      place: { to: "/support/cases/$id", params: { id: args.caseId } },
    };
  }
  return {
    label: "Not in a case yet",
    inCase: false,
    place: args.inHand ? callPageLink(args.conversationId) : null,
  };
}

export function transferredWords(name: string): string {
  return `Sent to ${name}. You are in wrap-up.`;
}
