// What the call bar says when the phone cannot start.
export function phoneFailedWords(failure: string | null): string {
  return `${failure ?? "The phone could not start."} No calls are offered to you until it works.`;
}
