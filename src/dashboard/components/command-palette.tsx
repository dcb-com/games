import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandInput,
  CommandList,
} from "@dcb/ui/command";

// The search box at the top of the nav. The real one searches every page,
// person and pay run; this copy opens the same dialog with nothing in it.
// Cmd+K or Ctrl+K opens it from anywhere.

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iP(hone|ad|od)/.test(navigator.userAgent);

/** What the hint on the button reads, and what the person has to press. */
const COMMAND_HOTKEY_HINT = IS_MAC ? "⌘K" : "Ctrl K";

function useHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      onOpen();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Every page in the app, and for admins people and pay runs. Arrow keys move, Enter opens."
    >
      <Command shouldFilter={false} label="Search pages">
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages, people and pay runs…"
        />
        <CommandList>
          <CommandEmpty>
            <span className="type-label block">Search is not in this mock</span>
          </CommandEmpty>
        </CommandList>
        <CommandFooter>
          <span>Pages, people and pay runs</span>
          <span className="truncate">Esc closes</span>
        </CommandFooter>
      </Command>
    </CommandDialog>
  );
}

export function CommandPaletteButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  useHotkey(() => setOpen((was) => !was));

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Search pages"
        className={cn("text-muted-foreground gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden text-xs tracking-widest sm:inline">
          {COMMAND_HOTKEY_HINT}
        </span>
      </Button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
