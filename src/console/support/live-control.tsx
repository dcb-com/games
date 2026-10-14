import { useState } from "react";
import {
  ChevronsUpDown,
  Loader2,
  PowerOff,
  Radio,
  Volume2,
} from "lucide-react";

import { cn, focusRing } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dcb/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dcb/ui/dropdown-menu";
import { FieldError } from "@dcb/ui/field";
import { Switch } from "@dcb/ui/switch";
import { toast } from "@dcb/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import { errorMessage } from "~/console/lib/error-messages";
import { useSound } from "~/console/support/alerts-and-sound";
import { usePhone } from "~/console/support/calls/phone";
import { useCommands } from "~/console/support/commands/command-registry";
import {
  endDialogWords,
  useHeldCasesLine,
  useHeldWork,
} from "~/console/support/held-work";
import { stateDotClass, stateLabel } from "~/console/support/live-words";
import { useLive, useNow } from "~/console/support/live-provider";
import {
  useEndLive,
  useGoLive,
  useRinger,
} from "~/console/support/use-live-actions";

// The live control at the top of the sidebar. It is the one place to go live, turn the ringer on or off,
// and end live. Not live, it is a Go live button; live, it shows the state
// and its clock, and opens a menu.
export function LiveControl({ compact }: { compact: boolean }) {
  const { live, isLoaded } = useLive();
  if (!isLoaded) {
    return <div className="bg-muted h-9 animate-pulse rounded-md" />;
  }
  return live ? (
    <LiveMenu compact={compact} />
  ) : (
    <GoLiveButton compact={compact} />
  );
}

function GoLiveButton({ compact }: { compact: boolean }) {
  const { goLive, waiting, error } = useGoLive();
  useCommands([
    {
      id: "live.go",
      label: "Go live",
      group: "Live",
      icon: Radio,
      keywords: ["start", "online", "passkey"],
      run: () => void goLive(),
    },
  ]);

  const button = (
    <Button
      size="sm"
      className={cn("w-full", compact && "size-9 px-0")}
      disabled={waiting}
      aria-label={compact ? "Go live" : undefined}
      onClick={() => void goLive()}
    >
      {waiting ? <Loader2 className="animate-spin" /> : <Radio />}
      {!compact && (waiting ? "Waiting for your passkey" : "Go live")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {!compact && (
        <p className="type-caption flex items-center gap-2 px-1">
          <span
            aria-hidden
            className={cn("size-2 rounded-full", stateDotClass(null))}
          />
          Not live
        </p>
      )}
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">Not live. Go live</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {error && !compact && (
        <p className="type-caption text-destructive px-1">{error}</p>
      )}
    </div>
  );
}

function LiveMenu({ compact }: { compact: boolean }) {
  const { live, serverNow } = useLive();
  const now = useNow(serverNow);
  const { setRinger, pending: ringerPending } = useRinger();
  const sound = useSound();
  const phoneFailed = usePhone().status === "failed";
  const [ending, setEnding] = useState(false);
  const end = useEndAction(() => setEnding(true));

  useCommands(
    live
      ? [
          {
            id: "live.ringer",
            label: live.ringer ? "Turn ringer off" : "Turn ringer on",
            group: "Live",
            keywords: ["calls", "phone", "ringer", "available"],
            disabledReason: phoneFailed
              ? "Off until the phone works"
              : undefined,
            run: () => void setRinger(!live.ringer),
          },
          ...(sound.blocked
            ? [
                {
                  id: "live.sound",
                  label: "Turn on sound",
                  group: "Live" as const,
                  icon: Volume2,
                  run: sound.turnOn,
                },
              ]
            : []),
          {
            id: "live.end",
            label: "End live",
            group: "Live",
            icon: PowerOff,
            keywords: ["stop", "offline", "leave"],
            disabledReason: end.onCall ? "Finish the call first" : undefined,
            run: end.start,
          },
        ]
      : [],
  );

  if (!live) return null;
  const label = stateLabel(live, now);

  const trigger = (
    <button
      type="button"
      aria-label={compact ? label : undefined}
      className={cn(
        focusRing,
        "border-border bg-card hover:bg-secondary flex h-9 w-full items-center gap-2 rounded-md border px-2.5 text-left transition-colors",
        compact && "justify-center px-0",
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", stateDotClass(live))}
      />
      {!compact && (
        <>
          <span className="type-label min-w-0 flex-1 truncate tabular-nums">
            {label}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4" />
        </>
      )}
    </button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", stateDotClass(live))}
            />
            <span className="tabular-nums">{label}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={ringerPending || phoneFailed}
            onSelect={(e) => {
              // The menu stays open, so the switch is seen to move.
              e.preventDefault();
              void setRinger(!live.ringer);
            }}
            className="items-start"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="type-label">Ringer</span>
              <span className="type-caption">
                {phoneFailed
                  ? "Off until the phone works. Use Try again in the call bar."
                  : live.ringer
                    ? "On: calls are offered to you."
                    : "Off: no calls are offered. Case work goes on."}
              </span>
            </span>
            <Switch
              checked={live.ringer}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none mt-0.5"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={end.onCall} onSelect={end.start}>
            <PowerOff className="size-4" />
            <span className="flex-1">End live</span>
            {end.onCall && (
              <span className="type-caption">Finish the call first</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EndLiveDialog open={ending} onOpenChange={setEnding} />
    </>
  );
}

// End live goes at once when the person holds nothing; otherwise a dialog
// says what goes back first. Never during a call.
function useEndAction(openDialog: () => void) {
  const { live } = useLive();
  const held = useHeldWork();
  const { end } = useEndLive();
  const onCall = live?.phase === "on_call";
  return {
    onCall,
    start: () => {
      if (onCall) return;
      if (endDialogWords(held)) {
        openDialog();
        return;
      }
      end().catch((err: unknown) =>
        toast.error(errorMessage(err, "We could not end live. Try again.")),
      );
    },
  };
}

function EndLiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const held = useHeldWork();
  const heldCases = useHeldCasesLine();
  const { end, pending } = useEndLive();
  const [error, setError] = useState<string | null>(null);
  const goesBack = endDialogWords(held);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>End live?</DialogTitle>
          <DialogDescription>
            {goesBack}
            {heldCases && ` ${heldCases}`}
          </DialogDescription>
        </DialogHeader>
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <Button
            variant="outline"
            autoFocus
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Stay live
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              setError(null);
              end()
                .then(() => onOpenChange(false))
                .catch((err: unknown) =>
                  setError(
                    errorMessage(err, "We could not end live. Try again."),
                  ),
                );
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            End live
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
