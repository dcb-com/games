export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
}

// RFC 4180: a field carrying a comma, quote or line break is wrapped in
// quotes and its own quotes doubled.
function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Builds an RFC 4180 CSV string, header row first. Numbers go out as plain
 * numbers, not localized strings: the file is for a spreadsheet, which would
 * read a formatted amount as text.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => c.header);
  const lines = rows.map((row) => columns.map((c) => c.value(row)));
  return [header, ...lines]
    .map((line) => line.map(csvCell).join(","))
    .join("\r\n");
}
