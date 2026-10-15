import { Bot, Pause } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn, focusRing } from "@dcb/ui";
import { Button } from "@dcb/ui/button";

import type { Player } from "~/mock/game-scores";
import type { Moment } from "~/games/moments";
import type { Layout, Palette } from "~/games/desk-defense/draw";
import {
  drawRound,
  hitTest,
  layout,
  readPalette,
  tools,
} from "~/games/desk-defense/draw";
import { GUIDE, GUIDE_DONE, HOST } from "~/games/desk-defense/guide";
import { LEVEL_COUNT, buildLevel } from "~/games/desk-defense/levels";
import type { Report } from "~/games/desk-defense/menus";
import {
  IntroScreen,
  LevelsScreen,
  ResultScreen,
  ShopScreen,
  TitleScreen,
} from "~/games/desk-defense/menus";
import {
  buyUpgrade,
  getProgress,
  recordRound,
  useProgress,
} from "~/games/desk-defense/progress";
import type { PlaceResult, Round, Tool } from "~/games/desk-defense/round";
import {
  finalScore,
  moveCursor,
  newRound,
  place,
  remove,
  step,
} from "~/games/desk-defense/round";
import { boostsFrom } from "~/games/desk-defense/upgrades";

// Desk Defense: bugs crawl in from the right, and the player sets office
// helpers on the desk to stop them. It fills the host's game box and
// nothing else.
//
// Work wins. When the host's moment is not "free", the loop stops in the
// same commit, before the next paint, and the round waits as it is. A
// round lives outside React (in `sessions`), so it also survives the box
// leaving the screen, as it does when a payroll run finishes.

type Screen = "title" | "levels" | "intro" | "shop" | "play" | "result";

interface Session {
  round: Round | null;
  screen: Screen;
  guideStep: number;
  // When the current guide step first showed, in round seconds.
  guideSince: number;
}

const sessions = new Map<string, Session>();

function sessionFor(player: Player): Session {
  let s = sessions.get(player.email);
  if (!s) {
    s = { round: null, screen: "title", guideStep: 0, guideSince: 0 };
    sessions.set(player.email, s);
  }
  return s;
}

const NOTICES: Record<Exclude<PlaceResult, "placed">, string> = {
  "closed-row": "That row is closed on this level.",
  taken: "Something is already there.",
  "no-energy": "Not enough energy yet.",
  recharging: "That card is still recharging.",
  "no-card": "Pick a card first: 1 to 6.",
};

export function DeskDefense({
  moment,
  player,
  className,
}: {
  moment: Moment;
  player: Player;
  className?: string;
}) {
  const progress = useProgress(player);
  const [screen, setScreenState] = useState<Screen>(
    () => sessionFor(player).screen,
  );
  const [introLevel, setIntroLevel] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [guideStep, setGuideStep] = useState(
    () => sessionFor(player).guideStep,
  );
  // The player stepped away: Escape, or focus left the game.
  const [held, setHeld] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resumeLevel, setResumeLevel] = useState<number | null>(
    () => sessionFor(player).round?.level.number ?? null,
  );

  const boxRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const paletteRef = useRef<Palette | null>(null);
  const stillRef = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  const free = moment.kind === "free";
  const running = screen === "play" && free && !held;
  const guide =
    screen === "play" && sessionFor(player).round?.level.guided
      ? GUIDE[guideStep]
      : undefined;

  function setScreen(next: Screen) {
    sessionFor(player).screen = next;
    setScreenState(next);
  }

  function paint(time = performance.now() / 1000) {
    const canvas = canvasRef.current;
    const l = layoutRef.current;
    const p = paletteRef.current;
    const r = sessionFor(player).round;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !l || !p || !r || !ctx) return;
    const ratio = canvas.width / l.width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawRound(ctx, p, l, r, time, stillRef.current, true);
  }

  function say(words: string) {
    setNotice(words);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  }

  // Move the guide on when its step is done. Returns true if it moved.
  function checkGuide(r: Round, pressedEnter = false): boolean {
    const s = sessionFor(player);
    if (!r.level.guided) return false;
    const current = GUIDE[s.guideStep];
    if (!current) return false;
    const shown = r.time - s.guideSince;
    if (current.done(r, shown) || (pressedEnter && current.enter)) {
      s.guideStep += 1;
      s.guideSince = r.time;
      setGuideStep(s.guideStep);
      return true;
    }
    return false;
  }

  function finish(r: Round) {
    const s = sessionFor(player);
    const won = r.outcome === "won";
    const n = r.level.number;
    const result = recordRound(player, n, finalScore(r), r.points, won);
    s.round = null;
    setResumeLevel(null);
    setReport({
      level: n,
      won,
      ...result,
      guideWords: r.level.guided && won ? GUIDE_DONE : null,
    });
    setScreen("result");
  }

  // Measure the box, read the theme, and keep the canvas sharp at any size.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (screen !== "play" || !canvas || !box) return;
    paletteRef.current = readPalette(box);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    stillRef.current = motion.matches;
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
    // paint reads the latest round from the session each time.
    // oxlint-disable-next-line react/exhaustive-deps -- paint is stable in effect
  }, [screen]);

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
      const r = sessionFor(player).round;
      if (!r) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const holding =
        r.level.guided && GUIDE[sessionFor(player).guideStep]?.holds;
      if (!holding) step(r, dt);
      checkGuide(r);
      paint(now / 1000);
      if (r.outcome !== "playing") {
        finish(r);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // oxlint-disable-next-line react/exhaustive-deps -- the loop restarts only when it starts or stops
  }, [running]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function startLevel(n: number) {
    const s = sessionFor(player);
    s.round = newRound(buildLevel(n), boostsFrom(getProgress(player).owned));
    s.guideStep = 0;
    s.guideSince = 0;
    setGuideStep(0);
    setResumeLevel(n);
    setHeld(false);
    setScreen("play");
    boxRef.current?.focus();
  }

  function pickLevel(n: number) {
    setIntroLevel(n);
    setScreen("intro");
  }

  function resume() {
    setHeld(false);
    setScreen("play");
    boxRef.current?.focus();
  }

  function choose(r: Round, tool: Tool | undefined) {
    if (!tool) return;
    r.selected = tool;
    checkGuide(r);
    paint();
  }

  function act(r: Round) {
    const { row, col } = r.cursor;
    if (r.selected === "remove") {
      if (!remove(r, row, col)) say("Nothing to remove there.");
    } else {
      const result = place(r, r.selected, row, col);
      if (result !== "placed") say(NOTICES[result]);
    }
    checkGuide(r);
    paint();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    // Keys with Ctrl, Cmd or Alt belong to the host, so Mod K still works.
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab") return;
    // Work wins: once work arrives, every key goes to the host, so A still
    // answers a ringing call while the game has focus.
    if (!free) return;
    // Everything else stays in the game while it has focus.
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      if (screen === "play") {
        setHeld(true);
        setScreen("title");
        boxRef.current?.focus();
      } else if (screen === "title") {
        boxRef.current?.blur();
      } else {
        setScreen("title");
        boxRef.current?.focus();
      }
      return;
    }
    if (screen !== "play") return;
    const r = sessionFor(player).round;
    if (!r) return;
    if (!running) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHeld(false);
      }
      return;
    }

    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      moveCursor(r, move[0], move[1]);
      paint();
      return;
    }
    if (/^[1-6]$/.test(e.key)) {
      choose(r, r.level.helpers[Number(e.key) - 1]);
      return;
    }
    if (e.key === "x" || e.key === "X") {
      choose(r, "remove");
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      remove(r, r.cursor.row, r.cursor.col);
      paint();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (guide?.enter && checkGuide(r, true)) return;
      act(r);
    }
  }

  function pointAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const l = layoutRef.current;
    const r = sessionFor(player).round;
    if (!l || !r) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      l,
      r,
      hit: hitTest(l, r, e.clientX - rect.left, e.clientY - rect.top),
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!running) return;
    const at = pointAt(e);
    if (at?.hit?.kind !== "cell") return;
    const { row, col } = at.hit;
    if (at.r.cursor.row === row && at.r.cursor.col === col) return;
    at.r.cursor = { row, col };
    paint();
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!running) return;
    const at = pointAt(e);
    if (!at?.hit) return;
    if (at.hit.kind === "card") {
      choose(at.r, at.hit.tool);
      return;
    }
    at.r.cursor = { row: at.hit.row, col: at.hit.col };
    act(at.r);
  }

  const round = screen === "play" ? sessionFor(player).round : null;
  const cardCount = round ? tools(round).length : 0;

  return (
    <section
      ref={boxRef}
      tabIndex={-1}
      aria-label="Desk Defense, a game"
      aria-roledescription="game"
      data-game-slot
      data-moment={moment.kind}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        const to = e.relatedTarget;
        const inside = to instanceof Node && e.currentTarget.contains(to);
        if (!inside && screen === "play") setHeld(true);
      }}
      className={cn(
        "border-border bg-card relative aspect-video w-full overflow-hidden rounded-lg border",
        focusRing,
        className,
      )}
    >
      {screen === "title" && (
        <TitleScreen
          player={player}
          progress={progress}
          resumeLevel={resumeLevel}
          onPlay={() => pickLevel(Math.min(LEVEL_COUNT, progress.cleared + 1))}
          onResume={resume}
          onLevels={() => setScreen("levels")}
          onShop={() => setScreen("shop")}
        />
      )}
      {screen === "levels" && (
        <LevelsScreen
          progress={progress}
          onPick={pickLevel}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "intro" && (
        <IntroScreen
          n={introLevel}
          progress={progress}
          onStart={() => startLevel(introLevel)}
          onBack={() => setScreen("levels")}
        />
      )}
      {screen === "shop" && (
        <ShopScreen
          progress={progress}
          onBuy={(id) => {
            if (buyUpgrade(player, id)) say("Bought.");
          }}
          onBack={() => setScreen(report ? "result" : "title")}
        />
      )}
      {screen === "result" && report && (
        <ResultScreen
          report={report}
          player={player}
          onNext={() => pickLevel(Math.min(LEVEL_COUNT, report.level + 1))}
          onRetry={() => pickLevel(report.level)}
          onShop={() => setScreen("shop")}
          onMenu={() => {
            setReport(null);
            setScreen("title");
          }}
        />
      )}

      {screen === "play" && (
        <>
          <canvas
            ref={canvasRef}
            className="block size-full touch-none"
            aria-hidden
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
          />
          <p className="sr-only">
            The desk has 5 rows and 9 columns. Arrow keys move. Keys 1 to{" "}
            {cardCount - 1} pick a helper, X picks remove, Enter places. Escape
            leaves.
          </p>
          {guide && running && (
            <div
              role="status"
              className="bg-card border-border absolute inset-x-3 bottom-2 flex items-start gap-2 rounded-lg border p-2 shadow-md"
            >
              <span className="bg-accent text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
                <Bot aria-hidden className="size-4" />
              </span>
              <p className="type-body flex-1">
                <span className="font-semibold">{HOST}: </span>
                {guide.words}
              </p>
              {guide.enter && (
                <span className="type-caption self-end whitespace-nowrap">
                  Enter
                </span>
              )}
            </div>
          )}
          {!running && (
            <div className="bg-card/85 absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <Pause aria-hidden className="text-muted-foreground size-5" />
              <p className="type-label">Paused</p>
              <p className="type-caption">
                {free
                  ? "The round waits right where you left it."
                  : moment.words}
              </p>
              {free && (
                <Button
                  size="xs"
                  onClick={() => {
                    setHeld(false);
                    boxRef.current?.focus();
                  }}
                >
                  Carry on
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {notice && (
        <p
          role="status"
          className="type-caption bg-foreground text-background absolute top-2 left-1/2 -translate-x-1/2 rounded-md px-2 py-1"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
