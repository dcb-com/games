import { useState } from "react";

import type { Command } from "~/console/support/commands/command-registry";
import { useCommands } from "~/console/support/commands/command-registry";

// The keys on a list: J and K
// move the selection through the rows on screen and scroll it into view,
// Enter opens the selected row where a list allows it, and P picks it up.
// Each goes through the command registry, so a key and a button run the
// same code.

interface RowAction {
  // Whether the row with this id allows the action.
  can: (id: string) => boolean;
  run: (id: string) => void;
}

// What Enter does by itself on a focused control. The registry takes the
// key before the browser does, so the list hands it back.
const NATIVE_ENTER = "button, a[href], [role=button], [role=link], summary";

export function useListKeys({
  ids,
  open,
  pickUp,
}: {
  // The rows on screen, top to bottom, leaving out rows that are folding
  // away.
  ids: readonly string[];
  open?: RowAction;
  pickUp?: RowAction;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected !== null && ids.includes(selected) ? selected : null;

  function select(id: string) {
    setSelected(id);
    // One list shows at a time, so the row's id is unique on the page.
    const row = document.querySelector(`[data-list-row="${CSS.escape(id)}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }

  function move(step: 1 | -1) {
    if (ids.length === 0) return;
    const at = current === null ? -1 : ids.indexOf(current);
    const next =
      at === -1
        ? step === 1
          ? 0
          : ids.length - 1
        : Math.min(ids.length - 1, Math.max(0, at + step));
    const id = ids[next];
    if (id !== undefined) select(id);
  }

  const commands: Command[] = [
    {
      id: "list.next",
      label: "Next row",
      group: "List",
      keys: "j",
      keyOnly: true,
      run: () => move(1),
    },
    {
      id: "list.previous",
      label: "Previous row",
      group: "List",
      keys: "k",
      keyOnly: true,
      run: () => move(-1),
    },
  ];
  if (open) {
    commands.push({
      id: "list.open",
      label: "Open the row",
      group: "List",
      keys: "enter",
      keyOnly: true,
      run: () => {
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && focused.matches(NATIVE_ENTER)) {
          focused.click();
          return;
        }
        if (current !== null && open.can(current)) open.run(current);
      },
    });
  }
  if (pickUp) {
    commands.push({
      id: "list.pickUp",
      label: "Pick up",
      group: "List",
      keys: "p",
      disabledReason:
        current === null
          ? "Choose a row first"
          : pickUp.can(current)
            ? undefined
            : "Nothing to pick up on this row",
      run: () => {
        if (current !== null && pickUp.can(current)) pickUp.run(current);
      },
    });
  }
  useCommands(commands);

  return { selected: current, select };
}
