import { Money } from "@dcb/money/money";

// Invoicing is cents on the wire end to end; stub-view's dollar-based money()
// isn't reused here to avoid pulling the paystub decoder into the invoicing bundle.
/**
 * the payroll provider dollar figures added in whole cents, handed back as a dollar
 * number for money(). Adding the floats directly can drift: 0.1 + 0.2 is
 * 0.30000000000000004. A missing figure counts as zero.
 */
export function sumDollars(
  values: readonly (number | null | undefined)[],
): number {
  return Money.sum(
    values.map((v) => Money.fromDollarNumber(v ?? 0, { field: "provider" })),
  ).toDollarNumber();
}

export function moneyCents(cents: number | null | undefined): string {
  if (cents == null) return "-";
  return Money.fromCents(cents).format();
}

// `rateMilli` is rate × 10^4, printed at full 4dp to match the CSV export exactly.
export function formatRateMilli(rateMilli: number | null): string {
  if (rateMilli == null) return "-";
  const magnitude = Math.abs(rateMilli);
  const fraction = String(magnitude % 10_000).padStart(4, "0");
  return `${rateMilli < 0 ? "-" : ""}${Math.trunc(magnitude / 10_000)}.${fraction}`;
}
