// "C-1042", "c1042" or "1042" as a case number, or null. Case numbers
// start at 1000.
export function parseCaseNumber(text: string): number | null {
  const m = /^\s*c?-?\s*(\d{1,9})\s*$/i.exec(text);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}
