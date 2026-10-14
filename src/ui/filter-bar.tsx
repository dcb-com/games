import { ChevronDown, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dcb/ui/dropdown-menu";
import { Input } from "@dcb/ui/input";

// The pieces of a list's filter bar, shared by the staff console and the
// dashboard so every list filters the same way: a search box, then a row of
// small menus, each naming its filter and what it is set to, in the primary
// color while it narrows the list. Each control is told its value and says
// when it changes; where the value lives (usually the address) is the page's
// business.

/**
 * One filter: a small button that names the filter and its setting, and
 * opens a menu of choices.
 */
export function FilterMenu({
  label,
  value,
  active,
  children,
  className,
}: {
  label: string;
  /** What the filter is set to, in words. */
  value: string;
  /** True while the filter narrows the list. */
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="xs"
          className={cn(
            "max-w-72 font-medium",
            active && "text-primary",
            className,
          )}
        >
          <span className="type-caption shrink-0">{label}</span>
          <span className="truncate">{value}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ANY = "any";

/**
 * A filter that picks one of a fixed list. `fallback` is the value the
 * address leaves out; a filter with none offers "Any" instead. Picking the
 * fallback, or "Any", clears it.
 */
export function ChoiceFilter<V extends string>({
  label,
  values,
  words,
  value,
  fallback,
  anyLabel = "Any",
  onChange,
}: {
  label: string;
  values: readonly V[];
  words: Record<V, string>;
  value: V | undefined;
  fallback?: V;
  anyLabel?: string;
  onChange: (value: V | undefined) => void;
}) {
  const shown = value ?? fallback;
  return (
    <FilterMenu
      label={label}
      value={shown ? words[shown] : anyLabel}
      active={value !== undefined && value !== fallback}
    >
      <DropdownMenuRadioGroup
        value={shown ?? ANY}
        onValueChange={(v) => {
          const picked = values.find((x) => x === v);
          onChange(picked === fallback ? undefined : picked);
        }}
      >
        {!fallback && (
          <DropdownMenuRadioItem value={ANY}>{anyLabel}</DropdownMenuRadioItem>
        )}
        {values.map((v) => (
          <DropdownMenuRadioItem key={v} value={v}>
            {words[v]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </FilterMenu>
  );
}

export interface FilterOptionGroup<V extends string> {
  /** A heading over the group, when there is more than one. */
  label?: string;
  options: readonly { value: V; label: string; count?: number }[];
}

/**
 * A filter that picks any number of choices, in groups. The menu stays open
 * while choices are ticked; nothing ticked means any.
 */
export function MultiChoiceFilter<V extends string>({
  label,
  groups,
  value,
  anyLabel = "Any",
  onChange,
  extra,
}: {
  label: string;
  groups: readonly FilterOptionGroup<V>[];
  value: readonly V[];
  anyLabel?: string;
  onChange: (value: V[]) => void;
  /** More items under the choices, such as a checkbox of its own. */
  extra?: ReactNode;
}) {
  const options = groups.flatMap((g) => g.options);
  const picked = options.filter((o) => value.includes(o.value));
  const words =
    picked.length === 0
      ? anyLabel
      : picked.length <= 2
        ? picked.map((o) => o.label).join(", ")
        : `${picked.length} chosen`;
  return (
    <FilterMenu label={label} value={words} active={picked.length > 0}>
      {groups.map((group, i) => (
        <div key={group.label ?? i}>
          {i > 0 && <DropdownMenuSeparator />}
          {group.label && (
            <DropdownMenuLabel className="type-caption">
              {group.label}
            </DropdownMenuLabel>
          )}
          {group.options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={value.includes(o.value)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) =>
                onChange(
                  on
                    ? options
                        .map((x) => x.value)
                        .filter((v) => v === o.value || value.includes(v))
                    : value.filter((v) => v !== o.value),
                )
              }
            >
              <span className="flex-1">{o.label}</span>
              {o.count !== undefined && (
                <span className="type-caption tabular-nums">{o.count}</span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      ))}
      {extra && (
        <>
          <DropdownMenuSeparator />
          {extra}
        </>
      )}
      {picked.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={() => onChange([])}
          >
            Clear
          </DropdownMenuCheckboxItem>
        </>
      )}
    </FilterMenu>
  );
}

/**
 * The search box at the head of a filter bar. `live` searches as the person
 * types, after a short pause; otherwise the search runs on Enter, for a list
 * where every search is recorded.
 */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  label,
  live = false,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter, after `onChange`, with the text in the box. */
  onSubmit?: (value: string) => void;
  placeholder: string;
  /** What a screen reader calls the box. */
  label: string;
  live?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(value);
  // The address can change the search from outside (a view, Clear), and the
  // box follows it, unless the person is still typing what it now says.
  const sent = useRef(value);
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (!live) return;
    const next = text.trim();
    if (next === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = next;
      onChange(next);
    }, 250);
    return () => clearTimeout(timer);
  }, [live, text, onChange]);

  const submit = (next: string) => {
    sent.current = next;
    onChange(next);
  };

  return (
    <form
      role="search"
      className={cn("relative w-full sm:w-64", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(text.trim());
        onSubmit?.(text.trim());
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && text) {
            e.preventDefault();
            setText("");
            submit("");
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="h-7 rounded-md pr-8 pl-9 text-xs [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear the search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
          onClick={() => {
            setText("");
            submit("");
          }}
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

/** A filter that is set some other way, such as from a link, with a way off. */
export function FilterChip({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="bg-secondary text-secondary-foreground type-caption inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-3 font-medium">
      {children}
      <button
        type="button"
        aria-label="Remove this filter"
        className="hover:text-foreground rounded-full p-0.5"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/** A ready-made search, in the row of views above a filter bar. */
export function FilterView({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="xs"
      variant={active ? "secondary" : "ghost"}
      className={cn(active && "text-primary")}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
