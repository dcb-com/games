// Keys for the console's shortcuts, written as short strings:
//
//   "e"        one key, with no modifier
//   "shift+p"  a key with Shift
//   "mod+k"    a key with ⌘ on a Mac and Ctrl elsewhere
//   "g n"      G, then N within a second
//   "?"        a printed character, whatever Shift it took to type
//
// Pure functions, so the matching is tested without a browser.

export interface Stroke {
  key: string;
  shift: boolean;
  mod: boolean;
}

interface KeyPress {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

// Characters typed with Shift on most layouts. Their Shift is part of the
// character, so "?" matches with or without it.
const PRINTED = new Set(["?", "/"]);

export function parseKeys(keys: string): Stroke[] {
  return keys
    .trim()
    .split(/\s+/)
    .map((part) => {
      const bits = part.toLowerCase().split("+");
      const key = bits[bits.length - 1] ?? "";
      return {
        key,
        shift: bits.includes("shift"),
        mod: bits.includes("mod"),
      };
    });
}

export function strokeMatches(
  stroke: Stroke,
  press: KeyPress,
  isMac: boolean,
): boolean {
  if (press.altKey) return false;
  const key = press.key.toLowerCase();
  if (key !== stroke.key) return false;
  const mod = isMac ? press.metaKey : press.ctrlKey;
  const otherMod = isMac ? press.ctrlKey : press.metaKey;
  if (otherMod) return false;
  if (mod !== stroke.mod) return false;
  if (PRINTED.has(stroke.key)) return true;
  return press.shiftKey === stroke.shift;
}

// How a key string is printed: "shift+p" as ["⇧", "P"], "g n" as two
// strokes, "mod+k" as ["⌘", "K"] or ["Ctrl", "K"].
export function keyLabels(keys: string, isMac: boolean): string[][] {
  return parseKeys(keys).map((s) => {
    const out: string[] = [];
    if (s.mod) out.push(isMac ? "⌘" : "Ctrl");
    if (s.shift) out.push("⇧");
    out.push(printKey(s.key));
    return out;
  });
}

function printKey(key: string): string {
  if (key === "enter") return "↵";
  if (key === "escape") return "Esc";
  if (key === "arrowdown") return "↓";
  if (key === "arrowup") return "↑";
  return key.length === 1 ? key.toUpperCase() : key;
}

// Whether a key press should be left alone because the person is typing,
// or a menu or dialog has the keys. Only "mod+" keys pass through a field.
export function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /mac|iphone|ipad/i.test(navigator.userAgent);
}
