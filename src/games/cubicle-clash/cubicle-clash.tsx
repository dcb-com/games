import {
  Bot,
  Hammer,
  Pause,
  ScrollText,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn, focusRing } from "@dcb/ui";
import { Button } from "@dcb/ui/button";

import type { Player } from "~/mock/game-scores";
import { CLASH_RIVALS } from "~/mock/game-scores";
import { Fx } from "~/games/art/fx";
import type { Moment } from "~/games/moments";
import type { Building } from "~/games/cubicle-clash/base";
import {
  breakroomLevel,
  build,
  buildingAt,
  canBuild,
  canMove,
  collectAll,
  collectOne,
  move,
  nextLevel,
  rooms,
  upgrade,
} from "~/games/cubicle-clash/base";
import type { Layout } from "~/games/cubicle-clash/draw";
import {
  cellAt,
  drawRaid,
  drawVillage,
  layout,
  raidEffects,
} from "~/games/cubicle-clash/draw";
import type { RaidReport } from "~/games/cubicle-clash/menus";
import {
  Amount,
  BoardPanel,
  BuildPanel,
  LogPanel,
  MatchPanel,
  ResultPanel,
  TrainPanel,
} from "~/games/cubicle-clash/menus";
import type { Raid } from "~/games/cubicle-clash/raid";
import {
  destruction,
  drop,
  lootTaken,
  moveCursor,
  newRaid,
  starsOf,
  step,
  surrender,
  trophyChange,
} from "~/games/cubicle-clash/raid";
import { lootOf, rivalBase } from "~/games/cubicle-clash/rivals";
import type { Clash } from "~/games/cubicle-clash/save";
import {
  NO_ARMY,
  getClash,
  rivalTrophies,
  saveClash,
  useClash,
  welcomeBack,
} from "~/games/cubicle-clash/save";
import type { BuildingKind, TroopKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  BUILD_ORDER,
  COLS,
  RAID_SECONDS,
  ROWS,
  TROOPS,
  TROOP_ORDER,
} from "~/games/cubicle-clash/units";

// Cubicle Clash: build an office base, train a crew of critters with
// coffee, and raid coworkers' bases for coins and trophies. Coworkers raid
// back while you are away. It lives in the same box as Desk Defense and
// keeps the same rules: work wins at once, keyboard first, Escape leaves.

type Screen =
  | "village"
  | "build"
  | "train"
  | "match"
  | "log"
  | "board"
  | "raid"
  | "result";

interface Session {
  screen: Screen;
  raid: Raid | null;
  fx: Fx;
  clock: number;
  cursor: { col: number; row: number };
  // A new building being placed, or an old one being moved.
  placing: BuildingKind | null;
  moving: number | null;
  selected: number | null;
  report: RaidReport | null;
}

const sessions = new Map<string, Session>();

function sessionFor(player: Player): Session {
  let s = sessions.get(player.email);
  if (!s) {
    s = {
      screen: "village",
      raid: null,
      fx: new Fx(),
      clock: 0,
      cursor: { col: 2, row: 3 },
      placing: null,
      moving: null,
      selected: null,
      report: null,
    };
    sessions.set(player.email, s);
  }
  return s;
}

const TIPS = [
  "Hi, it's Dot again! Your coin press and coffee maker fill up while you work. Press C, or click them, to collect.",
  "Press B to build. Another stapler turret helps when coworkers come to raid you.",
  "Press T to train a crew with coffee, then R to raid a coworker. Drop troops on the edge with Enter.",
];

interface Hud {
  left: number;
  stars: number;
  share: number;
  army: Record<TroopKind, number>;
}

function hudOf(r: Raid): Hud {
  return {
    left: Math.max(0, Math.ceil(RAID_SECONDS - r.time)),
    stars: starsOf(r),
    // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
    share: Math.round(destruction(r) * 100),
    army: { ...r.army },
  };
}

function sameHud(a: Hud, b: Hud) {
  return (
    a.left === b.left &&
    a.stars === b.stars &&
    a.share === b.share &&
    TROOP_ORDER.every((k) => a.army[k] === b.army[k])
  );
}

export function CubicleClash({
  moment,
  player,
  className,
}: {
  moment: Moment;
  player: Player;
  className?: string;
}) {
  const clash = useClash(player);
  const [screen, setScreenState] = useState<Screen>(
    () => sessionFor(player).screen,
  );
  const [selected, setSelected] = useState<number | null>(
    () => sessionFor(player).selected,
  );
  const [placing, setPlacing] = useState<BuildingKind | null>(
    () => sessionFor(player).placing,
  );
  const [moving, setMoving] = useState<number | null>(
    () => sessionFor(player).moving,
  );
  // A raid never starts again by itself after the game was put away.
  const [held, setHeld] = useState(() => sessionFor(player).screen === "raid");
  const [hud, setHud] = useState<Hud | null>(() => {
    const r = sessionFor(player).raid;
    return r ? hudOf(r) : null;
  });
  const [report, setReport] = useState<RaidReport | null>(
    () => sessionFor(player).report,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const boxRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const fontRef = useRef("sans-serif");
  const stillRef = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  const free = moment.kind === "free";
  const onField = screen === "village" || screen === "raid";
  const running = onField && free && !(screen === "raid" && held);

  function setScreen(next: Screen) {
    sessionFor(player).screen = next;
    setScreenState(next);
  }
  function choose(id: number | null) {
    sessionFor(player).selected = id;
    setSelected(id);
  }
  function startPlacing(kind: BuildingKind | null) {
    sessionFor(player).placing = kind;
    setPlacing(kind);
  }
  function startMoving(id: number | null) {
    sessionFor(player).moving = id;
    setMoving(id);
  }

  function say(words: string) {
    setNotice(words);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  }

  function save(c: Clash) {
    saveClash(player, c);
  }

  function paint() {
    const canvas = canvasRef.current;
    const l = layoutRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !l || !ctx) return;
    const s = sessionFor(player);
    const ratio = canvas.width / l.width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const still = stillRef.current;
    const t = still ? 0 : s.clock;
    if (s.screen === "raid" && s.raid) {
      raidEffects(s.fx, s.raid.events, l, still);
      s.raid.events = [];
      drawRaid(ctx, l, s.raid, {
        ratio,
        t,
        still,
        showCursor: true,
        fx: s.fx,
        font: fontRef.current,
      });
      return;
    }
    const c = getClash(player);
    const now = Date.now();
    let ghost = null;
    if (s.placing) {
      ghost = {
        kind: s.placing,
        level: 1,
        ok:
          canBuild(c.base, c.wallet, s.placing, s.cursor.col, s.cursor.row) ===
          "built",
      };
    }
    const movingB = c.base.buildings.find((b) => b.id === s.moving);
    if (movingB) {
      ghost = {
        kind: movingB.kind,
        level: movingB.level,
        ok: canMove(c.base, movingB, s.cursor.col, s.cursor.row),
      };
    }
    drawVillage(ctx, l, c.base, {
      t,
      still,
      now,
      cursor: s.cursor,
      ghost,
      selected: s.moving ?? s.selected,
      fx: s.fx,
      font: fontRef.current,
    });
  }

  // Raids by coworkers while the player was away, once per opening.
  useEffect(() => {
    const c = getClash(player);
    const found = welcomeBack(c, player, Date.now());
    if (found.length > 0 || c.seen) save(c);
    // oxlint-disable-next-line react/exhaustive-deps -- once, when the game opens
  }, [player.email]);

  // Measure the box, read the font, keep the canvas sharp at any size.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!onField || !canvas || !box) return;
    fontRef.current = getComputedStyle(box).fontFamily || "sans-serif";
    stillRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      layoutRef.current = layout(rect.width, rect.height);
      paint();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
    // oxlint-disable-next-line react/exhaustive-deps -- paint reads the latest state each time
  }, [onField]);

  // The loop. A layout effect, so a pause takes hold in the same commit
  // that brings the work in, before anything else is drawn.
  useLayoutEffect(() => {
    if (!running) {
      paint();
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const s = sessionFor(player);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.clock += dt;
      s.fx.step(dt);
      if (s.screen === "raid" && s.raid) {
        step(s.raid, dt);
        const next = hudOf(s.raid);
        setHud((was) => (was && sameHud(was, next) ? was : next));
        if (s.raid.outcome === "done") {
          paint();
          finishRaid(s.raid);
          return;
        }
      }
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // oxlint-disable-next-line react/exhaustive-deps -- the loop restarts only when it starts or stops
  }, [running, screen]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function finishRaid(r: Raid) {
    const s = sessionFor(player);
    const c = getClash(player);
    const rival = CLASH_RIVALS.find((x) => x.email === r.rival.email);
    const stars = starsOf(r);
    const taken = lootTaken(r);
    const room = rooms(c.base);
    const coins = Math.min(
      taken.coins,
      Math.max(0, room.coins - c.wallet.coins),
    );
    const coffee = Math.min(
      taken.coffee,
      Math.max(0, room.coffee - c.wallet.coffee),
    );
    const change = trophyChange(
      stars,
      c.trophies,
      rival ? rivalTrophies(c, rival) : c.trophies,
    );
    c.wallet.coins += coins;
    c.wallet.coffee += coffee;
    c.trophies = Math.max(0, c.trophies + change);
    c.rivals[r.rival.email] = (c.rivals[r.rival.email] ?? 0) - change;
    // Troops never dropped walk home.
    for (const k of TROOP_ORDER) c.army[k] += r.army[k];
    c.log = [
      {
        at: Date.now(),
        name: r.rival.name,
        email: r.rival.email,
        theyRaided: false,
        stars,
        coins,
        trophies: change,
      },
      ...c.log,
    ].slice(0, 20);
    c.tips = 3;
    save(c);
    const result: RaidReport = {
      rival: r.rival.name,
      stars,
      share: destruction(r),
      coins,
      coffee,
      trophies: change,
    };
    s.raid = null;
    s.report = result;
    s.fx.clear();
    setReport(result);
    setHud(null);
    setScreen("result");
  }

  function startRaid(email: string) {
    const rival = CLASH_RIVALS.find((r) => r.email === email);
    if (!rival) return;
    const c = getClash(player);
    if (TROOP_ORDER.every((k) => c.army[k] === 0)) {
      say("Train a crew first: press T.");
      return;
    }
    const s = sessionFor(player);
    const r = newRaid(
      rival,
      rivalBase(rival),
      c.army,
      lootOf(rival),
      breakroomLevel(c.base),
    );
    // The crew leaves the break room for the raid.
    c.army = { ...NO_ARMY };
    save(c);
    s.raid = r;
    s.fx.clear();
    setHud(hudOf(r));
    setHeld(false);
    setScreen("raid");
    boxRef.current?.focus();
  }

  function backToBase() {
    setScreen("village");
    boxRef.current?.focus();
  }

  // ---- Base actions ----

  function tryCollect(b?: Building) {
    const c = getClash(player);
    const now = Date.now();
    const got = b
      ? {
          coins: b.kind === "press" ? collectOne(c.base, c.wallet, b, now) : 0,
          coffee:
            b.kind === "coffee" ? collectOne(c.base, c.wallet, b, now) : 0,
        }
      : collectAll(c.base, c.wallet, now);
    if (got.coins + got.coffee === 0) {
      say(
        b
          ? "Nothing to collect yet."
          : "Nothing to collect yet, or no room left.",
      );
      return;
    }
    c.tips = Math.max(c.tips, 1);
    save(c);
    const parts = [
      got.coins > 0 ? `+${got.coins} coins` : "",
      got.coffee > 0 ? `+${got.coffee} coffee` : "",
    ].filter(Boolean);
    say(parts.join(", "));
    paint();
  }

  function actAt(col: number, row: number) {
    const s = sessionFor(player);
    const c = getClash(player);
    s.cursor = { col, row };
    if (s.placing) {
      const result = build(c.base, c.wallet, s.placing, col, row, Date.now());
      if (result === "built") {
        c.tips = Math.max(c.tips, 2);
        save(c);
        say(`Built a ${BUILDINGS[s.placing].name.toLowerCase()}.`);
        startPlacing(null);
      } else {
        say(
          result === "coins"
            ? "Not enough coins."
            : result === "full"
              ? "You have as many as your head office allows."
              : "That spot is not free.",
        );
      }
      paint();
      return;
    }
    const movingB = c.base.buildings.find((b) => b.id === s.moving);
    if (movingB) {
      if (move(c.base, movingB, col, row)) {
        save(c);
        startMoving(null);
        choose(movingB.id);
      } else {
        say("It does not fit there.");
      }
      paint();
      return;
    }
    const b = buildingAt(c.base, col, row);
    if (
      b &&
      (b.kind === "press" || b.kind === "coffee") &&
      b.id === s.selected
    ) {
      tryCollect(b);
      return;
    }
    choose(b ? b.id : null);
    if (b && (b.kind === "press" || b.kind === "coffee")) tryCollect(b);
    paint();
  }

  function upgradeSelected() {
    const c = getClash(player);
    const b = c.base.buildings.find(
      (x) => x.id === sessionFor(player).selected,
    );
    if (!b) return;
    const result = upgrade(c.base, c.wallet, b, Date.now());
    if (result === "upgraded") {
      save(c);
      say(`${BUILDINGS[b.kind].name} is now level ${b.level}.`);
    } else {
      say(
        result === "coins"
          ? "Not enough coins."
          : result === "office"
            ? "Upgrade your head office first."
            : "It is at the top level.",
      );
    }
    paint();
  }

  function train(kind: TroopKind, add: boolean) {
    const c = getClash(player);
    const def = TROOPS[kind];
    if (add) {
      const used = TROOP_ORDER.reduce(
        (sum, k) => sum + c.army[k] * TROOPS[k].space,
        0,
      );
      if (breakroomLevel(c.base) < def.unlock)
        return say(`Needs a level ${def.unlock} break room.`);
      if (c.wallet.coffee < def.cost) return say("Not enough coffee.");
      if (used + def.space > rooms(c.base).army)
        return say("The break room is full.");
      c.wallet.coffee -= def.cost;
      c.army[kind] += 1;
    } else {
      if (c.army[kind] === 0) return;
      c.army[kind] -= 1;
      c.wallet.coffee = Math.min(
        rooms(c.base).coffee,
        c.wallet.coffee + def.cost,
      );
    }
    save(c);
  }

  // ---- Keys ----

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab") return;
    // Work wins: once work arrives, every key goes to the host.
    if (!free) return;
    e.stopPropagation();
    const s = sessionFor(player);
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === "Escape") {
      e.preventDefault();
      if (screen === "raid") {
        if (held) boxRef.current?.blur();
        else setHeld(true);
      } else if (screen !== "village") {
        if (screen === "result") choose(null);
        backToBase();
      } else if (s.placing || s.moving) {
        startPlacing(null);
        startMoving(null);
        paint();
      } else if (s.selected !== null) {
        choose(null);
        paint();
      } else {
        boxRef.current?.blur();
      }
      return;
    }

    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };

    if (screen === "raid") {
      const r = s.raid;
      if (!r) return;
      if (held) {
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          setHeld(false);
        }
        return;
      }
      const a = arrows[key];
      if (a) {
        e.preventDefault();
        moveCursor(r, a[0], a[1]);
        paint();
        return;
      }
      if (/^[1-5]$/.test(key)) {
        const kind = TROOP_ORDER[Number(key) - 1];
        if (kind) r.selected = kind;
        paint();
        return;
      }
      if (key === "e") {
        surrender(r);
        return;
      }
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        const result = drop(r, r.selected, r.cursor.col, r.cursor.row);
        if (result === "too-close")
          say("Too close to a building. Drop on open floor.");
        if (result === "none-left")
          say("None of those left. Pick another with 1 to 5.");
        paint();
      }
      return;
    }

    if (screen === "train") {
      if (/^[1-5]$/.test(key)) {
        const kind = TROOP_ORDER[Number(key) - 1];
        if (kind) train(kind, true);
      }
      return;
    }
    if (screen === "build") {
      if (/^[1-9]$/.test(key)) {
        const kind = BUILD_ORDER[Number(key) - 1];
        if (kind) pickBuild(kind);
      }
      return;
    }
    if (screen !== "village") return;

    const a = arrows[key];
    if (a) {
      e.preventDefault();
      s.cursor = {
        col: Math.min(COLS - 1, Math.max(0, s.cursor.col + a[0])),
        row: Math.min(ROWS - 1, Math.max(0, s.cursor.row + a[1])),
      };
      paint();
      return;
    }
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      actAt(s.cursor.col, s.cursor.row);
      return;
    }
    if (key === "c") tryCollect();
    if (key === "b") setScreen("build");
    if (key === "t") setScreen("train");
    if (key === "r") setScreen("match");
    if (key === "l") openLog();
    if (key === "u") upgradeSelected();
    if (key === "m" && s.selected !== null) {
      const b = getClash(player).base.buildings.find(
        (x) => x.id === s.selected,
      );
      if (b) {
        startMoving(b.id);
        s.cursor = { col: b.col, row: b.row };
        paint();
      }
    }
  }

  function pickBuild(kind: BuildingKind) {
    const s = sessionFor(player);
    choose(null);
    startMoving(null);
    startPlacing(kind);
    const c = getClash(player);
    // Start the cursor on the first free spot near the middle.
    for (let d = 0; d < 8; d++) {
      for (let col = 7 - d; col <= 8 + d; col++) {
        for (let row = 3 - d; row <= 4 + d; row++) {
          if (
            canBuild(c.base, { coins: 1e9, coffee: 0 }, kind, col, row) ===
            "built"
          ) {
            s.cursor = { col, row };
            backToBase();
            return;
          }
        }
      }
    }
    backToBase();
  }

  function openLog() {
    const c = getClash(player);
    if (c.unseen > 0) {
      c.unseen = 0;
      save(c);
    }
    setScreen("log");
  }

  // ---- Mouse ----

  function pointAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const l = layoutRef.current;
    if (!l) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    return cellAt(l, e.clientX - rect.left, e.clientY - rect.top);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!free) return;
    const cell = pointAt(e);
    if (!cell) return;
    const s = sessionFor(player);
    if (screen === "raid" && s.raid) {
      s.raid.cursor = cell;
    } else if (s.placing || s.moving) {
      s.cursor = cell;
    } else {
      return;
    }
    if (!running) paint();
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!free) return;
    const cell = pointAt(e);
    if (!cell) return;
    const s = sessionFor(player);
    if (screen === "raid" && s.raid) {
      if (held) return;
      s.raid.cursor = cell;
      const result = drop(s.raid, s.raid.selected, cell.col, cell.row);
      if (result === "too-close")
        say("Too close to a building. Drop on open floor.");
      if (result === "none-left") say("None of those left.");
      return;
    }
    actAt(cell.col, cell.row);
  }

  // ---- What shows ----

  const room = rooms(clash.base);
  const crew = TROOP_ORDER.reduce(
    (sum, k) => sum + clash.army[k] * TROOPS[k].space,
    0,
  );
  const chosen = clash.base.buildings.find((b) => b.id === selected);
  const next = chosen ? nextLevel(clash.base, chosen) : null;
  const raid = sessionFor(player).raid;
  const tip =
    screen === "village" && !chosen && !placing && !moving
      ? TIPS[clash.tips]
      : undefined;

  return (
    <section
      ref={boxRef}
      tabIndex={-1}
      aria-label="Cubicle Clash, a game"
      aria-roledescription="game"
      data-game-slot
      data-moment={moment.kind}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        const to = e.relatedTarget;
        const inside = to instanceof Node && e.currentTarget.contains(to);
        if (!inside && screen === "raid") setHeld(true);
      }}
      className={cn(
        "border-border bg-card relative aspect-video w-full overflow-hidden rounded-lg border",
        focusRing,
        className,
      )}
    >
      {onField && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="block size-full touch-none"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
        />
      )}

      {screen === "village" && (
        <>
          <div className="bg-card/90 border-border absolute inset-x-0 top-0 flex h-7.5 items-center gap-3 border-b px-3">
            <span className="type-label">Cubicle Clash</span>
            <Amount
              icon="coins"
              value={clash.wallet.coins}
              of={room.coins}
              label="coins"
            />
            <Amount
              icon="coffee"
              value={clash.wallet.coffee}
              of={room.coffee}
              label="coffee"
            />
            <Amount
              icon="crew"
              value={crew}
              of={room.army}
              label="crew space"
            />
            <Amount
              icon="trophy"
              value={clash.trophies}
              label="trophies"
              className="ml-auto"
            />
          </div>
          <div className="bg-card/90 border-border absolute inset-x-0 bottom-0 flex h-7.5 items-center gap-1 border-t px-2">
            {placing || moving ? (
              <>
                <span className="type-caption flex-1">
                  {placing
                    ? `Place a ${BUILDINGS[placing].name.toLowerCase()}`
                    : "Move it"}
                  : arrows or the mouse, then Enter. Esc cancels.
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    startPlacing(null);
                    startMoving(null);
                    paint();
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : chosen ? (
              <>
                <span className="type-label truncate">
                  {BUILDINGS[chosen.kind].name}
                  <span className="type-caption ml-1">
                    level {chosen.level}
                  </span>
                </span>
                <span className="type-caption hidden flex-1 truncate sm:block">
                  {BUILDINGS[chosen.kind].blurb}
                </span>
                <span className="flex-1 sm:hidden" />
                {next && "cost" in next ? (
                  <Button
                    size="xs"
                    disabled={clash.wallet.coins < next.cost}
                    onClick={upgradeSelected}
                  >
                    Upgrade
                    <Amount
                      icon="coins"
                      value={next.cost}
                      label="coins"
                      className="text-inherit"
                    />
                  </Button>
                ) : (
                  <span className="type-caption">
                    {next?.blocked === "office"
                      ? "Upgrade head office first"
                      : "Top level"}
                  </span>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    startMoving(chosen.id);
                    sessionFor(player).cursor = {
                      col: chosen.col,
                      row: chosen.row,
                    };
                    paint();
                    boxRef.current?.focus();
                  }}
                >
                  Move
                </Button>
                <Button size="xs" variant="ghost" onClick={() => choose(null)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setScreen("build")}
                >
                  <Hammer className="size-3.5" />
                  Build
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setScreen("train")}
                >
                  <Users className="size-3.5" />
                  Train
                </Button>
                <Button size="xs" onClick={() => setScreen("match")}>
                  <Swords className="size-3.5" />
                  Raid
                </Button>
                <Button size="xs" variant="ghost" onClick={() => tryCollect()}>
                  Collect
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={openLog}
                  className="relative"
                >
                  <ScrollText className="size-3.5" />
                  Log
                  {clash.unseen > 0 && (
                    <span className="bg-destructive text-primary-foreground type-caption absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full tabular-nums">
                      {clash.unseen}
                    </span>
                  )}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setScreen("board")}
                >
                  <Trophy className="size-3.5" />
                  Top five
                </Button>
              </>
            )}
          </div>
          {tip && (
            <div
              role="status"
              className="bg-card border-border absolute bottom-9.5 left-2 flex max-w-64 items-start gap-1.5 rounded-lg border p-1.5 shadow-md"
            >
              <span className="bg-accent text-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                <Bot aria-hidden className="size-3.5" />
              </span>
              <p className="type-caption text-foreground">{tip}</p>
            </div>
          )}
          {clash.unseen > 0 && !tip && !chosen && !placing && !moving && (
            <button
              type="button"
              onClick={openLog}
              className={cn(
                "bg-warning text-warning-foreground border-warning-border type-caption absolute top-9 right-3 rounded-md border px-2 py-1 font-medium",
                focusRing,
              )}
            >
              {clash.unseen === 1
                ? "A coworker raided you. See the log."
                : `${clash.unseen} coworkers raided you. See the log.`}
            </button>
          )}
        </>
      )}

      {screen === "raid" && raid && hud && (
        <>
          <div className="bg-card/90 border-border absolute inset-x-0 top-0 flex h-7.5 items-center gap-3 border-b px-3">
            <span className="type-label truncate">
              Raiding {raid.rival.name}
            </span>
            <span className="type-caption tabular-nums">{hud.left}s left</span>
            <span className="type-caption tabular-nums">{hud.share}% down</span>
            <span
              className="type-caption text-warning-foreground ml-auto font-medium"
              aria-label={`${hud.stars} stars`}
            >
              {"★".repeat(hud.stars)}
              <span className="text-muted-foreground">
                {"★".repeat(3 - hud.stars)}
              </span>
            </span>
          </div>
          <div className="bg-card/90 border-border absolute inset-x-0 bottom-0 flex h-7.5 items-center gap-1 border-t px-2">
            {TROOP_ORDER.map((kind, i) =>
              hud.army[kind] > 0 || raid.selected === kind ? (
                <Button
                  key={kind}
                  size="xs"
                  variant={raid.selected === kind ? "default" : "outline"}
                  onClick={() => {
                    raid.selected = kind;
                    boxRef.current?.focus();
                    paint();
                  }}
                >
                  <span className="opacity-70">{i + 1}</span>
                  {TROOPS[kind].name}
                  <span className="tabular-nums">×{hud.army[kind]}</span>
                </Button>
              ) : null,
            )}
            <span className="type-caption ml-auto hidden md:block">
              Enter drops. E ends.
            </span>
            <Button size="xs" variant="ghost" onClick={() => surrender(raid)}>
              End raid
            </Button>
          </div>
        </>
      )}

      {screen === "build" && (
        <BuildPanel clash={clash} onPick={pickBuild} onBack={backToBase} />
      )}
      {screen === "train" && (
        <TrainPanel
          clash={clash}
          onTrain={(k) => train(k, true)}
          onUntrain={(k) => train(k, false)}
          onBack={backToBase}
        />
      )}
      {screen === "match" && (
        <MatchPanel clash={clash} onRaid={startRaid} onBack={backToBase} />
      )}
      {screen === "log" && (
        <LogPanel
          clash={clash}
          canRaid={TROOP_ORDER.some((k) => clash.army[k] > 0)}
          onRevenge={startRaid}
          onBack={backToBase}
        />
      )}
      {screen === "board" && <BoardPanel player={player} onBack={backToBase} />}
      {screen === "result" && report && (
        <ResultPanel
          report={report}
          player={player}
          onDone={() => {
            sessionFor(player).report = null;
            setReport(null);
            backToBase();
          }}
        />
      )}

      {onField && (!free || (screen === "raid" && held)) && (
        <div className="bg-card/85 absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <Pause aria-hidden className="text-muted-foreground size-5" />
          <p className="type-label">Paused</p>
          <p className="type-caption">
            {free ? "The raid waits right where you left it." : moment.words}
          </p>
          {free && (
            <div className="flex gap-2">
              <Button
                size="xs"
                onClick={() => {
                  setHeld(false);
                  boxRef.current?.focus();
                }}
              >
                Carry on
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  const r = sessionFor(player).raid;
                  if (r) {
                    surrender(r);
                    finishRaid(r);
                  }
                }}
              >
                End raid
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="sr-only">
        Arrow keys move. On your base: Enter picks or places, C collects, B
        builds, T trains, R raids, L opens the log, U upgrades, M moves. In a
        raid: 1 to 5 pick a troop, Enter drops it, E ends the raid. Escape
        leaves.
      </p>

      {notice && (
        <p
          role="status"
          className="type-caption bg-foreground text-background absolute top-9 left-1/2 -translate-x-1/2 rounded-md px-2 py-1"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
