import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@dcb/ui";
import { Input } from "@dcb/ui/input";

// Shorter than `useDebounced`'s 300 default since there's no network round trip to hide.
export const SEARCH_DEBOUNCE_MS = 200;

// Without `debounceMs`, fully controlled and `onChange` fires per keystroke.
// With it, renders a local draft while typing and fires `onChange` once
// typing stops; only set it when the consumer's own render is expensive.
export function TableSearchInput({
  value,
  onChange,
  placeholder,
  size = "default",
  className,
  debounceMs,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  debounceMs?: number;
  "aria-label"?: string;
}) {
  const sm = size === "sm";

  // null = idle, `value` flows straight through; non-null = typing, draft wins.
  const [draft, setDraft] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Parent moved `value` out from under us (filter reset, remount, URL
  // change); drop any draft. Our own commits never land here.
  if (debounceMs && value !== seen) {
    setSeen(value);
    setDraft(null);
  }

  useEffect(() => {
    if (draft === null) clearTimeout(timer.current);
  }, [draft]);

  // Cancel, don't flush, on unmount: whatever unmounts us takes focus first
  // and blur already flushes.
  useEffect(() => () => clearTimeout(timer.current), []);

  function fire(s: string) {
    setDraft(null);
    // Backspaced back to where it started: nothing to re-filter.
    if (s !== value) onChange(s);
  }

  function change(s: string) {
    if (!debounceMs) {
      onChange(s);
      return;
    }
    setDraft(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fire(s), debounceMs);
  }

  function flush() {
    if (draft === null) return;
    clearTimeout(timer.current);
    fire(draft);
  }

  function clear() {
    // Empties the box now, not in `debounceMs`.
    clearTimeout(timer.current);
    setDraft(null);
    onChange("");
  }

  const shown = draft ?? value;

  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn(
          "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2",
          sm ? "left-2 size-3.5" : "left-3 size-4",
        )}
      />
      <Input
        value={shown}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => e.key === "Enter" && flush()}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          sm ? "h-7 pl-7 text-xs" : "pl-9",
          shown && (sm ? "pr-7" : "pr-9"),
        )}
      />
      {shown && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className={cn(
            "text-muted-foreground hover:text-foreground absolute top-1/2 -translate-y-1/2",
            sm ? "right-2" : "right-3",
          )}
        >
          <X className={sm ? "size-3.5" : "size-4"} />
        </button>
      )}
    </div>
  );
}
