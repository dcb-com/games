import type { Ctx } from "~/games/art/color";
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

function paintDesk(ctx: Ctx, f: Field, open: number[]) {
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

    if (!isOpen) {
      // Closed rows are taped off.
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

  // The rail on the left where the shredders sit.
  const rail = ctx.createLinearGradient(0, 0, f.left, 0);
  rail.addColorStop(0, hsl(ART.rail, -6));
  rail.addColorStop(1, hsl(ART.rail, 10));
  ctx.fillStyle = rail;
  ctx.fillRect(0, f.top, f.left, f.height - f.top);

  // Depth: a shadow under the card bar, and the far end fading into shade
  // where the critters come from.
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

// The desk, drawn once for this size and these open rows, then kept.
export function drawDesk(ctx: Ctx, f: Field, open: number[], ratio: number) {
  const key = `${f.width}x${f.height}:${ratio}:${open.join(",")}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(f.width * ratio);
    canvas.height = Math.ceil(f.height * ratio);
    const c = canvas.getContext("2d");
    if (!c) return;
    c.scale(ratio, ratio);
    paintDesk(c, f, open);
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
