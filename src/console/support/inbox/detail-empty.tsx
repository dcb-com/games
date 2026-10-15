import { Inbox } from "lucide-react";

import { Button } from "@dcb/ui/button";

import { DeskDefense } from "~/games/desk-defense/desk-defense";
import { consoleMoment } from "~/games/moments";
import { useMock } from "~/mock/store";
import { MINE_GUIDE } from "~/console/support/case-words";
import { useMe } from "~/console/lib/use-me";
import { useCommandMenu } from "~/console/support/commands/command-registry";
import { KeyHint } from "~/console/support/commands/key-hint";
import { usePickUpNext } from "~/console/support/inbox/use-pick-up-next";

const KEYS: [string, string][] = [
  ["j", "Next row"],
  ["k", "Previous row"],
  ["p", "Pick up"],
  ["r", "Reply"],
  ["n", "Note"],
  ["e", "Close case"],
  ["mod+k", "Search or run a command"],
];

// The detail pane when nothing is open: what to do next, and the keys used most. Pick up
// next itself sits in New's header, so it is not repeated here.
export function DetailEmpty({ view }: { view: "new" | "mine" }) {
  const next = usePickUpNext();
  const { setShortcutsOpen } = useCommandMenu();
  const waiting = next.count ?? 0;
  const moment = consoleMoment(useMock().agent);
  const me = useMe().data;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto p-6">
      {/* Not in the real console: a game for while the agent has
          nothing to do. */}
      {me && (
        <DeskDefense
          moment={moment}
          player={{ name: me.name, email: me.email }}
          className="max-w-xl shrink-0"
        />
      )}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <Inbox className="size-5" />
        </span>
        <div className="flex flex-col items-center gap-1.5">
          {view === "mine" ? (
            <>
              <p className="type-label">{MINE_GUIDE.title}</p>
              <p className="type-secondary">{MINE_GUIDE.body}</p>
            </>
          ) : next.count === null ? (
            <p className="type-secondary">Nothing is open.</p>
          ) : waiting > 0 ? (
            <>
              <p className="type-label">
                {waiting === 1
                  ? "1 item is waiting."
                  : `${waiting} items are waiting.`}
              </p>
              <p className="type-secondary">
                Pick up the oldest with <KeyHint keys="shift+p" />, or choose
                one and press <KeyHint keys="p" />.
              </p>
            </>
          ) : (
            <>
              <p className="type-label">Nothing is waiting.</p>
              <p className="type-secondary">
                New work shows up on the left as it comes in.
              </p>
            </>
          )}
        </div>
        <div className="border-border w-full border-t pt-4">
          <ul className="flex flex-col gap-1.5">
            {KEYS.map(([keys, label]) => (
              <li
                key={keys}
                className="flex items-center justify-between gap-4"
              >
                <span className="type-secondary">{label}</span>
                <KeyHint keys={keys} />
              </li>
            ))}
          </ul>
          <Button
            variant="link"
            size="xs"
            className="mt-2"
            onClick={() => setShortcutsOpen(true)}
          >
            All shortcuts
          </Button>
        </div>
      </div>
    </div>
  );
}
