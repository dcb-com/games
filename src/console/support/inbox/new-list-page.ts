// New draws its first rows only, a page at a time, because a long backlog
// drawn all at once froze the console. "Show more" draws the next page.
// The server still sends every row, so the count and "Pick up next" see
// all of them.

export const NEW_PAGE = 100;

// "Showing 100 of 14,664, oldest first.", or null when every row is shown.
export function moreWords(shown: number, total: number): string | null {
  if (shown >= total) return null;
  return `Showing ${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}, oldest first.`;
}
