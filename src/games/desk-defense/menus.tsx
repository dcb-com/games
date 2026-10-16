import {
  ArrowLeft,
  Bot,
  Check,
  Coins,
  Gamepad2,
  Lock,
  Play,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";

import type { Player } from "~/mock/game-scores";
import { drawPortrait } from "~/games/desk-defense/draw";
import { HOST } from "~/games/desk-defense/guide";
import type { NewThing } from "~/games/desk-defense/levels";
import {
  LEVEL_COUNT,
  WORLDS,
  WORLD_SIZE,
  bonusAt,
  bonusName,
  buildLevel,
  newIn,
  worldOf,
} from "~/games/desk-defense/levels";
import { BONUSES } from "~/games/desk-defense/bonus";
import type { CritterKind, HelperKind } from "~/games/desk-defense/units";
import { CRITTERS, HELPERS } from "~/games/desk-defense/units";
import type { Progress } from "~/games/desk-defense/progress";
import { leaderboard, totalScore } from "~/games/desk-defense/progress";
import type { UpgradeId } from "~/games/desk-defense/upgrades";
import { UPGRADES, nextCost } from "~/games/desk-defense/upgrades";

// The screens around a round: the start screen with the top five, the
// level list, a level's card, the upgrade shop and the end of a round.
// Each one fills the game's box and scrolls inside it when it must.

type Thing =
  | { type: "helper"; kind: HelperKind }
  | { type: "critter"; kind: CritterKind };

// One critter or helper, drawn once into a small canvas.
export function Portrait({
  thing,
  className,
}: {
  thing: Thing;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawPortrait(ctx, thing, rect.width, rect.height, ratio, 0);
  }, [thing]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("size-12 shrink-0", className)}
    />
  );
}

const TITLE_CREW: Thing[] = [
  { type: "helper", kind: "stapler" },
  { type: "critter", kind: "fuzzball" },
  { type: "critter", kind: "zippy" },
  { type: "critter", kind: "chonk" },
  { type: "critter", kind: "shellby" },
];

function thingWords(thing: NewThing) {
  if (thing.type === "helper") {
    const def = HELPERS[thing.kind];
    return { label: "New helper", name: def.name, words: def.special };
  }
  const def = CRITTERS[thing.kind];
  return {
    label: thing.boss ? "Boss" : "New critter",
    name: def.name,
    words: def.blurb,
  };
}

function CoinCount({ coins }: { coins: number }) {
  return (
    <span className="type-label text-warning-foreground flex items-center gap-1 tabular-nums">
      <Coins aria-hidden className="size-4" />
      {coins.toLocaleString()}
      <span className="sr-only">coins</span>
    </span>
  );
}

function Header({
  title,
  coins,
  onBack,
}: {
  title: string;
  coins: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-xs" onClick={onBack}>
        <ArrowLeft className="size-4" />
        <span className="sr-only">Back</span>
      </Button>
      <h3 className="type-label flex-1">{title}</h3>
      <CoinCount coins={coins} />
    </div>
  );
}

export function TopFive({ player }: { player: Player }) {
  const rows = leaderboard(player);
  const top = rows.slice(0, 5);
  const myRank = rows.findIndex((r) => r.email === player.email) + 1;
  const me = rows[myRank - 1];
  return (
    <div className="flex flex-col gap-1.5">
      <p className="type-caption flex items-center gap-1 font-medium">
        <Trophy aria-hidden className="text-warning-foreground size-3.5" />
        Top five
      </p>
      <ol className="flex flex-col gap-0.5">
        {top.map((row, i) => (
          <li
            key={row.email}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-0.5",
              row.email === player.email && "bg-accent",
            )}
          >
            <span className="type-caption w-4 tabular-nums">{i + 1}</span>
            <span className="type-body flex-1 truncate">
              {row.name}
              {row.email === player.email && (
                <span className="type-caption"> (you)</span>
              )}
            </span>
            <span className="type-body tabular-nums">
              {row.score.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
      {myRank > 5 && me && (
        <p className="type-caption border-border border-t pt-1">
          You are number {myRank}, with {me.score.toLocaleString()} points.
        </p>
      )}
    </div>
  );
}

export function TitleScreen({
  player,
  progress,
  resumeLevel,
  onPlay,
  onResume,
  onLevels,
  onShop,
}: {
  player: Player;
  progress: Progress;
  resumeLevel: number | null;
  onPlay: () => void;
  onResume: () => void;
  onLevels: () => void;
  onShop: () => void;
}) {
  const next = Math.min(LEVEL_COUNT, progress.cleared + 1);
  return (
    <div className="grid h-full grid-cols-2 gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="type-label text-base">Desk Defense</h3>
          <p className="type-caption">
            Stop the critters before they cross your desk.
          </p>
        </div>
        <div className="-my-1 flex items-end">
          {TITLE_CREW.map((thing) => (
            <Portrait key={thing.kind} thing={thing} className="size-11" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <CoinCount coins={progress.coins} />
          <span className="type-caption tabular-nums">
            {totalScore(progress).toLocaleString()} points
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {resumeLevel !== null ? (
            <Button size="xs" onClick={onResume}>
              <Play className="size-3.5" />
              Carry on with level {resumeLevel}
            </Button>
          ) : (
            <Button size="xs" onClick={onPlay}>
              <Play className="size-3.5" />
              {progress.cleared === 0 ? "Start with Dot" : `Play level ${next}`}
            </Button>
          )}
          <Button size="xs" variant="outline" onClick={onLevels}>
            All levels
          </Button>
          <Button size="xs" variant="outline" onClick={onShop}>
            <ShoppingBag className="size-3.5" />
            Upgrades
          </Button>
        </div>
        <p className="type-caption mt-auto">
          Arrow keys move, number keys pick, Enter places. Esc leaves.
        </p>
      </div>
      <TopFive player={player} />
    </div>
  );
}

export function LevelsScreen({
  progress,
  onPick,
  onBack,
}: {
  progress: Progress;
  onPick: (n: number) => void;
  onBack: () => void;
}) {
  const next = Math.min(LEVEL_COUNT, progress.cleared + 1);
  const [world, setWorld] = useState(() => Math.floor((next - 1) / WORLD_SIZE));
  const first = world * WORLD_SIZE + 1;
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <Header title="Levels" coins={progress.coins} onBack={onBack} />
      <div className="flex gap-1" role="group" aria-label="Worlds">
        {WORLDS.map((w, i) => (
          <Button
            key={w.theme}
            size="xs"
            variant={i === world ? "default" : "outline"}
            aria-pressed={i === world}
            onClick={() => setWorld(i)}
            className="flex-1"
          >
            {w.name}
          </Button>
        ))}
      </div>
      <ol className="grid grid-cols-10 gap-1">
        {Array.from({ length: WORLD_SIZE }, (_, i) => {
          const n = first + i;
          const open = n <= progress.cleared + 1;
          const done = n <= progress.cleared;
          const bonus = bonusAt(n);
          const name = bonus
            ? `Bonus game: ${bonusName(bonus)}`
            : buildLevel(n).name;
          return (
            <li key={n}>
              <Button
                size="xs"
                variant={done ? "secondary" : open ? "outline" : "ghost"}
                disabled={!open}
                className={cn(
                  "w-full gap-0.5 px-0 tabular-nums",
                  bonus && open && "text-accent-strong",
                )}
                title={open ? name : "Clear the level before it first."}
                aria-label={`Level ${n}, ${name}${done ? ", cleared" : ""}${open ? "" : ", locked"}`}
                onClick={() => onPick(n)}
              >
                {!open ? (
                  <Lock className="size-3" />
                ) : bonus ? (
                  <Gamepad2 className="size-3.5" />
                ) : (
                  n
                )}
                {done && !bonus && (
                  <Check className="text-success-foreground size-3" />
                )}
              </Button>
            </li>
          );
        })}
      </ol>
      <p className="type-caption">
        {WORLDS[world]?.twist}{" "}
        <Gamepad2 aria-hidden className="inline size-3" /> is a bonus game.
      </p>
    </div>
  );
}

export function IntroScreen({
  n,
  progress,
  onStart,
  onBack,
}: {
  n: number;
  progress: Progress;
  onStart: () => void;
  onBack: () => void;
}) {
  const level = buildLevel(n);
  const news = newIn(n);
  const best = progress.best[n];
  const world = worldOf(n);
  const bonus = level.bonus ? BONUSES[level.bonus] : null;
  const newWorld = n > 1 && n % WORLD_SIZE === 1;
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <Header
        title={`Level ${n} · ${world.name}`}
        coins={progress.coins}
        onBack={onBack}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        {bonus ? (
          <>
            <p className="type-caption text-accent-strong flex items-center gap-1 font-medium">
              <Gamepad2 aria-hidden className="size-3.5" />
              Bonus game
            </p>
            <p className="type-label text-base">{bonus.name}</p>
            <p className="type-secondary max-w-sm">{bonus.blurb}</p>
            <p className="type-caption">
              {bonus.keys} A great run is {bonus.great} points.
              {best ? ` Your best: ${best.toLocaleString()}.` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="type-label text-base">{level.name}</p>
            <p className="type-caption">
              {level.spawns.length} critters on {level.rows.length}{" "}
              {level.rows.length === 1 ? "row" : "rows"}.
              {best ? ` Your best: ${best.toLocaleString()}.` : ""}
            </p>
          </>
        )}
        {newWorld && (
          <p className="type-caption bg-accent text-foreground rounded-md px-2 py-1">
            Welcome to {world.name}! {world.twist}
          </p>
        )}
        {level.guided && (
          <p className="type-secondary">
            {HOST}, the desk robot, shows you how to play.
          </p>
        )}
        {news.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-2">
            {news.map((thing) => {
              const w = thingWords(thing);
              return (
                <li
                  key={`${thing.type}-${thing.kind}`}
                  className="bg-accent flex max-w-60 items-center gap-2 rounded-lg p-1.5 pr-3 text-left"
                >
                  <Portrait thing={thing} />
                  <div className="min-w-0">
                    <p className="type-caption font-medium">{w.label}</p>
                    <p className="type-label">{w.name}</p>
                    <p className="type-caption">{w.words}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Button size="xs" className="mt-2" onClick={onStart} autoFocus>
          <Play className="size-3.5" />
          Start
        </Button>
      </div>
    </div>
  );
}

export function ShopScreen({
  progress,
  onBuy,
  onBack,
}: {
  progress: Progress;
  onBuy: (id: UpgradeId) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <Header title="Upgrades" coins={progress.coins} onBack={onBack} />
      <p className="type-caption">
        Every critter you stop earns coins. A cleared level earns more.
      </p>
      <ul className="flex flex-col gap-1.5">
        {UPGRADES.map((u) => {
          const step = progress.owned[u.id];
          const cost = nextCost(u, step);
          return (
            <li
              key={u.id}
              className="border-border flex items-center gap-3 rounded-md border px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="type-label flex items-center gap-2">
                  {u.name}
                  <span
                    className="flex gap-0.5"
                    aria-label={`${step} of ${u.costs.length}`}
                  >
                    {u.costs.map((_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          i < step ? "bg-primary" : "bg-border",
                        )}
                      />
                    ))}
                  </span>
                </p>
                <p className="type-caption truncate">{u.perStep}</p>
              </div>
              {cost === null ? (
                <span className="type-caption text-success-foreground">
                  Full
                </span>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={progress.coins < cost}
                  onClick={() => onBuy(u.id)}
                  aria-label={`Buy ${u.name} for ${cost} coins`}
                >
                  <Coins className="text-warning-foreground size-3.5" />
                  <span className="tabular-nums">{cost}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface Report {
  level: number;
  won: boolean;
  score: number;
  coins: number;
  newBest: boolean;
  firstClear: boolean;
  guideWords: string | null;
  // The bonus game's name, when the level was a bonus game.
  bonus: string | null;
}

export function ResultScreen({
  report,
  player,
  onNext,
  onRetry,
  onShop,
  onMenu,
}: {
  report: Report;
  player: Player;
  onNext: () => void;
  onRetry: () => void;
  onShop: () => void;
  onMenu: () => void;
}) {
  const last = report.level >= LEVEL_COUNT;
  return (
    <div className="grid h-full grid-cols-2 gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-2">
        <h3
          className={cn(
            "type-label text-base",
            report.won ? "text-success-foreground" : "text-warning-foreground",
          )}
        >
          {report.bonus
            ? `${report.bonus}: ${report.score.toLocaleString()} points`
            : report.won
              ? last
                ? "You cleared every level!"
                : `Level ${report.level} cleared`
              : "The critters got through"}
        </h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <dt className="type-caption">Score</dt>
          <dd className="type-body tabular-nums">
            {report.score.toLocaleString()}
            {report.newBest && (
              <span className="type-caption text-success-foreground">
                {" "}
                best
              </span>
            )}
          </dd>
          <dt className="type-caption">Coins earned</dt>
          <dd className="type-body text-warning-foreground tabular-nums">
            +{report.coins}
          </dd>
        </dl>
        {report.guideWords && (
          <p className="type-secondary flex gap-2">
            <Bot aria-hidden className="text-primary size-4 shrink-0" />
            {report.guideWords}
          </p>
        )}
        {!report.won && (
          <p className="type-caption">
            Only cleared levels count toward the leaderboard. Upgrades help.
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {report.won && !last ? (
            // After a bonus game the keys may still be going, so the
            // button waits to be chosen rather than taking the next press.
            <Button size="xs" onClick={onNext} autoFocus={!report.bonus}>
              Next level
            </Button>
          ) : (
            <Button size="xs" onClick={onRetry} autoFocus>
              Try again
            </Button>
          )}
          <Button size="xs" variant="outline" onClick={onShop}>
            Upgrades
          </Button>
          <Button size="xs" variant="ghost" onClick={onMenu}>
            Menu
          </Button>
        </div>
      </div>
      <TopFive player={player} />
    </div>
  );
}
