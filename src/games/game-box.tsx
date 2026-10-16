import { Castle, Shield } from "lucide-react";
import { useState } from "react";

import { cn } from "@dcb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dcb/ui/tabs";

import type { Player } from "~/mock/game-scores";
import { CubicleClash } from "~/games/cubicle-clash/cubicle-clash";
import { DeskDefense } from "~/games/desk-defense/desk-defense";
import type { Moment } from "~/games/moments";

// The games, side by side in one place on the host screen. A row of tabs
// picks one; the game under it keeps the same 16:9 box, so switching moves
// nothing around it. The game left behind keeps its state and waits, paused,
// for the player to come back.

type GameId = "desk-defense" | "cubicle-clash";

const KEY = "games:tab";

function remembered(): GameId {
  try {
    return localStorage.getItem(KEY) === "cubicle-clash"
      ? "cubicle-clash"
      : "desk-defense";
  } catch {
    return "desk-defense";
  }
}

export function GameBox({
  moment,
  player,
  className,
}: {
  moment: Moment;
  player: Player;
  className?: string;
}) {
  const [game, setGame] = useState<GameId>(remembered);

  function pick(value: string) {
    const next: GameId =
      value === "cubicle-clash" ? "cubicle-clash" : "desk-defense";
    setGame(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Remembered for this visit only.
    }
  }

  return (
    <Tabs
      value={game}
      onValueChange={pick}
      className={cn("w-full gap-2", className)}
    >
      <TabsList aria-label="Games">
        <TabsTrigger value="desk-defense">
          <span className="flex items-center gap-1.5">
            <Shield aria-hidden className="size-3.5" />
            Desk Defense
          </span>
        </TabsTrigger>
        <TabsTrigger value="cubicle-clash">
          <span className="flex items-center gap-1.5">
            <Castle aria-hidden className="size-3.5" />
            Cubicle Clash
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="desk-defense">
        <DeskDefense moment={moment} player={player} />
      </TabsContent>
      <TabsContent value="cubicle-clash">
        <CubicleClash moment={moment} player={player} />
      </TabsContent>
    </Tabs>
  );
}
