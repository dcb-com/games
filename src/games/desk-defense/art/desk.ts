import type { Ctx, Hsl } from "~/games/art/color";
import {
  ART,
  ellipse,
  hsl,
  outline,
  rounded,
  seeded,
  shade,
  shadeDown,
} from "~/games/art/color";
import type { Cell, Theme } from "~/games/desk-defense/levels";
import type { Shot } from "~/games/desk-defense/round";

// The desk the critters cross, the shredders at its left end, and the
// things helpers throw.

export interface Field {
  width: number;
  height: number;
  top: number;
  left: number;
  cellW: number;
  cellH: number;
  rows: number;
  cols: number;
}

const cache = new Map<string, HTMLCanvasElement>();

// Closed rows are taped off, in every world.
function closedTape(ctx: Ctx, f: Field, y: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.left, y + f.cellH * 0.38, f.width - f.left, f.cellH * 0.24);
  ctx.clip();
  ctx.fillStyle = hsl(ART.yellow, 0, 0.75);
  ctx.fillRect(f.left, y, f.width - f.left, f.cellH);
  ctx.fillStyle = hsl(ART.ink, 0, 0.65);
  for (let x = f.left - f.cellH; x < f.width; x += f.cellH * 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, y + f.cellH);
    ctx.lineTo(x + f.cellH * 0.25, y + f.cellH);
    ctx.lineTo(x + f.cellH * 0.85, y);
    ctx.lineTo(x + f.cellH * 0.6, y);
    ctx.fill();
  }
  ctx.restore();
}

// The rail on the left where the shredders sit, and a little depth: a
// shadow under the card bar, and the far end fading into shade where the
// critters come from.
function railAndDepth(ctx: Ctx, f: Field, color: Hsl) {
  const rail = ctx.createLinearGradient(0, 0, f.left, 0);
  rail.addColorStop(0, hsl(color, -6));
  rail.addColorStop(1, hsl(color, 10));
  ctx.fillStyle = rail;
  ctx.fillRect(0, f.top, f.left, f.height - f.top);

  const top = ctx.createLinearGradient(0, f.top, 0, f.top + 10);
  top.addColorStop(0, hsl(ART.shadow, 0, 0.35));
  top.addColorStop(1, hsl(ART.shadow, 0, 0));
  ctx.fillStyle = top;
  ctx.fillRect(0, f.top, f.width, 10);
  const far = ctx.createLinearGradient(f.width - f.cellW * 0.8, 0, f.width, 0);
  far.addColorStop(0, hsl(ART.shadow, 0, 0));
  far.addColorStop(1, hsl(ART.shadow, 0, 0.3));
  ctx.fillStyle = far;
  ctx.fillRect(f.width - f.cellW * 0.8, f.top, f.cellW * 0.8, f.height - f.top);
}

function paintOffice(ctx: Ctx, f: Field, open: number[]) {
  const random = seeded(7);
  for (let row = 0; row < f.rows; row++) {
    const y = f.top + row * f.cellH;
    const isOpen = open.includes(row);
    const plank = isOpen ? ART.wood : ART.closed;
    const tone = row % 2 === 0 ? 2 : -2;
    ctx.fillStyle = hsl(plank, tone);
    ctx.fillRect(f.left, y, f.width - f.left, f.cellH);

    if (isOpen) {
      // Light and dark squares, like mown grass, so each cell is easy to see.
      for (let col = 0; col < f.cols; col++) {
        if ((row + col) % 2 !== 0) continue;
        ctx.fillStyle = hsl(ART.wood, 10, 0.32);
        ctx.fillRect(f.left + col * f.cellW, y, f.cellW, f.cellH);
      }
    }

    // Wood grain.
    ctx.strokeStyle = hsl(plank, -16, isOpen ? 0.22 : 0.18);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const gy = y + f.cellH * (0.12 + random() * 0.8);
      ctx.beginPath();
      ctx.moveTo(f.left, gy);
      for (let x = f.left; x <= f.width; x += 24) {
        ctx.lineTo(x, gy + Math.sin(x * 0.03 + i * 1.7) * f.cellH * 0.05);
      }
      ctx.stroke();
    }
    // A knot here and there.
    if (random() < 0.7) {
      const kx = f.left + random() * (f.width - f.left);
      const ky = y + f.cellH * (0.3 + random() * 0.4);
      ellipse(ctx, kx, ky, f.cellW * 0.12, f.cellH * 0.06);
      ctx.strokeStyle = hsl(plank, -22, 0.35);
      ctx.stroke();
    }

    // The seam between planks.
    ctx.fillStyle = hsl(plank, -24, 0.5);
    ctx.fillRect(f.left, y + f.cellH - 1.5, f.width - f.left, 1.5);
    ctx.fillStyle = hsl(plank, 16, 0.4);
    ctx.fillRect(f.left, y, f.width - f.left, 1);

    if (!isOpen) closedTape(ctx, f, y);
  }

  // A few coffee rings and a paper clip, for a lived-in desk.
  for (let i = 0; i < 4; i++) {
    const row = open[Math.floor(random() * open.length)] ?? 2;
    const x = f.left + f.cellW * (1 + random() * (f.cols - 2));
    const y = f.top + (row + 0.5) * f.cellH;
    ellipse(ctx, x, y, f.cellH * 0.28, f.cellH * 0.24);
    ctx.strokeStyle = hsl(ART.stain, 0, 0.16);
    ctx.lineWidth = f.cellH * 0.05;
    ctx.stroke();
  }

  railAndDepth(ctx, f, ART.rail);
}

// What a world's floor needs to know: which rows are open, and where its
// puddles and cables lie.
export interface Scene {
  theme: Theme;
  open: number[];
  puddles: Cell[];
  cables: Cell[];
}

const TILE: Hsl = { h: 200, s: 40, l: 90 };
const GROUT: Hsl = { h: 205, s: 18, l: 74 };
const COUNTER: Hsl = { h: 4, s: 60, l: 58 };
const FLOOR: Hsl = { h: 225, s: 26, l: 20 };
const GLOW: Hsl = { h: 186, s: 95, l: 58 };
const LAWN: Hsl = { h: 104, s: 50, l: 50 };
const PLANTER: Hsl = { h: 24, s: 45, l: 38 };

// The break room: blue and white kitchen tiles, with coffee puddles.
function paintBreakroom(ctx: Ctx, f: Field, scene: Scene) {
  const random = seeded(11);
  for (let row = 0; row < f.rows; row++) {
    const y = f.top + row * f.cellH;
    const isOpen = scene.open.includes(row);
    for (let col = 0; col < f.cols; col++) {
      const x = f.left + col * f.cellW;
      ctx.fillStyle = hsl(
        isOpen ? TILE : GROUT,
        (row + col) % 2 === 0 ? 4 : -6,
      );
      ctx.fillRect(x, y, f.cellW + 0.5, f.cellH + 0.5);
      // Four small tiles to a cell, with grout between.
      ctx.strokeStyle = hsl(GROUT, 0, 0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, f.cellW / 2, f.cellH / 2);
      ctx.strokeRect(
        x + f.cellW / 2 + 0.5,
        y + f.cellH / 2 + 0.5,
        f.cellW / 2,
        f.cellH / 2,
      );
      // A shine on a few.
      if (random() < 0.25) {
        ctx.fillStyle = hsl(ART.white, 0, 0.35);
        ctx.fillRect(
          x + f.cellW * 0.1,
          y + f.cellH * 0.1,
          f.cellW * 0.12,
          f.cellH * 0.05,
        );
      }
    }
    if (!isOpen) closedTape(ctx, f, y);
  }
  for (const p of scene.puddles) {
    const x = f.left + (p.col + 0.5) * f.cellW;
    const y = f.top + (p.row + 0.55) * f.cellH;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r =
        1 + Math.sin(a * 3 + p.col) * 0.1 + Math.sin(a * 5 + p.row) * 0.05;
      ctx.lineTo(
        x + Math.cos(a) * f.cellW * 0.42 * r,
        y + Math.sin(a) * f.cellH * 0.3 * r,
      );
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(
      x - f.cellW * 0.1,
      y - f.cellH * 0.08,
      0,
      x,
      y,
      f.cellW * 0.45,
    );
    g.addColorStop(0, hsl(ART.brew, 22, 0.9));
    g.addColorStop(1, hsl(ART.brew, 0, 0.85));
    ctx.fillStyle = g;
    ctx.fill();
    ellipse(
      ctx,
      x - f.cellW * 0.14,
      y - f.cellH * 0.1,
      f.cellW * 0.08,
      f.cellH * 0.04,
    );
    ctx.fillStyle = hsl(ART.white, 0, 0.6);
    ctx.fill();
  }
  railAndDepth(ctx, f, COUNTER);
}

// The server room: dark floor panels with vents, and glowing cables.
function paintServer(ctx: Ctx, f: Field, scene: Scene) {
  for (let row = 0; row < f.rows; row++) {
    const y = f.top + row * f.cellH;
    const isOpen = scene.open.includes(row);
    for (let col = 0; col < f.cols; col++) {
      const x = f.left + col * f.cellW;
      ctx.fillStyle = hsl(FLOOR, isOpen ? ((row + col) % 2 === 0 ? 6 : 2) : -4);
      ctx.fillRect(x, y, f.cellW + 0.5, f.cellH + 0.5);
      rounded(ctx, x + 2, y + 2, f.cellW - 4, f.cellH - 4, 3);
      ctx.strokeStyle = hsl(FLOOR, 14, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Vent holes.
      ctx.fillStyle = hsl(FLOOR, -8);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          ellipse(
            ctx,
            x + f.cellW * (0.3 + i * 0.13),
            y + f.cellH * (0.35 + j * 0.15),
            1.3,
            1.3,
          );
          ctx.fill();
        }
      }
    }
    if (!isOpen) closedTape(ctx, f, y);
  }
  for (const c of scene.cables) {
    const x = f.left + c.col * f.cellW;
    const y = f.top + (c.row + 0.78) * f.cellH;
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, hsl(GLOW, 0, 0));
    g.addColorStop(0.5, hsl(GLOW, 0, 0.55));
    g.addColorStop(1, hsl(GLOW, 0, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y - 6, f.cellW, 12);
    ctx.strokeStyle = hsl(GLOW, 10);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.bezierCurveTo(
      x + f.cellW * 0.3,
      y - 5,
      x + f.cellW * 0.6,
      y + 5,
      x + f.cellW - 3,
      y,
    );
    ctx.stroke();
    // A plug at each end.
    ctx.fillStyle = hsl(GLOW, 30);
    ellipse(ctx, x + 3, y, 2.5, 2.5);
    ctx.fill();
    ellipse(ctx, x + f.cellW - 3, y, 2.5, 2.5);
    ctx.fill();
  }
  railAndDepth(ctx, f, { h: 225, s: 30, l: 14 });
}

// The rooftop: a mown lawn in stripes, with flowers and a planter rail.
function paintRooftop(ctx: Ctx, f: Field, scene: Scene) {
  const random = seeded(19);
  for (let row = 0; row < f.rows; row++) {
    const y = f.top + row * f.cellH;
    const isOpen = scene.open.includes(row);
    for (let col = 0; col < f.cols; col++) {
      const x = f.left + col * f.cellW;
      ctx.fillStyle = isOpen
        ? hsl(LAWN, (row + col) % 2 === 0 ? 6 : -2)
        : hsl(ART.closed, (row + col) % 2 === 0 ? 2 : -2);
      ctx.fillRect(x, y, f.cellW + 0.5, f.cellH + 0.5);
    }
    if (isOpen) {
      // Blades of grass.
      ctx.strokeStyle = hsl(LAWN, -14, 0.5);
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const gx = f.left + random() * (f.width - f.left);
        const gy = y + random() * f.cellH;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 1, gy - 4);
        ctx.stroke();
      }
      // A few flowers.
      for (let i = 0; i < 2; i++) {
        const fx = f.left + random() * (f.width - f.left);
        const fy = y + f.cellH * (0.2 + random() * 0.6);
        const petals = [ART.magenta, ART.yellow, ART.white, ART.cyan];
        const color = petals[Math.floor(random() * petals.length)] ?? ART.white;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ellipse(ctx, fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2, 2);
          ctx.fillStyle = hsl(color);
          ctx.fill();
        }
        ellipse(ctx, fx, fy, 1.6, 1.6);
        ctx.fillStyle = hsl(ART.gold);
        ctx.fill();
      }
    } else {
      closedTape(ctx, f, y);
    }
  }
  railAndDepth(ctx, f, PLANTER);
}

function paintDesk(ctx: Ctx, f: Field, scene: Scene) {
  switch (scene.theme) {
    case "office":
      paintOffice(ctx, f, scene.open);
      return;
    case "breakroom":
      paintBreakroom(ctx, f, scene);
      return;
    case "server":
      paintServer(ctx, f, scene);
      return;
    case "rooftop":
      paintRooftop(ctx, f, scene);
      return;
  }
}

function cellKey(cells: Cell[]) {
  return cells.map((c) => `${c.row}.${c.col}`).join(",");
}

// The floor, drawn once for this size and this level, then kept.
export function drawDesk(ctx: Ctx, f: Field, scene: Scene, ratio: number) {
  const key = [
    `${f.width}x${f.height}`,
    ratio,
    scene.theme,
    scene.open.join(","),
    cellKey(scene.puddles),
    cellKey(scene.cables),
  ].join(":");
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(f.width * ratio);
    canvas.height = Math.ceil(f.height * ratio);
    const c = canvas.getContext("2d");
    if (!c) return;
    c.scale(ratio, ratio);
    paintDesk(c, f, scene);
    if (cache.size > 8) cache.clear();
    cache.set(key, canvas);
  }
  ctx.drawImage(canvas, 0, 0, f.width, f.height);
}

// A shredder waiting at the left end of a row, or running down it.
export function drawShredder(
  ctx: Ctx,
  x: number,
  y: number,
  h: number,
  running: boolean,
  t: number,
) {
  const w = h * 0.62;
  const bh = h * 0.56;
  const top = y - bh / 2;
  rounded(ctx, x - w / 2, top, w, bh, h * 0.1);
  shadeDown(ctx, ART.metal, top, top + bh, 14, -24);
  outline(ctx, h * 0.03);
  // The slot and its teeth.
  rounded(ctx, x - w * 0.36, top + bh * 0.2, w * 0.72, bh * 0.16, bh * 0.05);
  ctx.fillStyle = hsl(ART.ink);
  ctx.fill();
  ctx.fillStyle = hsl(ART.metal, 20);
  const teeth = 5;
  const turn = running ? (t * 20) % 1 : 0;
  for (let i = 0; i < teeth; i++) {
    const tx = x - w * 0.32 + ((i + turn) / teeth) * w * 0.64;
    ctx.beginPath();
    ctx.moveTo(tx, top + bh * 0.36);
    ctx.lineTo(tx + w * 0.05, top + bh * 0.26);
    ctx.lineTo(tx + w * 0.1, top + bh * 0.36);
    ctx.fill();
  }
  // A light: green while waiting, red while it runs.
  ellipse(ctx, x + w * 0.25, top + bh * 0.68, h * 0.05, h * 0.05);
  ctx.fillStyle = running ? hsl(ART.ember, 10) : hsl(ART.hopper, 18);
  ctx.fill();
  // Two small eyes, so it fits with the helpers.
  ctx.fillStyle = hsl(ART.ink);
  for (const dx of [-0.16, 0.02]) {
    ellipse(ctx, x + w * dx, top + bh * 0.66, h * 0.035, h * 0.045);
    ctx.fill();
  }
  // Paper confetti behind a running one.
  if (running) {
    const colors = [ART.white, ART.note, ART.cyan, ART.magenta];
    for (let i = 0; i < 8; i++) {
      const color = colors[i % colors.length] ?? ART.white;
      const px = x - w * 0.6 - ((t * 60 + i * 13) % (w * 1.4));
      const py = y + Math.sin(t * 10 + i * 2) * h * 0.25;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 8 + i);
      ctx.fillStyle = hsl(color);
      ctx.fillRect(-h * 0.04, -h * 0.02, h * 0.08, h * 0.04);
      ctx.restore();
    }
  }
}

export function drawShot(
  ctx: Ctx,
  shot: Shot,
  x: number,
  y: number,
  s: number,
  t: number,
) {
  const u = s / 10;
  switch (shot.kind) {
    case "staple":
    case "power": {
      const big = shot.kind === "power" ? 1.6 : 1;
      if (shot.kind === "power") {
        const g = ctx.createRadialGradient(x, y, 0, x, y, u * 3);
        g.addColorStop(0, hsl(ART.gold, 20, 0.7));
        g.addColorStop(1, hsl(ART.gold, 20, 0));
        ctx.fillStyle = g;
        ellipse(ctx, x, y, u * 3, u * 3);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(x - u * 0.9 * big, y - u * 0.7 * big);
      ctx.lineTo(x + u * 0.9 * big, y - u * 0.7 * big);
      ctx.lineTo(x + u * 0.9 * big, y + u * 0.7 * big);
      ctx.lineTo(x - u * 0.9 * big, y + u * 0.7 * big);
      ctx.strokeStyle =
        shot.kind === "power" ? hsl(ART.gold, 5) : hsl(ART.metal, -10);
      ctx.lineWidth = u * 0.55 * big;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - u * 0.9 * big, y - u * 0.7 * big);
      ctx.lineTo(x + u * 0.9 * big, y - u * 0.7 * big);
      ctx.strokeStyle = hsl(ART.white, 0, 0.8);
      ctx.lineWidth = u * 0.2 * big;
      ctx.stroke();
      break;
    }
    case "puff": {
      const g = ctx.createRadialGradient(x, y, 0, x, y, u * 1.8);
      g.addColorStop(0, hsl(ART.white, 0, 0.95));
      g.addColorStop(0.6, hsl(ART.ice, 0, 0.8));
      g.addColorStop(1, hsl(ART.ice, 0, 0));
      ctx.fillStyle = g;
      ellipse(ctx, x, y, u * 1.8, u * 1.8);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 6);
      ctx.strokeStyle = hsl(ART.fan, -5);
      ctx.lineWidth = u * 0.22;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(-u * 0.9, 0);
        ctx.lineTo(u * 0.9, 0);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "plane": {
      const dip = Math.sin(t * 8 + shot.id) * u * 0.5;
      ctx.save();
      ctx.translate(x, y + dip);
      ctx.rotate(Math.cos(t * 8 + shot.id) * 0.1);
      ctx.beginPath();
      ctx.moveTo(u * 2, 0);
      ctx.lineTo(-u * 1.8, -u * 1.3);
      ctx.lineTo(-u * 1, 0);
      ctx.lineTo(-u * 1.8, u * 0.9);
      ctx.closePath();
      shade(ctx, ART.white, 0, 0, u * 2, 0, -16);
      outline(ctx, u * 0.2, ART.ink, 0.5);
      ctx.beginPath();
      ctx.moveTo(u * 2, 0);
      ctx.lineTo(-u * 1, 0);
      outline(ctx, u * 0.15, ART.ink, 0.35);
      ctx.restore();
      break;
    }
  }
}
