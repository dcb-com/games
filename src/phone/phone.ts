// Phone numbers, the one way DCB reads, checks and shows them.
//
// A number is stored, compared and sent as E.164: "+14155550191". People
// see it as "+1 (415) 555-0191". DCB accounts are US numbers, so a bare
// ten-digit number is taken as +1. A payee from the address book may be
// abroad, so a number that starts with "+" may carry any country code. It
// is kept as E.164 and shown as it is.
//
// These follow libphonenumber's rules for the US (the North American
// Numbering Plan), without its size: an area code never starts with 0 or 1.

// E.164: a plus, a country code that does not start with 0, and at most
// fifteen digits in all.
export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

// What may sit between the digits of a number someone typed or pasted:
// spaces, brackets, dots, dashes, and the invisible direction marks phones
// put around numbers in the address book.
const SEPARATORS = /[\s().\-\u200e\u200f\u202a-\u202e]/g;

// A US number's ten digits: an area code from 2 to 9, then seven more.
const US_NATIONAL = /^[2-9]\d{9}$/;

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value) && (!value.startsWith("+1") || isUs(value));
}

// Any way a person writes a number, as E.164. Null when it cannot be one.
//   "4155550191", "(415) 555-0191", "1-415-555-0191", "+1 415 555 0191"
//   all give "+14155550191".
export function toE164(raw: string): string | null {
  const compact = raw.trim().replace(SEPARATORS, "");
  const plus = compact.startsWith("+");
  const digits = plus ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;
  if (plus) return isE164(`+${digits}`) ? `+${digits}` : null;
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return US_NATIONAL.test(national) ? `+1${national}` : null;
}

// The ten digits after +1, for a field that shows "+1" on its own and for
// the bank, which takes US numbers that way. A number from abroad gives all
// its digits.
export function nationalDigits(e164: string): string {
  return isUs(e164) ? e164.slice(2) : e164.replace(/\D/g, "");
}

// A number to read: "+1 (415) 555-0191". A number from abroad stays in
// E.164. Anything that is not a whole number (a masked one, say) comes
// back as it was.
export function formatPhone(value: string): string {
  const e164 = toE164(value);
  if (!e164) return value;
  if (!isUs(e164)) return e164;
  return `+1 ${formatPhoneInput(e164.slice(2))}`;
}

// The digits a US phone field keeps, from whatever was typed or pasted:
// up to ten. A whole number pasted with its leading 1 ("+1 415 555 0191")
// loses the 1, which the field already shows.
export function phoneInputDigits(input: string): string {
  const d = input.replace(/\D/g, "");
  return (d.length === 11 && d.startsWith("1") ? d.slice(1) : d).slice(0, 10);
}

// A US number as it is typed, after a "+1" the field shows on its own:
// "(415", "(415) 555", "(415) 555-0191".
export function formatPhoneInput(input: string): string {
  const d = phoneInputDigits(input);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Enough of a number to know it, not enough to learn it:
// "+1 (***) ***-0191".
export function maskPhone(value: string): string {
  const last4 = value.replace(/\D/g, "").slice(-4);
  return `+1 (***) ***-${last4}`;
}

function isUs(e164: string): boolean {
  return e164.startsWith("+1") && US_NATIONAL.test(e164.slice(2));
}
