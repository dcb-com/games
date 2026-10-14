import { Inbox } from "lucide-react";

import { useCommands } from "~/console/support/commands/command-registry";
import { usePickUpNext } from "~/console/support/inbox/use-pick-up-next";

// "Pick up next" (Shift P) works whichever list is showing, so every list
// calls this. The button in New's header runs the same code.
export function usePickUpNextCommand() {
  const next = usePickUpNext();
  useCommands([
    {
      id: "work.pickUpNext",
      label: "Pick up next",
      group: "Work",
      keys: "shift+p",
      icon: Inbox,
      keywords: ["oldest", "new"],
      disabledReason: next.canPickUp
        ? undefined
        : next.pending
          ? "Picking up…"
          : "Nothing is waiting in New",
      run: next.pickUpNext,
    },
  ]);
  return next;
}
