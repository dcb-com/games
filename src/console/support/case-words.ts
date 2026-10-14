import { match } from "ts-pattern";

import { formatPhone } from "@dcb/phone/phone";

import type { Mark, NewRow } from "~/mock/types";

export type { Mark, NewRow };

// The words support lists use, taken from the real console's case-words.ts.
// Only the parts the mock screens need are here.

export function caseNumber(n: number): string {
  return `C-${n}`;
}

// A short age: "now", "4m", "2h", "3d".
export function formatAge(since: Date, now: number): string {
  const minutes = Math.floor((now - since.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export type MarkTone = "yours" | "owner" | "owner_not_live" | "none";

// The one mark a row carries, as words and a tone.
export function markOf(mark: Mark): { label: string; tone: MarkTone } {
  return match(mark)
    .with({ kind: "yours" }, () => ({
      label: "Your case",
      tone: "yours" as const,
    }))
    .with({ kind: "owner" }, (m) =>
      m.live
        ? { label: `${m.name}'s case`, tone: "owner" as const }
        : {
            label: `${m.name}'s case, not live`,
            tone: "owner_not_live" as const,
          },
    )
    .with({ kind: "no_owner" }, () => ({
      label: "No owner",
      tone: "none" as const,
    }))
    .exhaustive();
}

// The tooltip on a row's icon.
export function iconLabel(icon: NewRow["icon"]): string {
  return match(icon)
    .with("new_email", () => "New email")
    .with("reply", () => "A reply on an open case")
    .with("call", () => "Call")
    .with("made_after_call", () => "Made after a call")
    .with("follow_up", () => "Follow-up due")
    .with("no_owner_case", () => "A case with no owner")
    .exhaustive();
}

// Who a New row is from: the sender, the caller's number, or that nobody
// knows.
export function newRowWho(row: Pick<NewRow, "who" | "channel">): string {
  if (row.who === null) {
    return row.channel === "call" ? "Unknown caller" : "Unknown sender";
  }
  return row.channel === "call" ? formatPhone(row.who) : row.who;
}

// A New row's second line: what an after-hours caller pressed, or else
// the subject and a few words.
export function newRowLine(
  row: Pick<NewRow, "summary" | "subject" | "preview">,
): string {
  if (row.summary) return row.summary;
  const subject = row.subject ?? "(no subject)";
  return row.preview ? `${subject} · ${row.preview}` : subject;
}

// When a call came: "Sat 11:42 PM", in the person's own time zone.
export function callTimeWords(at: Date, timeZone?: string): string {
  const day = at.toLocaleDateString("en-US", { weekday: "short", timeZone });
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  return `${day} ${time}`;
}

// What My cases says when nothing is open.
export const MINE_GUIDE = {
  title: "Choose a case on the left.",
  body: "You can read a case while you're working on it: a message to answer, a call, or a follow-up that's due. Locked cases open again when one of those arrives.",
} as const;
