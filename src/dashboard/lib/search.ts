/**
 * The search params as the router hands them to `validateSearch` and
 * `useSearch({ strict: false })`, before any route has checked them. The
 * functions below are what check them.
 */
// oxlint-disable-next-line dcb/no-unknown -- the router's own type for search params nobody has checked yet
export type RawSearch = Record<string, unknown>;

/** One unchecked search value. */
export type RawSearchValue = RawSearch[string];

/**
 * One value from the query string as text.
 *
 * The router reads a query string with a JSON-aware parser, so a value does
 * not always arrive as a string: `?role=123` reads back as the number 123 and
 * a value that looks like JSON reads back as an object. A route that expects
 * an id or a name reads it through this, so an id that happens to be all
 * digits is not dropped for being the wrong type.
 */
export function searchText(value: RawSearchValue): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // An object or a list is not an id; a page asking for text gets nothing.
  return undefined;
}

/**
 * One search value as a whole number, or nothing when it is not one or falls
 * outside `allowed`. It is how a page number and a page size are read: a junk
 * `?pageSize=5000` asks the server for five thousand rows, so a value that is
 * not one of the sizes on offer is no value at all.
 */
export function searchWholeNumber(
  value: RawSearchValue,
  allowed?: readonly number[],
): number | undefined {
  const text = searchText(value);
  if (text === undefined || text === "") return undefined;
  const whole = Number(text);
  if (!Number.isInteger(whole) || whole < 1) return undefined;
  if (allowed && !allowed.includes(whole)) return undefined;
  return whole;
}
