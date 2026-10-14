import { useState } from "react";
import { ArrowRightLeft, Check, Loader2 } from "lucide-react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@dcb/ui/command";
import { Input } from "@dcb/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@dcb/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import {
  teamDotClass,
  teamStateWords,
  TRANSFER_NOTE_MAX,
  transferChoices,
} from "~/console/support/calls/call-rules";
import type { TeamRow } from "~/console/support/calls/call-rules";
import type { Thrown } from "~/console/lib/error-messages";
import { errorMessage } from "~/console/lib/error-messages";

// Who else is live, made up. The real list comes from the server.
const TEAM: TeamRow[] = [
  { staffId: "s1", name: "Blake Sample", state: "available", phase: "free" },
  { staffId: "s2", name: "Drew Example", state: "busy", phase: "on_call" },
];

// Transfer: pick a live agent, shown with
// their state, add a one-line note, and send. A person who is not
// available can still be picked; the call then goes to the next free
// agent, ahead of new callers.
export function TransferPopover({
  disabled,
  pending,
  onTransfer,
}: {
  disabled: boolean;
  pending: boolean;
  onTransfer: (
    to: { staffId: string; name: string },
    note: string,
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<{
    staffId: string;
    name: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const agents: {
    data: TeamRow[] | undefined;
    isPending: boolean;
    isError: boolean;
    error: Thrown;
  } = { data: TEAM, isPending: false, isError: false, error: null };

  // Nobody to hand it to: the box says so and offers nothing to send.
  const nobody = agents.data?.length === 0;

  function close() {
    setOpen(false);
    setChosen(null);
    setNote("");
  }

  async function send() {
    // Enter in the note box would otherwise send it again while it is out.
    if (!chosen || pending) return;
    if (await onTransfer(chosen, note)) close();
  }

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={disabled}
              aria-label="Transfer"
            >
              <ArrowRightLeft className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Transfer</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-2">
        <Command className="rounded-lg">
          <CommandList className="max-h-64">
            {agents.isPending && (
              <div className="type-secondary px-3 py-2">Loading…</div>
            )}
            {agents.isError && (
              <div className="type-secondary px-3 py-2">
                {errorMessage(agents.error, "We could not load who is live.")}
              </div>
            )}
            {agents.data && <CommandEmpty>Nobody else is live.</CommandEmpty>}
            {transferChoices(agents.data ?? []).map(({ row, nextFree }) => (
              <CommandItem
                key={row.staffId}
                value={`${row.name} ${row.staffId}`}
                onSelect={() =>
                  setChosen({ staffId: row.staffId, name: row.name })
                }
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    teamDotClass(row.state),
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.name}</span>
                  <span className="type-caption block">
                    {teamStateWords(row)}
                    {nextFree && " · Will go to next free agent"}
                  </span>
                </span>
                {chosen?.staffId === row.staffId && (
                  <Check className="size-4" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {nobody ? (
          <div className="flex justify-end p-2">
            <Button variant="outline" size="sm" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            <Input
              value={note}
              maxLength={TRANSFER_NOTE_MAX}
              placeholder="A note for them (optional)"
              aria-label="Note"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!chosen || pending}
                onClick={() => void send()}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Transfer
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
