import { Money, MoneyFormatError } from "@dcb/money/money";

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// xxx-xx-xxxx; non-digits dropped, anything past 9 digits ignored.
export function formatSsn(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

// Numbers the SSA says were never issued, though they look valid: one printed
// on a sample card in wallets, one in an old ad, and the one every form shows
// as its example.
const KNOWN_INVALID_SSNS = new Set(["078051120", "219099999", "123456789"]);

// SSA rules: area != 000/666/900-999, group != 00, serial != 0000, and none of
// the known sample numbers. Expects exactly 9 digits; length is checked
// separately by the caller.
export function isValidSsn(digits: string): boolean {
  if (KNOWN_INVALID_SSNS.has(digits)) return false;
  const area = digits.slice(0, 3);
  if (area === "000" || area === "666" || area.startsWith("9")) return false;
  if (digits.slice(3, 5) === "00") return false;
  if (digits.slice(5) === "0000") return false;
  return true;
}

// "$1,234.567" -> "1234.56".
export function cleanMoney(input: string): string {
  const s = input.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  const intPart = s.slice(0, dot);
  const decPart = s
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${intPart}.${decPart}`;
}

// Preserves an in-progress decimal ("1234." / "1234.5") so the user can keep typing.
export function formatMoney(value: string): string {
  if (!value) return "";
  const hasDot = value.includes(".");
  const [intPart = "", decPart = ""] = value.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDot ? `${grouped}.${decPart}` : grouped;
}

// Normalizes to a fixed two-decimal value on blur ("1234.5" -> "1234.50",
// "007." -> "7.00"). Text that still isn't an amount is left as typed, for
// the field's own check to name.
export function normalizeMoney(value: string): string {
  if (!value) return "";
  const typed = value.replace(/\.$/, "").replace(/^0+(?=\d)/, "");
  try {
    return Money.parseInput(typed).toDollarString();
  } catch (e) {
    if (e instanceof MoneyFormatError) return value;
    throw e;
  }
}
