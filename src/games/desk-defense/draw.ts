import { COLS, ROWS } from "~/games/desk-defense/levels";
import type { Bug, Helper, Round, Tool } from "~/games/desk-defense/round";
import { canPlace, helperAt, progress } from "~/games/desk-defense/round";
import type { BugKind, HelperKind } from "~/games/desk-defense/units";
import { HELPERS } from "~/games/desk-defense/units";

// Draws a round onto the canvas. Every color is read from the theme's CSS
// variables when the game opens, so the desk matches the screen around it.

type Token =
  | "background"
  | "foreground"
  | "card"
  | "muted"
  | "muted-foreground"
  | "secondary"
  | "secondary-foreground"
  | "border"
  | "primary"
  | "primary-foreground"
  | "accent"
  | "accent-strong"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "warning-border"
  | "destructive"
  | "destructive-soft"
  | "destructive-soft-foreground"
  | "destructive-soft-border"
  | "note"
  | "note-foreground"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-muted"
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
    secondary: v("secondary"),
    "secondary-foreground": v("secondary-foreground"),
    border: v("border"),
    primary: v("primary"),
    "primary-foreground": v("primary-foreground"),
    accent: v("accent"),
    "accent-strong": v("accent-strong"),
    success: v("success"),
    "success-foreground": v("success-foreground"),
    warning: v("warning"),
    "warning-foreground": v("warning-foreground"),
    "warning-border": v("warning-border"),
    destructive: v("destructive"),
    "destructive-soft": v("destructive-soft"),
    "destructive-soft-foreground": v("destructive-soft-foreground"),
    "destructive-soft-border": v("destructive-soft-border"),
    note: v("note"),
    "note-foreground": v("note-foreground"),
    "chart-2": v("chart-2"),
    "chart-3": v("chart-3"),
    "chart-4": v("chart-4"),
    "chart-muted": v("chart-muted"),
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
  const barH = Math.round(Math.max(40, height * 0.18));
  const shredW = Math.round(width * 0.05);
  const cardH = barH - 10;
  return {
    width,
    height,
    barH,
    shredW,
    cellW: (width - shredW) / COLS,
    cellH: (height - barH) / ROWS,
    card: {
      x: Math.round(width * 0.13),
      y: 5,
      w: Math.round(cardH * 0.95),
      h: cardH,
    },
    cardGap: 4,
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

// One helper, drawn in a box of size s with its middle at (cx, cy).
export function drawHelper(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  kind: HelperKind,
  cx: number,
  cy: number,
  s: number,
  time: number,
) {
  const u = s / 10;
  ctx.save();
  ctx.lineWidth = Math.max(1, u * 0.5);
  switch (kind) {
    case "coffee": {
      ctx.fillStyle = p["note-foreground"];
      roundRect(ctx, cx - 3 * u, cy - 2 * u, 5 * u, 5.5 * u, u);
      ctx.fill();
      ctx.strokeStyle = p["note-foreground"];
      ctx.lineWidth = u;
      ctx.beginPath();
      ctx.arc(cx + 2.4 * u, cy + 0.6 * u, 1.4 * u, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = p.note;
      ctx.fillRect(cx - 2.2 * u, cy - 1.2 * u, 3.4 * u, 0.8 * u);
      ctx.strokeStyle = p["muted-foreground"];
      ctx.lineWidth = Math.max(1, u * 0.4);
      for (let i = 0; i < 2; i++) {
        const sway = Math.sin(time * 3 + i) * 0.5 * u;
        ctx.beginPath();
        ctx.moveTo(cx - u + i * 1.6 * u, cy - 2.6 * u);
        ctx.quadraticCurveTo(
          cx - u + i * 1.6 * u + sway,
          cy - 3.6 * u,
          cx - u + i * 1.6 * u,
          cy - 4.4 * u,
        );
        ctx.stroke();
      }
      break;
    }
    case "stapler": {
      ctx.fillStyle = p["secondary-foreground"];
      roundRect(ctx, cx - 4 * u, cy + 1 * u, 8 * u, 2 * u, u * 0.6);
      ctx.fill();
      ctx.fillStyle = p.primary;
      roundRect(ctx, cx - 4 * u, cy - 1.6 * u, 8.4 * u, 2.4 * u, u);
      ctx.fill();
      ctx.fillStyle = p.foreground;
      ctx.beginPath();
      ctx.arc(cx - 3.2 * u, cy + 0.2 * u, 1 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "firewall": {
      ctx.fillStyle = p["destructive-soft"];
      roundRect(ctx, cx - 3.5 * u, cy - 4 * u, 7 * u, 8 * u, u * 0.6);
      ctx.fill();
      ctx.strokeStyle = p["destructive-soft-foreground"];
      ctx.stroke();
      for (let i = 1; i < 4; i++) {
        const y = cy - 4 * u + i * 2 * u;
        ctx.beginPath();
        ctx.moveTo(cx - 3.5 * u, y);
        ctx.lineTo(cx + 3.5 * u, y);
        ctx.stroke();
        const off = i % 2 === 0 ? 0 : 1.75 * u;
        ctx.beginPath();
        ctx.moveTo(cx - off, y);
        ctx.lineTo(cx - off, y - 2 * u);
        ctx.stroke();
      }
      break;
    }
    case "fan": {
      ctx.fillStyle = p["secondary-foreground"];
      ctx.fillRect(cx - 0.4 * u, cy, 0.8 * u, 4 * u);
      roundRect(ctx, cx - 2.5 * u, cy + 3.4 * u, 5 * u, u, u * 0.4);
      ctx.fill();
      ctx.strokeStyle = p["chart-2"];
      ctx.beginPath();
      ctx.arc(cx, cy - 1 * u, 3.2 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p["chart-3"];
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(a) * 1.5 * u,
          cy - u + Math.sin(a) * 1.5 * u,
          1.5 * u,
          0.8 * u,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
    }
    case "printer": {
      ctx.fillStyle = p.card;
      ctx.strokeStyle = p["muted-foreground"];
      ctx.fillRect(cx - 2 * u, cy - 4 * u, 4 * u, 3 * u);
      ctx.strokeRect(cx - 2 * u, cy - 4 * u, 4 * u, 3 * u);
      ctx.fillStyle = p["chart-muted"];
      roundRect(ctx, cx - 4 * u, cy - 1.5 * u, 8 * u, 4.5 * u, u);
      ctx.fill();
      ctx.fillStyle = p.card;
      ctx.fillRect(cx - 2.5 * u, cy + 1.6 * u, 5 * u, 0.6 * u);
      ctx.fillStyle = p.success;
      ctx.beginPath();
      ctx.arc(cx + 2.8 * u, cy - 0.4 * u, 0.5 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "eraser": {
      ctx.translate(cx, cy);
      ctx.rotate(-0.3);
      ctx.fillStyle = p["destructive-soft-border"];
      roundRect(ctx, -4 * u, -2 * u, 5 * u, 4 * u, u * 0.6);
      ctx.fill();
      ctx.fillStyle = p.primary;
      roundRect(ctx, 0.6 * u, -2 * u, 3.4 * u, 4 * u, u * 0.6);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function bugColor(p: Palette, kind: BugKind): string {
  switch (kind) {
    case "bug":
      return p["success-foreground"];
    case "spam":
      return p["warning-foreground"];
    case "virus":
      return p["accent-strong"];
    case "phish":
      return p["chart-2"];
    case "trojan":
      return p.foreground;
    case "ransom":
      return p.destructive;
  }
}

function drawBug(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  bug: Bug,
  cx: number,
  cy: number,
  s: number,
  time: number,
  still: boolean,
) {
  const big = bug.kind === "ransom" ? 1.5 : bug.kind === "trojan" ? 1.15 : 1;
  const u = (s / 10) * big;
  const walk =
    still || bug.chewing ? 0 : Math.sin(time * 12 + bug.id) * 0.6 * u;
  const chew = bug.chewing && !still ? Math.sin(time * 20) * 0.4 * u : 0;
  const color = bug.flash > 0 ? p.card : bugColor(p, bug.kind);
  ctx.save();
  ctx.translate(cx + chew, cy);

  ctx.strokeStyle = p.foreground;
  ctx.lineWidth = Math.max(1, u * 0.35);
  for (let i = -1; i <= 1; i++) {
    const swing = i === 0 ? -walk : walk;
    ctx.beginPath();
    ctx.moveTo(i * 1.4 * u, 0);
    ctx.lineTo(i * 1.8 * u + swing, 2.8 * u);
    ctx.moveTo(i * 1.4 * u, 0);
    ctx.lineTo(i * 1.8 * u - swing, -2.8 * u);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0.4 * u, 0, 3 * u, 2.2 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-2.6 * u, 0, 1.5 * u, 0, Math.PI * 2);
  ctx.fill();

  if (bug.kind === "trojan") {
    ctx.fillStyle = p["chart-muted"];
    roundRect(ctx, -0.6 * u, -1.6 * u, 3 * u, 3.2 * u, u * 0.5);
    ctx.fill();
  }
  if (bug.kind === "phish") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(3 * u, 0);
    ctx.lineTo(4.6 * u, -1.6 * u);
    ctx.lineTo(4.6 * u, 1.6 * u);
    ctx.fill();
  }
  if (bug.kind === "ransom") {
    ctx.strokeStyle = p.card;
    ctx.lineWidth = Math.max(1, u * 0.4);
    ctx.beginPath();
    ctx.arc(0.6 * u, -0.6 * u, 0.8 * u, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = p.card;
    ctx.fillRect(-0.4 * u, -0.6 * u, 2 * u, 1.6 * u);
  }
  if (bug.kind === "virus") {
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(
        0.4 * u + Math.cos(a) * 2.8 * u,
        Math.sin(a) * 2.2 * u,
        0.5 * u,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Eyes, and two feelers.
  ctx.fillStyle = p.card;
  ctx.beginPath();
  ctx.arc(-3 * u, -0.6 * u, 0.55 * u, 0, Math.PI * 2);
  ctx.arc(-3 * u, 0.6 * u, 0.55 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.foreground;
  ctx.beginPath();
  ctx.moveTo(-3.8 * u, -0.8 * u);
  ctx.lineTo(-5 * u, -2 * u);
  ctx.moveTo(-3.8 * u, 0.8 * u);
  ctx.lineTo(-5 * u, 2 * u);
  ctx.stroke();

  if (bug.slowFor > 0) {
    ctx.strokeStyle = p["chart-3"];
    ctx.lineWidth = Math.max(1, u * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.4 * u, 3.2 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function healthBar(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  w: number,
  share: number,
  good: boolean,
) {
  if (share >= 1) return;
  ctx.fillStyle = p.border;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = good ? p["success-foreground"] : p.destructive;
  ctx.fillRect(x, y, w * Math.max(0, share), 3);
}

export function drawRound(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  r: Round,
  // Real seconds, for wiggles. Stands still when motion is reduced.
  time: number,
  still: boolean,
  showCursor: boolean,
) {
  const wiggle = still ? 0 : time;
  ctx.clearRect(0, 0, l.width, l.height);
  ctx.fillStyle = p.card;
  ctx.fillRect(0, 0, l.width, l.height);

  // The desk: one row per lane, closed rows greyed out.
  for (let row = 0; row < ROWS; row++) {
    const y = l.barH + row * l.cellH;
    const open = r.level.rows.includes(row);
    for (let col = 0; col < COLS; col++) {
      const x = l.shredW + col * l.cellW;
      ctx.fillStyle = open ? p.card : p.muted;
      ctx.fillRect(x, y, l.cellW + 0.5, l.cellH + 0.5);
      if (open) {
        // A soft teal checkerboard, so each cell reads as a place to build.
        ctx.globalAlpha = (row + col) % 2 === 0 ? 0.75 : 0.4;
        ctx.fillStyle = p.accent;
        ctx.fillRect(x, y, l.cellW + 0.5, l.cellH + 0.5);
        ctx.globalAlpha = 1;
      }
    }
    if (!open) {
      // Closed rows get a light hatch, so they do not look like desk.
      ctx.save();
      ctx.beginPath();
      ctx.rect(l.shredW, y, l.width - l.shredW, l.cellH);
      ctx.clip();
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      for (let x = l.shredW - l.cellH; x < l.width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, y + l.cellH);
        ctx.lineTo(x + l.cellH, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = p.muted;
    ctx.fillRect(0, y, l.shredW, l.cellH);
    if (open && r.shredders[row]) {
      ctx.fillStyle = p["secondary-foreground"];
      roundRect(ctx, 3, y + l.cellH * 0.3, l.shredW - 6, l.cellH * 0.4, 3);
      ctx.fill();
      ctx.fillStyle = p.warning;
      ctx.fillRect(5, y + l.cellH * 0.45, l.shredW - 10, l.cellH * 0.1);
    }
  }
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, l.barH + 0.5);
  ctx.lineTo(l.width, l.barH + 0.5);
  ctx.stroke();

  const size = Math.min(l.cellW, l.cellH) * 0.9;
  const cellMid = (row: number, col: number) => ({
    x: l.shredW + (col + 0.5) * l.cellW,
    y: l.barH + (row + 0.5) * l.cellH,
  });

  // The cursor, with a faint copy of the chosen helper where it would go.
  if (showCursor) {
    const { row, col } = r.cursor;
    const x = l.shredW + col * l.cellW;
    const y = l.barH + row * l.cellH;
    const sel = r.selected;
    const ok =
      sel === "remove"
        ? Boolean(helperAt(r, row, col))
        : canPlace(r, sel, row, col) === "placed";
    if (sel && sel !== "remove" && !helperAt(r, row, col)) {
      const mid = cellMid(row, col);
      ctx.globalAlpha = 0.35;
      drawHelper(ctx, p, sel, mid.x, mid.y, size, wiggle);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = ok ? p.ring : p.destructive;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 2, y + 2, l.cellW - 4, l.cellH - 4, 6);
    ctx.stroke();
  }

  for (const h of r.helpers) drawPlaced(ctx, p, l, h, size, wiggle, cellMid);

  for (const shot of r.shots) {
    const x = l.shredW + shot.x * l.cellW;
    const y = l.barH + (shot.row + 0.5) * l.cellH - size * 0.1;
    ctx.fillStyle = shot.slows ? p["chart-3"] : p.foreground;
    if (shot.slows) {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x - size * 0.08, y - 1.5, size * 0.16, 3);
    }
  }

  const bugs = [...r.bugs].sort((a, b) => a.row - b.row);
  for (const bug of bugs) {
    const x = l.shredW + bug.x * l.cellW;
    const y = l.barH + (bug.row + 0.5) * l.cellH;
    drawBug(ctx, p, bug, x, y, size, wiggle, still);
    healthBar(
      ctx,
      p,
      x - size * 0.3,
      y - size * 0.45,
      size * 0.6,
      bug.hp / bug.maxHp,
      false,
    );
  }

  for (const e of r.effects) {
    const y = l.barH + (e.row + 0.5) * l.cellH;
    const x = l.shredW + e.x * l.cellW;
    if (e.kind === "energy") {
      ctx.globalAlpha = Math.max(0, 1 - e.age);
      ctx.fillStyle = p["warning-foreground"];
      ctx.font = `600 ${Math.round(size * 0.28)}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.fillText("+25", x, y - size * 0.4 - (still ? 0 : e.age * 14));
      ctx.globalAlpha = 1;
    } else if (e.kind === "burst") {
      ctx.globalAlpha = Math.max(0, 1 - e.age * 2);
      ctx.fillStyle = p["destructive-soft-border"];
      ctx.beginPath();
      const grow = still ? 1 : 0.5 + e.age;
      ctx.ellipse(
        x,
        y,
        l.cellW * 1.6 * grow,
        l.cellH * 1.4 * grow,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p["secondary-foreground"];
      roundRect(
        ctx,
        x - l.cellW * 0.4,
        y - l.cellH * 0.3,
        l.cellW * 0.8,
        l.cellH * 0.6,
        4,
      );
      ctx.fill();
      ctx.fillStyle = p.warning;
      ctx.fillRect(x + l.cellW * 0.3, y - l.cellH * 0.3, 3, l.cellH * 0.6);
    }
  }

  drawBar(ctx, p, l, r);
}

function drawPlaced(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  h: Helper,
  size: number,
  time: number,
  cellMid: (row: number, col: number) => { x: number; y: number },
) {
  const mid = cellMid(h.row, h.col);
  drawHelper(ctx, p, h.kind, mid.x, mid.y, size, time);
  if (h.kind === "eraser") {
    // A ring that closes as the eraser gets ready to wipe.
    const share = 1 - Math.max(0, h.timer) / HELPERS.eraser.every;
    ctx.strokeStyle = p.destructive;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      mid.x,
      mid.y,
      size * 0.45,
      -Math.PI / 2,
      -Math.PI / 2 + share * Math.PI * 2,
    );
    ctx.stroke();
    return;
  }
  healthBar(
    ctx,
    p,
    mid.x - size * 0.35,
    mid.y + size * 0.42,
    size * 0.7,
    h.hp / h.maxHp,
    true,
  );
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  l: Layout,
  r: Round,
) {
  // Energy, at the left.
  const ex = 6;
  const ew = l.card.x - 12;
  ctx.fillStyle = p.warning;
  roundRect(ctx, ex, l.card.y, ew, l.card.h, 8);
  ctx.fill();
  ctx.strokeStyle = p["warning-border"];
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = p["warning-foreground"];
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(l.card.h * 0.2)}px ${p.font}`;
  ctx.fillText("Energy", ex + ew / 2, l.card.y + l.card.h * 0.36);
  ctx.font = `700 ${Math.round(l.card.h * 0.34)}px ${p.font}`;
  ctx.fillText(
    String(Math.floor(r.energy)),
    ex + ew / 2,
    l.card.y + l.card.h * 0.8,
  );

  // The cards.
  const list = tools(r);
  list.forEach((tool, i) => {
    const c = cardRect(l, i);
    const chosen = r.selected === tool;
    const def = tool === "remove" ? null : HELPERS[tool];
    const ready = !def || (r.energy >= def.cost && r.cooldowns[def.kind] <= 0);
    ctx.fillStyle = chosen ? p.accent : p.card;
    roundRect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.strokeStyle = chosen ? p.primary : p.border;
    ctx.lineWidth = chosen ? 2 : 1;
    ctx.stroke();

    ctx.globalAlpha = ready ? 1 : 0.4;
    if (def) {
      drawHelper(
        ctx,
        p,
        def.kind,
        c.x + c.w / 2,
        c.y + c.h * 0.42,
        c.h * 0.55,
        0,
      );
      ctx.fillStyle = p.foreground;
      ctx.font = `600 ${Math.round(c.h * 0.2)}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.fillText(String(def.cost), c.x + c.w / 2, c.y + c.h - 4);
    } else {
      ctx.strokeStyle = p["destructive-soft-foreground"];
      ctx.lineWidth = 2;
      const m = c.h * 0.16;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx - m, cy - m);
      ctx.lineTo(cx + m, cy + m);
      ctx.moveTo(cx + m, cy - m);
      ctx.lineTo(cx - m, cy + m);
      ctx.stroke();
      ctx.fillStyle = p.foreground;
      ctx.font = `600 ${Math.round(c.h * 0.18)}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.fillText("Remove", cx, c.y + c.h - 4);
    }
    ctx.globalAlpha = 1;

    // The card refills from the bottom while it recharges.
    if (def && r.cooldowns[def.kind] > 0) {
      const share = r.cooldowns[def.kind] / (def.recharge * r.boosts.recharge);
      ctx.fillStyle = p.foreground;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(c.x + 1, c.y + 1, c.w - 2, (c.h - 2) * share);
      ctx.globalAlpha = 1;
    }

    // The key that picks the card.
    ctx.fillStyle = p["muted-foreground"];
    ctx.font = `600 ${Math.round(c.h * 0.17)}px ${p.font}`;
    ctx.textAlign = "left";
    ctx.fillText(
      tool === "remove" ? "X" : String(i + 1),
      c.x + 4,
      c.y + c.h * 0.22,
    );
  });

  // How far through the level, at the right, with a flag for the big wave.
  const last = cardRect(l, list.length - 1);
  const px = last.x + last.w + 12;
  const pw = l.width - px - 8;
  if (pw < 40) return;
  ctx.fillStyle = p.foreground;
  ctx.textAlign = "left";
  ctx.font = `600 ${Math.round(l.card.h * 0.22)}px ${p.font}`;
  ctx.fillText(`Level ${r.level.number}`, px, l.card.y + l.card.h * 0.3, pw);
  ctx.fillStyle = p["muted-foreground"];
  ctx.font = `400 ${Math.round(l.card.h * 0.19)}px ${p.font}`;
  ctx.fillText(r.level.name, px, l.card.y + l.card.h * 0.56, pw);
  const by = l.card.y + l.card.h * 0.74;
  ctx.fillStyle = p.border;
  roundRect(ctx, px, by, pw, 6, 3);
  ctx.fill();
  ctx.fillStyle = p.primary;
  roundRect(ctx, px, by, Math.max(6, pw * Math.min(1, progress(r))), 6, 3);
  ctx.fill();
  const total = r.level.spawns.length;
  const firstBig = r.level.spawns.findIndex((s) => s.at >= r.level.bigWaveAt);
  if (firstBig > 0 && total > 0) {
    const fx = px + (pw * firstBig) / total;
    ctx.fillStyle = p.destructive;
    ctx.fillRect(fx, by - 6, 1.5, 12);
    ctx.beginPath();
    ctx.moveTo(fx + 1.5, by - 6);
    ctx.lineTo(fx + 7, by - 3.5);
    ctx.lineTo(fx + 1.5, by - 1);
    ctx.fill();
  }
}
