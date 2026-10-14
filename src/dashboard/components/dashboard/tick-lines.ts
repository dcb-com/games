/** Splits a label into at most two lines of `room` characters. */
export function tickLines(name: string, room: number): string[] {
  if (name.length <= room) return [name];
  const words = name.split(" ");
  let first = "";
  let i = 0;
  while (i < words.length) {
    const next = first ? `${first} ${words[i]}` : (words[i] ?? "");
    if (next.length > room) break;
    first = next;
    i += 1;
  }
  // One word longer than the line: cut it rather than leave the line empty.
  if (!first) return [`${name.slice(0, room - 1).trimEnd()}…`];
  const rest = words.slice(i).join(" ");
  const second =
    rest.length > room ? `${rest.slice(0, room - 1).trimEnd()}…` : rest;
  return [first, second];
}
