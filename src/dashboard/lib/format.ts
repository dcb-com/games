import { match } from "ts-pattern";

import {
  formatPhone,
  formatPhoneInput,
  nationalDigits,
  toE164,
} from "@dcb/phone/phone";

// Parse WEP's `YYYY-MM-DD` at local noon so the day can't slip a timezone.
function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

// The local day of a timestamp ("2026-10-12T02:18:14Z"), as fmtDate writes
// a day.
export function fmtInstantDay(at: string | null | undefined): string {
  if (!at) return "-";
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtNumber(n: number | null | undefined): string {
  return n == null ? "-" : n.toLocaleString();
}

/** "1 check", "3 checks", "2 matches" with `many` given. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

export function fmtDate(day: string | null | undefined): string {
  if (!day) return "-";
  return parseDay(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDayMonth(day: string | null | undefined): string {
  if (!day) return "-";
  return parseDay(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type Granularity = "week" | "month" | "quarter";

// Server types this as z.string(); narrow to the closed set here, defaulting anything else to "month".
function toGranularity(value: string): Granularity {
  return match(value)
    .with("week", (v) => v)
    .with("quarter", (v) => v)
    .otherwise((): Granularity => "month");
}

export function fmtPeriod(day: string, granularity: string): string {
  const d = parseDay(day);
  return match(toGranularity(granularity))
    .with(
      "quarter",
      () =>
        `Q${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(2)}`,
    )
    .with("week", () =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    )
    .with("month", () =>
      d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    )
    .exhaustive();
}

/**
 * The one way the product shows a masked Social Security number:
 * "•••-••-7890". Pass either the last four digits on their own, or a
 * longer string (a full or partly masked SSN) to have the last four
 * digits pulled out of it. Returns null when there aren't four digits
 * to show.
 */
export function formatSsnLast4(
  value: string | null | undefined,
): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••-••-${digits.slice(-4)}`;
}

/** A federal employer number as the IRS writes it: "12-3456789". */
export function fmtFein(value: string): string {
  return /^\d{9}$/.test(value)
    ? `${value.slice(0, 2)}-${value.slice(2)}`
    : value || "-";
}

/**
 * A company's phone for people to read: "(214) 555-0142" for a US number,
 * which is every company here, and the number as it came otherwise.
 */
export function fmtCompanyPhone(value: string): string {
  if (!value) return "-";
  const e164 = toE164(value);
  if (!e164) return value;
  return e164.startsWith("+1")
    ? formatPhoneInput(nationalDigits(e164))
    : formatPhone(e164);
}

/** Formats a cent amount (not dollars) as localized USD currency, e.g. `moneyCents(1250)` -> "$12.50". */
export { moneyCents } from "~/dashboard/lib/money";
