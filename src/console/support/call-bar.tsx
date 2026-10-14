import { Volume2 } from "lucide-react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";

import { useSound } from "~/console/support/alerts-and-sound";
import { CallBarCalls } from "~/console/support/calls/call-bar-calls";
import { usePhoneTab } from "~/console/support/calls/phone-tab";
import { useCallBarData } from "~/console/support/calls/use-calls-data";
import { useLive } from "~/console/support/live-provider";

// The strip across the top of every console page while live. It is 48px high whatever it shows, so
// the page below never jumps, and going from a support page to Staff or
// Profile moves nothing. It does not hold the phone: the phone and the
// alert for an incoming call live in calls/phone-host.tsx. The state, the ringer and End live are in the sidebar's live
// control, not here.
//
// From left to right: the calls (calls/call-bar-calls.tsx), and at the
// right end, only when needed, the access chip and "Sound is off". An
// offer takes the whole bar and turns it `bg-accent`. When the phone is
// open in another tab, the bar turns muted.
export function CallBar() {
  const { live } = useLive();
  const { owns } = usePhoneTab();
  const bar = useCallBarData(live !== null && owns === true);
  if (!live) return null;
  const data = owns === true ? bar.data : undefined;
  const offered = !!data?.offer;
  return (
    <div
      data-call-bar
      className={cn(
        "border-border relative flex h-12 shrink-0 items-center gap-3 border-b px-4",
        owns === false ? "bg-muted" : offered ? "bg-accent" : "bg-card",
      )}
    >
      <CallBarCalls live={live} owns={owns} data={data} />
      {!offered && (
        <div className="flex shrink-0 items-center gap-2">
          <TurnOnSoundButton />
        </div>
      )}
    </div>
  );
}

// Shown while the browser blocks sound, until pressed. Browsers play no
// sound until the page is clicked, so after a reload the next call would
// ring silently; this says so plainly, in the warning colors.
const SOUND_OFF_WORDS = "Sound is off. Click to hear calls.";

function TurnOnSoundButton() {
  const { blocked, turnOn } = useSound();
  if (!blocked) return null;
  return (
    <Button
      variant="outline"
      size="xs"
      className="border-warning-border bg-warning text-warning-foreground"
      onClick={turnOn}
    >
      <Volume2 className="size-4" />
      {SOUND_OFF_WORDS}
    </Button>
  );
}
