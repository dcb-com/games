import {
  ArrowLeft,
  Coffee,
  Coins,
  Lock,
  Minus,
  Plus,
  Shield,
  Star,
  Swords,
  Trophy,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";

import type { Player } from "~/mock/game-scores";
import { CLASH_RIVALS } from "~/mock/game-scores";
import { Portrait } from "~/games/desk-defense/menus";
import type { Base } from "~/games/cubicle-clash/base";
import {
  breakroomLevel,
  countOf,
  limitOf,
  rooms,
} from "~/games/cubicle-clash/base";
import { drawBuildingPortrait } from "~/games/cubicle-clash/draw";
import { lootOf } from "~/games/cubicle-clash/rivals";
import type { Clash } from "~/games/cubicle-clash/save";
import { rivalTrophies, trophyBoard } from "~/games/cubicle-clash/save";
import type { BuildingKind, TroopKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  BUILD_ORDER,
  DECOR_ORDER,
  TROOPS,
  TROOP_ORDER,
  buildSeconds,
  costFor,
} from "~/games/cubicle-clash/units";

// The panels around the base: build, train, find a raid, the raid log, the
// top five, and the end of a raid. Each fills the game's box and scrolls
// inside it when it must.

export function BuildingPortrait({
  kind,
  className,
}: {
  kind: BuildingKind;
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
    drawBuildingPortrait(ctx, kind, rect.width, rect.height);
  }, [kind]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("size-12 shrink-0", className)}
    />
  );
}

export function Amount({
  icon,
  value,
  of,
  label,
  className,
}: {
  icon: "coins" | "coffee" | "trophy" | "crew";
  value: number;
  of?: number;
  label: string;
  className?: string;
}) {
  const Icon =
    icon === "coins"
      ? Coins
      : icon === "coffee"
        ? Coffee
        : icon === "trophy"
          ? Trophy
          : Shield;
  return (
    <span
      className={cn(
        "type-caption text-foreground flex items-center gap-1 font-medium tabular-nums",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-3.5",
          icon === "coins" || icon === "trophy"
            ? "text-warning-foreground"
            : "text-muted-foreground",
        )}
      />
      {value.toLocaleString()}
      {of !== undefined && (
        <span className="text-muted-foreground">/{of.toLocaleString()}</span>
      )}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function Panel({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card absolute inset-0 flex flex-col gap-2 overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" onClick={onBack} autoFocus>
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to your base</span>
        </Button>
        <h3 className="type-label flex-1">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function seconds(n: number) {
  if (n === 0) return "At once";
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  return n % 60 === 0 ? `${m}m` : `${m}m ${n % 60}s`;
}

export function BuildPanel({
  clash,
  tab,
  onTab,
  onPick,
  onBack,
}: {
  clash: Clash;
  tab: "buildings" | "decor";
  onTab: (tab: "buildings" | "decor") => void;
  onPick: (kind: BuildingKind) => void;
  onBack: () => void;
}) {
  const list = tab === "decor" ? DECOR_ORDER : BUILD_ORDER;
  return (
    <Panel
      title="Build"
      onBack={onBack}
      right={<Amount icon="coins" value={clash.wallet.coins} label="coins" />}
    >
      <div className="flex gap-1" role="group" aria-label="What to build">
        {(["buildings", "decor"] as const).map((t) => (
          <Button
            key={t}
            size="xs"
            variant={tab === t ? "default" : "outline"}
            aria-pressed={tab === t}
            onClick={() => onTab(t)}
            className="flex-1"
          >
            {t === "buildings" ? "Buildings" : "Decorations"}
          </Button>
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-1.5">
        {list.map((kind, i) => {
          const def = BUILDINGS[kind];
          const have = countOf(clash.base, kind);
          const limit = limitOf(clash.base, kind);
          const cost = costFor(kind, 1);
          const full = have >= limit;
          const poor = clash.wallet.coins < cost;
          return (
            <li key={kind}>
              <button
                type="button"
                disabled={full || poor}
                onClick={() => onPick(kind)}
                title={def.blurb}
                className="border-border hover:bg-secondary focus-visible:ring-ring/40 flex w-full items-center gap-2 rounded-lg border p-1.5 text-left outline-none focus-visible:ring-4 disabled:opacity-50"
              >
                <BuildingPortrait kind={kind} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="type-label block truncate">
                    <span className="type-caption mr-1">{i + 1}</span>
                    {def.name}
                  </span>
                  <span className="type-caption flex items-center gap-2">
                    {limit === 0 ? (
                      <span className="flex items-center gap-1">
                        <Lock aria-hidden className="size-3" />
                        Bigger head office
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-0.5 tabular-nums">
                          <Coins
                            aria-hidden
                            className="text-warning-foreground size-3"
                          />
                          {cost}
                        </span>
                        <span className="tabular-nums">
                          {have}/{limit}
                        </span>
                        <span className="tabular-nums">
                          {seconds(buildSeconds(kind, 1))}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function TrainPanel({
  clash,
  onTrain,
  onUntrain,
  onBack,
}: {
  clash: Clash;
  onTrain: (kind: TroopKind) => void;
  onUntrain: (kind: TroopKind) => void;
  onBack: () => void;
}) {
  const room = rooms(clash.base).army;
  const used = TROOP_ORDER.reduce(
    (sum, k) => sum + clash.army[k] * TROOPS[k].space,
    0,
  );
  const level = breakroomLevel(clash.base);
  return (
    <Panel
      title="Train your crew"
      onBack={onBack}
      right={
        <div className="flex items-center gap-3">
          <Amount icon="crew" value={used} of={room} label="crew space" />
          <Amount icon="coffee" value={clash.wallet.coffee} label="coffee" />
        </div>
      }
    >
      <ul className="flex flex-col gap-1">
        {TROOP_ORDER.map((kind, i) => {
          const def = TROOPS[kind];
          const locked = level < def.unlock;
          const can =
            !locked &&
            clash.wallet.coffee >= def.cost &&
            used + def.space <= room;
          return (
            <li
              key={kind}
              className="border-border flex items-center gap-2 rounded-lg border p-1"
            >
              <Portrait thing={{ type: "critter", kind }} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="type-label">
                  <span className="type-caption mr-1">{i + 1}</span>
                  {def.name}
                  <span className="type-caption ml-2">
                    {locked
                      ? `Break room level ${def.unlock}`
                      : `${def.space} space`}
                  </span>
                </p>
                <p className="type-caption truncate">{def.blurb}</p>
              </div>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={clash.army[kind] === 0}
                onClick={() => onUntrain(kind)}
                aria-label={`Send one ${def.name} home`}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="type-label w-5 text-center tabular-nums">
                {clash.army[kind]}
              </span>
              <Button
                size="xs"
                variant="outline"
                disabled={!can}
                onClick={() => onTrain(kind)}
                aria-label={`Train one ${def.name} for ${def.cost} coffee`}
              >
                <Plus className="size-3.5" />
                <Coffee aria-hidden className="text-muted-foreground size-3" />
                <span className="tabular-nums">{def.cost}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function MatchPanel({
  clash,
  onRaid,
  onBack,
}: {
  clash: Clash;
  onRaid: (email: string) => void;
  onBack: () => void;
}) {
  const crew = TROOP_ORDER.reduce((sum, k) => sum + clash.army[k], 0);
  const list = [...CLASH_RIVALS].sort(
    (a, b) =>
      Math.abs(rivalTrophies(clash, a) - clash.trophies) -
      Math.abs(rivalTrophies(clash, b) - clash.trophies),
  );
  return (
    <Panel
      title="Raid a coworker"
      onBack={onBack}
      right={<Amount icon="trophy" value={clash.trophies} label="trophies" />}
    >
      {crew === 0 && (
        <p className="type-caption bg-warning text-warning-foreground border-warning-border rounded-md border px-2 py-1">
          Your crew is empty. Train some troops first.
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {list.map((r) => {
          const loot = lootOf(r);
          return (
            <li
              key={r.email}
              className="border-border flex items-center gap-3 rounded-lg border px-2 py-1"
            >
              <div className="min-w-0 flex-1">
                <p className="type-label truncate">{r.name}</p>
                <p className="type-caption">Head office level {r.office}</p>
              </div>
              <Amount
                icon="trophy"
                value={rivalTrophies(clash, r)}
                label="trophies"
              />
              <Amount
                icon="coins"
                value={loot.coins}
                label="coins to take"
                className="w-14"
              />
              <Amount
                icon="coffee"
                value={loot.coffee}
                label="coffee to take"
                className="w-12"
              />
              <Button
                size="xs"
                disabled={crew === 0}
                onClick={() => onRaid(r.email)}
              >
                <Swords className="size-3.5" />
                Raid
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${count} of 3 stars`}
    >
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-3.5",
            i < count
              ? "text-warning-foreground fill-current"
              : "text-muted-foreground",
          )}
        />
      ))}
    </span>
  );
}

export function LogPanel({
  clash,
  canRaid,
  onRevenge,
  onBack,
}: {
  clash: Clash;
  canRaid: boolean;
  onRevenge: (email: string) => void;
  onBack: () => void;
}) {
  return (
    <Panel title="Raid log" onBack={onBack}>
      {clash.log.length === 0 && (
        <p className="type-secondary">
          No raids yet. Coworkers raid while you are away.
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {clash.log.map((e) => (
          <li
            key={`${e.at}-${e.email}-${e.theyRaided ? 1 : 0}`}
            className="border-border flex items-center gap-2 rounded-lg border px-2 py-1"
          >
            <div className="min-w-0 flex-1">
              <p className="type-label truncate">
                {e.theyRaided ? `${e.name} raided you` : `You raided ${e.name}`}
              </p>
              <p className="type-caption">
                {e.theyRaided
                  ? e.stars === 0
                    ? "Your defenses held."
                    : `They took ${e.coins.toLocaleString()} coins.`
                  : `You took ${e.coins.toLocaleString()} coins.`}
              </p>
            </div>
            <Stars count={e.stars} />
            <span
              className={cn(
                "type-caption w-10 text-right font-medium tabular-nums",
                e.trophies >= 0
                  ? "text-success-foreground"
                  : "text-destructive-soft-foreground",
              )}
            >
              {e.trophies >= 0 ? "+" : ""}
              {e.trophies}
            </span>
            {e.theyRaided && (
              <Button
                size="xs"
                variant="outline"
                disabled={!canRaid}
                onClick={() => onRevenge(e.email)}
              >
                Revenge
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function TopFive({ player }: { player: Player }) {
  const rows = trophyBoard(player);
  const top = rows.slice(0, 5);
  const rank = rows.findIndex((r) => r.email === player.email) + 1;
  const me = rows[rank - 1];
  return (
    <div className="flex flex-col gap-1.5">
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
            <Amount icon="trophy" value={row.trophies} label="trophies" />
          </li>
        ))}
      </ol>
      {rank > 5 && me && (
        <p className="type-caption border-border border-t pt-1">
          You are number {rank}, with {me.trophies.toLocaleString()} trophies.
        </p>
      )}
    </div>
  );
}

export function BoardPanel({
  player,
  onBack,
}: {
  player: Player;
  onBack: () => void;
}) {
  return (
    <Panel title="Top five, by trophies" onBack={onBack}>
      <TopFive player={player} />
      <p className="type-caption mt-auto">
        Win stars in a raid to take trophies from a coworker. Lose, and they
        take yours.
      </p>
    </Panel>
  );
}

function percent(share: number) {
  // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
  return `${Math.round(share * 100)}%`;
}

export interface RaidReport {
  rival: string;
  stars: number;
  share: number;
  coins: number;
  coffee: number;
  trophies: number;
}

export function ResultPanel({
  report,
  player,
  onDone,
}: {
  report: RaidReport;
  player: Player;
  onDone: () => void;
}) {
  return (
    <div className="bg-card absolute inset-0 grid grid-cols-2 gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-2">
        <h3
          className={cn(
            "type-label text-base",
            report.stars > 0
              ? "text-success-foreground"
              : "text-warning-foreground",
          )}
        >
          {report.stars > 0
            ? `You beat ${report.rival}!`
            : `${report.rival}'s base held`}
        </h3>
        <Stars count={report.stars} className="[&_svg]:size-6" />
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <dt className="type-caption">Base destroyed</dt>
          <dd className="type-body tabular-nums">{percent(report.share)}</dd>
          <dt className="type-caption">Loot</dt>
          <dd className="flex gap-2">
            <Amount icon="coins" value={report.coins} label="coins" />
            <Amount icon="coffee" value={report.coffee} label="coffee" />
          </dd>
          <dt className="type-caption">Trophies</dt>
          <dd
            className={cn(
              "type-body tabular-nums",
              report.trophies >= 0
                ? "text-success-foreground"
                : "text-destructive-soft-foreground",
            )}
          >
            {report.trophies >= 0 ? "+" : ""}
            {report.trophies}
          </dd>
        </dl>
        <Button
          size="xs"
          className="mt-auto self-start"
          onClick={onDone}
          autoFocus
        >
          Back to your base
        </Button>
      </div>
      <div>
        <p className="type-caption mb-1 flex items-center gap-1 font-medium">
          <Trophy aria-hidden className="text-warning-foreground size-3.5" />
          Top five
        </p>
        <TopFive player={player} />
      </div>
    </div>
  );
}

// Used by the base screen's bottom bar to show a building's name and level.
export function describe(base: Base, kind: BuildingKind) {
  return `${BUILDINGS[kind].name} (${countOf(base, kind)}/${limitOf(base, kind)})`;
}
