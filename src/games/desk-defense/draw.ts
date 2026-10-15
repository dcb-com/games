import { ART, ellipse, hsl, rounded } from "~/games/desk-defense/art/color";
import { drawCritter, sampleCritter } from "~/games/desk-defense/art/critters";
import type { Field } from "~/games/desk-defense/art/desk";
import {
  drawDesk,
  drawShot,
  drawShredder,
} from "~/games/desk-defense/art/desk";
import { furSprite } from "~/games/desk-defense/art/fur";
import type { Fx, Place } from "~/games/desk-defense/art/fx";
import { RESTING, drawHelper, lookOf } from "~/games/desk-defense/art/helpers";
import { COLS, ROWS } from "~/games/desk-defense/levels";
import type { Round, Tool } from "~/games/desk-defense/round";
import { canPlace, helperAt, progress } from "~/games/desk-defense/round";
import type { CritterKind, HelperKind } from "~/games/desk-defense/units";
import { CRITTERS, HELPERS } from "~/games/desk-defense/units";

// Draws a whole round onto the canvas: the desk, then each row's helpers,
// critters and shots, then the effects, then the card bar on top. The bar
// is the game's own UI, so its colors come from the theme's CSS variables;
// the art on the desk uses the game's own colors in art/color.ts.

type Token =
  | "background"
  | "foreground"
  | "card"
  | "muted"
  | "muted-foreground"
  | "border"
  | "primary"
  | "accent"
  | "warning"
  | "warning-foreground"
  | "warning-border"
  | "destructive"
  | "destructive-soft-foreground"
  | "ring";

export type Palette = Record<Token, string> & { font: string };

export function readPalette(el: HTMLElement): Palette {
  const style = getComputedStyle(el);
  const v = (t: Token) => style.getPropertyValue(`--${t}`).trim() || "gray";
  return {
    background: v("background"),
    foreground: v("foreground"),
    card: v("card"),
    muted: v("muted"),
    "muted-foreground": v("muted-foreground"),
    border: v("border"),
    primary: v("primary"),
    accent: v("accent"),
    warning: v("warning"),
    "warning-foreground": v("warning-foreground"),
    "warning-border": v("warning-border"),
    destructive: v("destructive"),
    "destructive-soft-foreground": v("destructive-soft-foreground"),
    ring: v("ring"),
    font: style.fontFamily || "sans-serif",
  };
}

// Where everything sits, in CSS pixels, for a canvas of this size. The
// screen code uses the same numbers to turn a click into a cell or a card.
export interface Layout {
  width: number;
  height: number;
  barH: number;
  shredW: number;
  cellW: number;
  cellH: number;
  card: { x: number; y: number; w: number; h: number };
  cardGap: number;
}

export function layout(width: number, height: number): Layout {
  const barH = Math.round(Math.max(44, height * 0.18));
  const shredW = Math.round(width * 0.055);
  const cardH = barH - 10;
  const cardW = Math.round(Math.min(cardH * 0.82, (width * 0.76) / 9 - 3));
  return {
    width,
    height,
    barH,
    shredW,
    cellW: (width - shredW) / COLS,
    cellH: (height - barH) / ROWS,
    card: { x: Math.round(cardH * 1.3) + 10, y: 5, w: cardW, h: cardH },
    cardGap: 3,
  };
}

// The tools on the bar, in order: the level's helpers, then remove.
export function tools(r: Round): Tool[] {
  return [...r.level.helpers, "remove"];
}

export function cardRect(l: Layout, index: number) {
  return {
    x: l.card.x + index * (l.card.w + l.cardGap),
    y: l.card.y,
    w: l.card.w,
    h: l.card.h,
  };
}

export function hitTest(
  l: Layout,
  r: Round,
  x: number,
  y: number,
):
  | { kind: "card"; tool: Tool }
  | { kind: "cell"; row: number; col: number }
  | null {
  if (y < l.barH) {
    const list = tools(r);
    for (let i = 0; i < list.length; i++) {
      const c = cardRect(l, i);
      const tool = list[i];
      if (tool && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        return { kind: "card", tool };
      }
    }
    return null;
  }
  const col = Math.floor((x - l.shredW) / l.cellW);
  const row = Math.floor((y - l.barH) / l.cellH);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { kind: "cell", row, col };
}

function field(l: Layout): Field {
  return {
    width: l.width,
    height: l.height,
    top: l.barH,
    left: l.shredW,
    cellW: l.cellW,
    cellH: l.cellH,
    rows: ROWS,
    cols: COLS,
  };
}

// The middle of a spot on the desk, in pixels. x is in cells from the left
// edge of the desk, so a critter at x = 3.5 stands in the middle of col 3.
export function cellPoint(l: Layout, row: number, x: number) {
  return { x: l.shredW + x * l.cellW, y: l.barH + (row + 0.5) * l.cellH };
}

export function energyPoint(l: Layout) {
  return { x: 6 + (l.card.x - 12) * 0.3, y: l.card.y + l.card.h * 0.5 };
}

export function fxPlace(l: Layout): Place {
  return {
    cell: (row, x) => cellPoint(l, row, x),
    size: Math.min(l.cellW, l.cellH) * 0.92,
    cellW: l.cellW,
    cellH: l.cellH,
    energy: energyPoint(l),
    width: l.width,
  };
}

export interface View {
  // Real seconds, for wiggles and blinks.
  t: number;
  still: boolean;
  ratio: number;
  fx: Fx;
  showCursor: boolean;
}

function healthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  share: number,
  good: boolean,
) {
  if (share >= 1) return;
  rounded(ctx, x, y, w, 4, 2);
  ctx.fillStyle = hsl(ART.ink, 0, 0.45);
  ctx.fill();
  rounded(ctx, x, y, w * Math.max(0, share), 4, 2);
  ctx.fillStyle = good ? hsl(ART.hopper, 5) : hsl(ART.ember, 8);
  ctx.fill();
}

export function drawRound(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  r: Round,
  view: View,
) {
  const { t, still } = view;
  const size = Math.min(l.cellW, l.cellH) * 0.92;
  ctx.clearRect(0, 0, l.width, l.height);
  drawDesk(ctx, field(l), r.level.rows, view.ratio);

  // Shredders waiting at the left end of open rows.
  for (const row of r.level.rows) {
    if (!r.shredders[row]) continue;
    const at = cellPoint(l, row, 0);
    drawShredder(ctx, l.shredW / 2, at.y, l.cellH, false, t);
  }

  // The cursor, with a faint copy of the chosen helper where it would go.
  if (view.showCursor) drawCursor(ctx, p, l, r, size, t);

  // Row by row, top to bottom, so lower things overlap higher ones.
  const critters = [...r.critters].sort((a, b) => a.row - b.row || b.x - a.x);
  for (let row = 0; row < ROWS; row++) {
    for (const h of r.helpers) {
      if (h.row !== row) continue;
      const at = cellPoint(l, row, h.col + 0.5);
      drawHelper(ctx, h.kind, at.x, at.y, size, lookOf(h, t, still));
      if (HELPERS[h.kind].hp < 9999) {
        healthBar(
          ctx,
          at.x - size * 0.3,
          at.y + size * 0.42,
          size * 0.6,
          h.hp / h.maxHp,
          true,
        );
      }
    }
    for (const c of critters) {
      if (c.row !== row) continue;
      const at = cellPoint(l, row, c.x);
      drawCritter(ctx, c, at.x, at.y, size * 0.9, {
        t,
        still,
        ratio: view.ratio,
      });
      const share = (c.hp + c.armor) / (c.maxHp + c.maxArmor);
      healthBar(
        ctx,
        at.x - size * 0.28,
        at.y - size * 0.62,
        size * 0.56,
        share,
        false,
      );
    }
    for (const shot of r.shots) {
      if (shot.row !== row) continue;
      const at = cellPoint(l, row, shot.x);
      drawShot(ctx, shot, at.x, at.y - size * 0.12, size, t);
    }
  }

  for (const s of r.shreds) {
    const at = cellPoint(l, s.row, s.x);
    drawShredder(ctx, at.x, at.y, l.cellH, true, t);
  }

  view.fx.draw(ctx, p.font);
  drawBar(ctx, p, l, r, view);
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  r: Round,
  size: number,
  t: number,
) {
  const { row, col } = r.cursor;
  const x = l.shredW + col * l.cellW;
  const y = l.barH + row * l.cellH;
  const sel = r.selected;
  const taken = Boolean(helperAt(r, row, col));
  const ok = sel === "remove" ? taken : canPlace(r, sel, row, col) === "placed";
  rounded(ctx, x + 2, y + 2, l.cellW - 4, l.cellH - 4, 8);
  ctx.fillStyle = hsl(ok ? ART.white : ART.ember, 0, 0.22);
  ctx.fill();
  if (sel && sel !== "remove" && !taken) {
    ctx.globalAlpha = 0.45;
    const at = cellPoint(l, row, col + 0.5);
    drawHelper(ctx, sel, at.x, at.y, size, { ...RESTING, t }, false);
    ctx.globalAlpha = 1;
  }
  rounded(ctx, x + 2, y + 2, l.cellW - 4, l.cellH - 4, 8);
  ctx.strokeStyle = ok ? p.ring : p.destructive;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// Card pictures are the same every frame, so each is drawn once and kept.
const cardArt = new Map<string, HTMLCanvasElement>();

function cardPicture(kind: HelperKind, w: number, h: number, ratio: number) {
  const key = `${kind}:${w}x${h}:${ratio}`;
  let canvas = cardArt.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(w * ratio);
    canvas.height = Math.ceil(h * ratio);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      // Helpers stand on the floor of their box and rise about half their
      // size above its middle, so place them to fit the whole picture.
      const s = Math.min(h * 0.92, w * 0.95);
      drawHelper(ctx, kind, w / 2, h * 0.55, s, RESTING, false);
    }
    if (cardArt.size > 40) cardArt.clear();
    cardArt.set(key, canvas);
  }
  return canvas;
}

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x + s * 0.15, y - s * 0.5);
  ctx.lineTo(x - s * 0.3, y + s * 0.08);
  ctx.lineTo(x, y + s * 0.08);
  ctx.lineTo(x - s * 0.15, y + s * 0.5);
  ctx.lineTo(x + s * 0.3, y - s * 0.1);
  ctx.lineTo(x, y - s * 0.1);
  ctx.closePath();
  ctx.fillStyle = hsl(ART.gold, 0);
  ctx.fill();
  ctx.strokeStyle = hsl(ART.ink, 0, 0.6);
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.stroke();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  r: Round,
  view: View,
) {
  ctx.fillStyle = p.card;
  ctx.fillRect(0, 0, l.width, l.barH);
  ctx.fillStyle = p.border;
  ctx.fillRect(0, l.barH - 1, l.width, 1);

  // Energy, at the left, with a bolt. It swells as an orb lands.
  const ex = 6;
  const ew = l.card.x - 12;
  const swell = view.fx.pulse > 0 ? 1 + view.fx.pulse * 0.4 : 1;
  rounded(ctx, ex, l.card.y, ew, l.card.h, 10);
  ctx.fillStyle = p.warning;
  ctx.fill();
  ctx.strokeStyle = p["warning-border"];
  ctx.lineWidth = 1;
  ctx.stroke();
  const e = energyPoint(l);
  bolt(ctx, e.x, e.y, l.card.h * 0.5 * swell);
  ctx.fillStyle = p["warning-foreground"];
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(l.card.h * 0.34 * swell)}px ${p.font}`;
  ctx.fillText(
    String(Math.floor(r.energy)),
    ex + ew * 0.66,
    l.card.y + l.card.h * 0.62,
  );

  const list = tools(r);
  list.forEach((tool, i) => {
    const c = cardRect(l, i);
    const chosen = r.selected === tool;
    const def = tool === "remove" ? null : HELPERS[tool];
    const ready = !def || (r.energy >= def.cost && r.cooldowns[def.kind] <= 0);
    rounded(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fillStyle = chosen ? p.accent : p.background;
    ctx.fill();
    ctx.strokeStyle = chosen ? p.primary : p.border;
    ctx.lineWidth = chosen ? 2 : 1;
    ctx.stroke();

    ctx.globalAlpha = ready ? 1 : 0.4;
    if (def) {
      const picH = c.h * 0.72;
      ctx.drawImage(
        cardPicture(def.kind, c.w, picH, view.ratio),
        c.x,
        c.y,
        c.w,
        picH,
      );
      ctx.fillStyle = p.foreground;
      ctx.font = `700 ${Math.round(c.h * 0.21)}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.fillText(String(def.cost), c.x + c.w / 2, c.y + c.h - 4);
    } else {
      ctx.strokeStyle = p["destructive-soft-foreground"];
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      const m = c.h * 0.14;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h * 0.4;
      ctx.beginPath();
      ctx.moveTo(cx - m, cy - m);
      ctx.lineTo(cx + m, cy + m);
      ctx.moveTo(cx + m, cy - m);
      ctx.lineTo(cx - m, cy + m);
      ctx.stroke();
      ctx.fillStyle = p.foreground;
      ctx.font = `600 ${Math.round(c.h * 0.17)}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.fillText("Remove", cx, c.y + c.h - 4);
    }
    ctx.globalAlpha = 1;

    // The card refills from the top while it recharges.
    if (def && r.cooldowns[def.kind] > 0) {
      const share = r.cooldowns[def.kind] / (def.recharge * r.boosts.recharge);
      ctx.save();
      rounded(ctx, c.x, c.y, c.w, c.h, 8);
      ctx.clip();
      ctx.fillStyle = p.foreground;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(c.x, c.y, c.w, c.h * share);
      ctx.restore();
    }

    // The key that picks the card.
    ctx.fillStyle = p["muted-foreground"];
    ctx.font = `700 ${Math.round(c.h * 0.17)}px ${p.font}`;
    ctx.textAlign = "left";
    ctx.fillText(
      tool === "remove" ? "X" : String(i + 1),
      c.x + 4,
      c.y + c.h * 0.22,
    );
  });

  // How far through the level, at the right, with a fuzzball marching
  // along it and a flag for the big wave.
  const last = cardRect(l, list.length - 1);
  const px = last.x + last.w + 10;
  const pw = l.width - px - 10;
  if (pw < 40) return;
  ctx.fillStyle = p.foreground;
  ctx.textAlign = "left";
  ctx.font = `700 ${Math.round(l.card.h * 0.22)}px ${p.font}`;
  ctx.fillText(`Level ${r.level.number}`, px, l.card.y + l.card.h * 0.28, pw);
  ctx.fillStyle = p["muted-foreground"];
  ctx.font = `500 ${Math.round(l.card.h * 0.18)}px ${p.font}`;
  ctx.fillText(r.level.name, px, l.card.y + l.card.h * 0.52, pw);
  const by = l.card.y + l.card.h * 0.78;
  rounded(ctx, px, by - 3, pw, 6, 3);
  ctx.fillStyle = p.border;
  ctx.fill();
  const share = Math.min(1, progress(r));
  rounded(ctx, px, by - 3, Math.max(6, pw * share), 6, 3);
  ctx.fillStyle = p.primary;
  ctx.fill();
  const total = r.level.spawns.length;
  const firstBig = r.level.spawns.findIndex((s) => s.at >= r.level.bigWaveAt);
  if (firstBig > 0 && total > 0) {
    const fx = px + (pw * firstBig) / total;
    ctx.fillStyle = p.foreground;
    ctx.fillRect(fx, by - 10, 1.5, 12);
    ctx.beginPath();
    ctx.moveTo(fx + 1.5, by - 10);
    ctx.lineTo(fx + 8, by - 7);
    ctx.lineTo(fx + 1.5, by - 4);
    ctx.fillStyle = p.destructive;
    ctx.fill();
  }
  const head = furSprite("fuzzball", l.card.h * 0.34, view.ratio, false);
  if (head) {
    const hx = px + pw * share;
    ctx.drawImage(
      head.canvas,
      hx - head.half,
      by - head.half,
      head.half * 2,
      head.half * 2,
    );
    ctx.fillStyle = hsl(ART.ink);
    ellipse(
      ctx,
      hx - head.half * 0.25,
      by - head.half * 0.1,
      head.half * 0.09,
      head.half * 0.11,
    );
    ctx.fill();
    ellipse(
      ctx,
      hx + head.half * 0.08,
      by - head.half * 0.1,
      head.half * 0.09,
      head.half * 0.11,
    );
    ctx.fill();
  }
}

// A single critter or helper, for the menus and the level cards.
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  thing:
    | { type: "helper"; kind: HelperKind }
    | { type: "critter"; kind: CritterKind },
  w: number,
  h: number,
  ratio: number,
  t: number,
) {
  ctx.clearRect(0, 0, w, h);
  const s = Math.min(w, h) * 0.78;
  if (thing.type === "helper") {
    drawHelper(ctx, thing.kind, w / 2, h / 2 - s * 0.05, s, { ...RESTING, t });
    return;
  }
  const c = sampleCritter(thing.kind);
  const scale = Math.max(1.2, CRITTERS[thing.kind].scale);
  drawCritter(ctx, c, w / 2, h / 2 + s * 0.1, s / scale, {
    t,
    still: true,
    ratio,
  });
}
