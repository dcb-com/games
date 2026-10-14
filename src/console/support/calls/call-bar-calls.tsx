import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  Loader2,
  MicOff,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneOff,
} from "lucide-react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import { Kbd } from "@dcb/ui/kbd";
import { Separator } from "@dcb/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import type { CallBarData } from "~/console/support/calls/call-rules";
import type { LiveView } from "~/console/support/live-words";
import {
  callBarLink,
  callerNumber,
  remainingFraction,
  shouldBump,
  waitClass,
  WRAP_UP_MS,
} from "~/console/support/calls/call-rules";
import { retryPhone, usePhone } from "~/console/support/calls/phone";
import { claimPhone } from "~/console/support/calls/phone-tab";
import { phoneFailedWords } from "~/console/support/calls/ringer-follows-phone";
import { HangUpPopover } from "~/console/support/calls/hang-up-popover";
import { TransferPopover } from "~/console/support/calls/transfer-popover";
import { useCallActions } from "~/console/support/calls/use-call-actions";
import { useCommands } from "~/console/support/commands/command-registry";
import { formatClock } from "~/console/support/live-words";
import { useLive, useNow } from "~/console/support/live-provider";

// The calls part of the call bar: the
// waiting calls, the offer, the call in progress and wrap-up. In a tab that
// does not hold the phone, one line instead. The phone itself, the ring and
// the other alerts for an offer run on every page from `PhoneHost`
// (calls/phone-host.tsx).

export function CallBarCalls({
  live,
  owns,
  data,
}: {
  live: LiveView;
  owns: boolean | null;
  data: CallBarData | undefined;
}) {
  if (owns === false) return <OtherTab live={live} />;
  if (owns === null) return <div className="min-w-0 flex-1" />;
  return <PhoneCalls live={live} data={data} />;
}

function OtherTab({ live }: { live: LiveView }) {
  const onCall = live.phase === "on_call";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="type-secondary truncate">
        The phone is open in another tab.
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button gets no pointer events; the span does. */}
          <span tabIndex={onCall ? 0 : undefined}>
            <Button
              variant="outline"
              size="xs"
              disabled={onCall}
              onClick={claimPhone}
            >
              Use the phone here
            </Button>
          </span>
        </TooltipTrigger>
        {onCall && (
          <TooltipContent side="bottom">Finish the call first.</TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}

function PhoneCalls({
  live,
  data,
}: {
  live: LiveView;
  data: CallBarData | undefined;
}) {
  const { serverNow } = useLive();
  const now = useNow(serverNow);
  const phone = usePhone();
  const actions = useCallActions();

  if (data?.offer) {
    return (
      <Offer
        offer={data.offer}
        totalMs={data.offerSeconds * 1000}
        now={now}
        actions={actions}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {data && (
        <WaitingCalls
          waiting={data.waiting}
          now={now}
          available={live.state === "available"}
          onCall={!!data.call}
        />
      )}
      {(data?.call ?? data?.wrapUp) && (
        <Separator orientation="vertical" className="h-5" />
      )}
      {data?.call && (
        <CallInProgress call={data.call} now={now} actions={actions} />
      )}
      {data?.wrapUp && (
        <WrapUp wrapUp={data.wrapUp} now={now} actions={actions} />
      )}
      {phone.status === "failed" && (
        <>
          <span
            className="type-caption text-destructive min-w-0 truncate"
            title={phoneFailedWords(phone.failure)}
          >
            {phoneFailedWords(phone.failure)}
          </span>
          <Button size="xs" variant="outline" onClick={retryPhone}>
            Try again
          </Button>
        </>
      )}
    </div>
  );
}

function prefersLessMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const BUMP_CLASS = "bg-warning";

// "No calls waiting", or "3 waiting · oldest 0:42" with the wait in its
// color. It links to Calls.
function WaitingCalls({
  waiting,
  now,
  available,
  onCall,
}: {
  waiting: CallBarData["waiting"];
  now: number;
  available: boolean;
  onCall: boolean;
}) {
  const before = useRef<number | null>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const count = waiting.count;

  useEffect(() => {
    const rose = shouldBump({
      before: before.current,
      count,
      available,
      onCall,
      reducedMotion: prefersLessMotion(),
    });
    before.current = count;
    const el = countRef.current;
    if (!rose || !el) return;
    // One soft wash: the class goes on, and the color fades out again.
    el.classList.add(BUMP_CLASS);
    const id = setTimeout(() => el.classList.remove(BUMP_CLASS), 1_200);
    return () => {
      clearTimeout(id);
      el.classList.remove(BUMP_CLASS);
    };
  }, [count, available, onCall]);

  const oldestMs = waiting.oldestSince
    ? now - waiting.oldestSince.getTime()
    : null;

  return (
    // A link to Calls in the real console.
    <span className="type-secondary hover:text-foreground flex shrink-0 items-center gap-2 rounded-md">
      {count > 0 && <Phone className="size-4" />}
      <span
        ref={countRef}
        className={cn(
          "rounded px-1 tabular-nums transition-colors duration-700",
          count > 0 && "text-foreground",
        )}
      >
        {count > 0 ? `${count} waiting` : "No calls waiting"}
      </span>
      {count > 0 && oldestMs !== null && (
        <span className={cn("tabular-nums", waitClass(oldestMs))}>
          · oldest {formatClock(oldestMs)}
        </span>
      )}
    </span>
  );
}

// A 2px bar along the bottom of the call bar, draining to nothing. The
// call bar is the positioned box it sits in.
function DrainingBar({ fraction }: { fraction: number }) {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5">
      <div
        className="bg-primary h-full transition-[width] duration-1000 ease-linear"
        // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}

// The call's case, or "Not in a case yet" leading to the call's own page,
// where the agent verifies the caller and puts the call in a case.
function CaseLink(args: Parameters<typeof callBarLink>[0]) {
  const { label, inCase, place } = callBarLink(args);
  if (!place) {
    return <span className="type-secondary whitespace-nowrap">{label}</span>;
  }
  // A link to the case in the real console.
  return (
    <span
      className={cn(
        "text-primary whitespace-nowrap underline-offset-4 hover:underline",
        inCase ? "type-label tabular-nums" : "type-secondary",
      )}
    >
      {label}
    </span>
  );
}

type Actions = ReturnType<typeof useCallActions>;

// An offer takes the whole bar: who is calling, how long they waited, any
// transfer note, Answer (key A) and Send back (no key: it turns the ringer
// off, and a stray key should never do that).
function Offer({
  offer,
  totalMs,
  now,
  actions,
}: {
  offer: NonNullable<CallBarData["offer"]>;
  totalMs: number;
  now: number;
  actions: Actions;
}) {
  const busy = actions.pending !== null;
  const answer = () => void actions.answer(offer.conversationId);
  useCommands([
    {
      id: "call.answer",
      label: "Answer the call",
      group: "Work",
      keys: "a",
      icon: PhoneIncoming,
      disabledReason: busy ? "Wait a moment" : undefined,
      run: answer,
    },
  ]);

  return (
    <div className="text-accent-foreground flex min-w-0 flex-1 items-center gap-3">
      <PhoneIncoming
        className="text-primary size-4 shrink-0 motion-safe:animate-pulse"
        aria-label="Incoming call"
      />
      <span className="type-label truncate tabular-nums">
        {callerNumber(offer.caller)}
      </span>
      {offer.waitingSince && (
        <span className="type-secondary whitespace-nowrap tabular-nums">
          Waited {formatClock(now - offer.waitingSince.getTime())}
        </span>
      )}
      {offer.transfer && (
        <span className="type-secondary flex min-w-0 items-center gap-1.5">
          <ArrowRightLeft className="size-4 shrink-0" aria-label="Transfer" />
          <span className="whitespace-nowrap">
            From {offer.transfer.fromName}
          </span>
          {offer.transfer.note && (
            <span className="truncate">· {offer.transfer.note}</span>
          )}
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button size="xs" disabled={busy} onClick={answer}>
          {actions.pending === "answer" && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Answer
          <Kbd className="border-primary-foreground/30 text-primary-foreground bg-transparent">
            A
          </Kbd>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              disabled={busy}
              onClick={() => void actions.sendBack(offer.conversationId)}
            >
              Send back
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Turns your ringer off</TooltipContent>
        </Tooltip>
      </div>
      <DrainingBar fraction={remainingFraction(offer.endsAt, now, totalMs)} />
    </div>
  );
}

function IconAction({
  label,
  pressed,
  disabled,
  destructive,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={
            destructive ? "destructive" : pressed ? "default" : "outline"
          }
          size="icon-xs"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const NOT_CONNECTED = "The call has not connected yet";
// Another call command is still out, as the buttons show.
const WAIT = "Wait a moment";

function CallInProgress({
  call,
  now,
  actions,
}: {
  call: NonNullable<CallBarData["call"]>;
  now: number;
  actions: Actions;
}) {
  const busy = actions.pending !== null;
  const connected = call.answeredAt !== null;
  const muteLabel = call.muted ? "Unmute" : "Mute";
  const holdLabel = call.onHold ? "Take off hold" : "Hold";
  const mute = () => void actions.mute(!call.muted);
  const hold = () => void actions.hold(!call.onHold);
  const hangUp = () => void actions.hangUp();
  // Hang up asks first, from the button or the command menu.
  const [confirmHangUp, setConfirmHangUp] = useState(false);

  // In the command menu, with no keys: each one changes a live call.
  const notNow = !connected ? NOT_CONNECTED : busy ? WAIT : undefined;
  useCommands([
    {
      id: "call.mute",
      label: muteLabel,
      group: "Work",
      icon: MicOff,
      disabledReason: notNow,
      run: mute,
    },
    {
      id: "call.hold",
      label: holdLabel,
      group: "Work",
      icon: Pause,
      disabledReason: notNow,
      run: hold,
    },
    {
      id: "call.hang-up",
      label: "Hang up",
      group: "Work",
      icon: PhoneOff,
      disabledReason: busy ? WAIT : undefined,
      run: () => setConfirmHangUp(true),
    },
  ]);

  // Never narrower than its own buttons: the phone's failure line beside
  // it gives way instead of sliding under them.
  return (
    <div className="flex min-w-fit flex-1 items-center gap-3">
      <span className="type-label truncate tabular-nums">
        {callerNumber(call.caller)}
      </span>
      <CaseLink
        conversationId={call.conversationId}
        caseId={call.caseId}
        caseNumber={call.caseNumber}
        inHand
      />
      <span className="type-secondary whitespace-nowrap tabular-nums">
        {call.answeredAt === null
          ? "Connecting…"
          : formatClock(now - call.answeredAt)}
      </span>
      {call.onHold && (
        // The caller hears music; the agent sees how long they have waited.
        <span className="type-secondary text-warning-foreground whitespace-nowrap tabular-nums">
          {call.heldAt === null
            ? "On hold"
            : `On hold ${formatClock(now - call.heldAt)}`}
        </span>
      )}
      {call.reconnecting && (
        // This console lost the call's line (a reload). The caller waits
        // on hold while the phone dials back in.
        <span className="type-secondary text-warning-foreground whitespace-nowrap">
          Reconnecting, the caller is on hold
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <IconAction
          label={muteLabel}
          pressed={call.muted}
          disabled={busy || !connected}
          onClick={mute}
        >
          <MicOff className="size-4" />
        </IconAction>
        <IconAction
          label={holdLabel}
          pressed={call.onHold}
          disabled={busy || !connected}
          onClick={hold}
        >
          <Pause className="size-4" />
        </IconAction>
        <TransferPopover
          disabled={busy || !connected}
          pending={actions.pending === "transfer"}
          onTransfer={actions.transfer}
        />
        <HangUpPopover
          open={confirmHangUp}
          onOpenChange={setConfirmHangUp}
          disabled={busy}
          pending={actions.pending === "hangUp"}
          onHangUp={hangUp}
        />
      </div>
    </div>
  );
}

// Wrap-up: "Wrap-up 1:47" counting down, the case link, the draining bar
// and Done.
function WrapUp({
  wrapUp,
  now,
  actions,
}: {
  wrapUp: NonNullable<CallBarData["wrapUp"]>;
  now: number;
  actions: Actions;
}) {
  const done = () => void actions.done();
  useCommands([
    {
      id: "call.wrap-up-done",
      label: "Wrap-up done",
      group: "Work",
      icon: Check,
      disabledReason: actions.pending !== null ? WAIT : undefined,
      run: done,
    },
  ]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="type-label whitespace-nowrap tabular-nums">
        Wrap-up {formatClock(wrapUp.endsAt - now)}
      </span>
      <CaseLink
        conversationId={wrapUp.conversationId}
        caseId={wrapUp.caseId}
        caseNumber={wrapUp.caseNumber}
        inHand={wrapUp.inHand}
      />
      <Button
        size="xs"
        className="ml-auto"
        disabled={actions.pending !== null}
        onClick={done}
      >
        {actions.pending === "done" && (
          <Loader2 className="size-4 animate-spin" />
        )}
        Done
      </Button>
      <DrainingBar
        fraction={remainingFraction(wrapUp.endsAt, now, WRAP_UP_MS)}
      />
    </div>
  );
}
