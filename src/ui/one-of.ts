/**
 * The value from `values` that equals `raw`, typed as one of them, or
 * undefined when `raw` is none of them. A select, a tab list, a filter or
 * the address hands back plain text; this is how it becomes one of a fixed
 * set again without a cast.
 */
export function oneOf<const V extends string>(
  values: readonly V[],
  raw: string | undefined,
): V | undefined {
  return values.find((value) => value === raw);
}
