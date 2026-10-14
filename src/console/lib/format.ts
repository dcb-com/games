// Dates as people read them, in the reader's own time zone.

type DateValue = Date | string | number | null | undefined;

function toDate(value: DateValue): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: DateValue, empty = "Never"): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : empty;
}

const timeOnly = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

// "2:02 pm".
export function formatTime(value: DateValue, empty = ""): string {
  const date = toDate(value);
  return date
    ? timeOnly
        .format(date)
        .replace(/\bAM\b/, "am")
        .replace(/\bPM\b/, "pm")
    : empty;
}

const timeSeconds = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

// "2:02:17 pm", for lines of a call.
export function formatTimeSeconds(value: DateValue, empty = ""): string {
  const date = toDate(value);
  return date
    ? timeSeconds
        .format(date)
        .replace(/\bAM\b/, "am")
        .replace(/\bPM\b/, "pm")
    : empty;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function formatRelative(
  value: DateValue,
  empty = "Never",
  now = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return empty;
  const seconds = Math.round((date.getTime() - now) / 1000);
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit);
  }
  return "Just now";
}
