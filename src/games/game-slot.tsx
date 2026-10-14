import { Gamepad2 } from "lucide-react";
import { match } from "ts-pattern";

import { cn } from "@dcb/ui";

import type { Moment } from "~/games/moments";

// An empty box where a game would open. There is no game in this repo yet:
// the box marks the place, and says what the host screen is doing right
// now, so you can see the moment a game would have to stop.
//
// Build the game to fit inside this box, at the size it is given. The host
// screen around it must never move when the game starts, stops or pauses.
export function GameSlot({
  moment,
  where,
  className,
}: {
  moment: Moment;
  // Where this slot sits, said in the box: "Support console, detail pane".
  where: string;
  className?: string;
}) {
  return (
    <section
      aria-label="Game placeholder"
      data-game-slot
      data-moment={moment.kind}
      className={cn(
        "border-border bg-muted/40 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center",
        className,
      )}
    >
      <Gamepad2 aria-hidden className="text-muted-foreground size-6" />
      <p className="type-label">A game goes here</p>
      <p className="type-caption">{where}</p>
      <p
        className={cn(
          "type-caption mt-1 flex items-center gap-1.5 font-medium",
          match(moment.kind)
            .with("free", () => "text-success-foreground")
            .with("pause", () => "text-warning-foreground")
            .with("closed", () => "text-muted-foreground")
            .exhaustive(),
        )}
      >
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {match(moment.kind)
          .with("free", () => "Free to play.")
          .with("pause", () => "Pause now.")
          .with("closed", () => "Closed.")
          .exhaustive()}{" "}
        {moment.words}
      </p>
    </section>
  );
}
