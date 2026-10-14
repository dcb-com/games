import { match } from "ts-pattern";

import type { LeaveReason, LeftLive, LiveView } from "~/mock/types";

export type { LeaveReason, LeftLive, LiveView };

// The words and numbers the live parts of the console show.

// A short clock: "0:42", "4:21", "1:02:03".
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// The one word at the foot of the sidebar.
export function stateWord(live: LiveView | null): string {
  if (!live) return "Not live";
  return match(live.state)
    .with("available", () => "Available")
    .with("ringer_off", () => "Ringer off")
    .with("busy", () => "Busy")
    .exhaustive();
}

// The live control's state and timer: "Available 4:21", "Being offered a call",
// "On a call 3:12", "Wrap-up 1:47". Wrap-up counts down.
export function stateLabel(live: LiveView, now: number): string {
  const since = formatClock(now - live.stateSince);
  if (live.state !== "busy") {
    return `${live.state === "available" ? "Available" : "Ringer off"} ${since}`;
  }
  return match(live.phase)
    .with("offered", () => "Being offered a call")
    .with("on_call", () => `On a call ${since}`)
    .with("wrap_up", () =>
      live.wrapUpEndsAt === null
        ? `Wrap-up ${since}`
        : `Wrap-up ${formatClock(live.wrapUpEndsAt - now)}`,
    )
    .with("free", () => `Available ${since}`)
    .exhaustive();
}

// The dot beside the state, in the theme's colors.
export function stateDotClass(live: LiveView | null): string {
  if (!live) return "bg-input";
  return match(live.state)
    .with("available", () => "bg-success-foreground")
    .with("ringer_off", () => "bg-muted-foreground")
    .with("busy", () => "bg-warning-foreground")
    .exhaustive();
}

// Why the person left live, and what went back, for the Not live block.
// Null after End: the End dialog already said what goes back, so a
// deliberate End is never followed by a notice. Every other way of leaving says what went back.
export function leftLiveNotice(left: LeftLive | null): string[] | null {
  if (!left || left.reason === "end") return null;
  const first = match(left.reason)
    .with(
      "idle",
      () =>
        "You left live after 5 minutes with no clicks or typing on the console. Time on a call or in wrap-up does not count; the 5 minutes start again when a wrap-up ends.",
    )
    .with(
      "closed_console",
      () =>
        "You left live because the console was closed or offline for 30 seconds.",
    )
    .with(
      "ignored_call",
      () =>
        "You left live because a call rang for 20 seconds and nobody answered or sent it back. The caller waits for the next free person, or, outside support hours with nobody taking calls, goes to the after-hours line.",
    )
    .with("signed_out", "blocked", () => null)
    .exhaustive();
  const lines = first ? [first] : [];
  const returned = emailsWentBack(left.emailsReturned, "went");
  if (returned) lines.push(returned);
  return lines.length > 0 ? lines : null;
}

// "1 email you picked up went back to New." The End dialog says "goes".
export function emailsWentBack(
  count: number,
  verb: "went" | "goes",
): string | null {
  if (count <= 0) return null;
  const emails = count === 1 ? "1 email" : `${count} emails`;
  const said = verb === "went" ? "went" : count === 1 ? "goes" : "go";
  return `${emails} you picked up ${said} back to New.`;
}
