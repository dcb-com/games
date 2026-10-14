import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  Command as CommandRoot,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@dcb/ui/command";

import type { Command } from "~/console/support/commands/command-registry";
import { useIsAdmin } from "~/console/lib/use-me";
import {
  GROUP_ORDER,
  useCommandMenu,
} from "~/console/support/commands/command-registry";
import { KeyHint } from "~/console/support/commands/key-hint";
import { parseCaseNumber } from "~/console/support/commands/case-number";
import { useLive } from "~/console/support/live-provider";

// The command menu: every command
// registered from where the person is, grouped, each with its key. It
// reads only what the page already holds; the one thing typed text adds is
// "Find C-1042 in All cases" for an admin, which runs All cases' own
// logged search.
export function CommandMenu() {
  const { menuOpen, setMenuOpen, all } = useCommandMenu();
  const [search, setSearch] = useState("");
  const isAdmin = useIsAdmin();
  const { live } = useLive();

  // Read the registry when the menu opens; it does not change underneath.
  const groups = useMemo(() => {
    if (!menuOpen) return [];
    const listed = all().filter((c) => !c.keyOnly);
    return GROUP_ORDER.map((group) => ({
      group,
      commands: listed.filter((c) => c.group === group),
    })).filter((g) => g.commands.length > 0);
  }, [menuOpen, all]);

  const number = parseCaseNumber(search);
  const canFind = isAdmin && live !== null && number !== null;

  function run(c: Command) {
    if (c.disabledReason) return;
    setMenuOpen(false);
    setSearch("");
    // After the menu has closed, so a dialog the command opens gets focus.
    setTimeout(c.run, 0);
  }

  return (
    <CommandDialog
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (!open) setSearch("");
      }}
      title="Command menu"
      description="Search for an action or a page and press Enter."
    >
      <CommandRoot label="Command menu" loop>
        <CommandInput
          placeholder="Type an action or a page…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>
          {canFind && (
            <CommandGroup heading="Find">
              <CommandItem
                value={`find case ${search}`}
                onSelect={() => {
                  setMenuOpen(false);
                  setSearch("");
                  // The real menu opens All cases here. This mock has no
                  // All cases page.
                }}
              >
                <Search className="size-4" />
                Find C-{number} in All cases
              </CommandItem>
            </CommandGroup>
          )}
          {groups.map(({ group, commands }) => (
            <CommandGroup key={group} heading={group}>
              {commands.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.label} ${c.group} ${(c.keywords ?? []).join(" ")}`}
                  disabled={c.disabledReason !== undefined}
                  onSelect={() => run(c)}
                >
                  {c.icon && <c.icon className="size-4" />}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.disabledReason ? (
                    <CommandShortcut className="tracking-normal">
                      {c.disabledReason}
                    </CommandShortcut>
                  ) : (
                    c.keys && (
                      <CommandShortcut className="tracking-normal">
                        <KeyHint keys={c.keys} />
                      </CommandShortcut>
                    )
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <CommandFooter>
          <span>↑ ↓ to move, ↵ to run, Esc to close</span>
          <span>
            <KeyHint keys="?" /> all shortcuts
          </span>
        </CommandFooter>
      </CommandRoot>
    </CommandDialog>
  );
}
