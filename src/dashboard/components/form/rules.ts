import { EMAIL_RE, isValidSsn } from "~/dashboard/components/form/format";

// A rule returns a message when the value is invalid, or undefined when it is
// fine. Rules other than `required` treat an empty value as valid so they
// compose with optional fields: rules(optional ? false : required("X"), email).
export type Rule<T = string> = (value: T) => string | undefined;

// Composes rules into TanStack field validators. The first failing rule wins.
//
// The rules run on *every change*, never on blur. Errors are therefore always
// current, so an error clears the instant the value becomes valid and the
// submit button never waits for the user to leave the field. Whether an error
// is *shown* is decided separately (see useShownError in form.tsx): only after
// the field has been blurred or a submit has been attempted. Running the same
// rule on blur as well would reintroduce the stale-error problem, because
// TanStack keeps one error slot per trigger and only the same trigger can
// clear it.
//
// Falsy entries are skipped, so conditional rules read naturally:
//   rules(isUs && required("SSN"), ssn)
export function rules<T = string>(
  ...list: (Rule<T> | false | null | undefined)[]
): { onChange: (ctx: { value: T }) => string | undefined } | undefined {
  const active = list.filter((r): r is Rule<T> => typeof r === "function");
  if (active.length === 0) return undefined;
  return {
    onChange: ({ value }) => {
      for (const rule of active) {
        const message = rule(value);
        if (message) return message;
      }
      return undefined;
    },
  };
}

export const required =
  (label: string, message = `${label} is required`): Rule =>
  (v) =>
    v.trim() ? undefined : message;

export const minLength =
  (n: number, message: string): Rule =>
  (v) =>
    !v || v.length >= n ? undefined : message;

// Exactly n digits, ignoring separators; for codes and phone numbers.
export const digits =
  (n: number, message: string): Rule =>
  (v) =>
    !v.trim() || v.replace(/\D/g, "").length === n ? undefined : message;

export const pattern =
  (re: RegExp, message: string): Rule =>
  (v) =>
    !v.trim() || re.test(v.trim()) ? undefined : message;

export const email: Rule = (v) => {
  const t = v.trim();
  if (!t) return undefined;
  return EMAIL_RE.test(t) ? undefined : "Enter a valid email address";
};

// Positive number, for amounts, rates, and hours held as strings.
export const positive =
  (message: string): Rule =>
  (v) => {
    if (!v.trim()) return undefined;
    return Number(v) > 0 ? undefined : message;
  };

// Zero or more, for amounts that may legitimately be nothing.
export const nonNegative =
  (message: string): Rule =>
  (v) => {
    if (!v.trim()) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? undefined : message;
  };

// Expects the xxx-xx-xxxx display format (see formatSsn); digits are extracted.
export const ssn: Rule = (v) => {
  const digits = v.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length !== 9) return "Enter a valid 9-digit SSN";
  if (!isValidSsn(digits)) return "This isn’t a valid SSN";
  return undefined;
};

export const countryCode: Rule = (v) =>
  v.trim().length === 2 ? undefined : "Enter a 2-letter country code";
