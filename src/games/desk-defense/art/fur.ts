import type { Ctx, Hsl } from "~/games/desk-defense/art/color";
import { ART, ellipse, hsl, seeded } from "~/games/desk-defense/art/color";
import type { CritterKind } from "~/games/desk-defense/units";

// A critter's furry body, drawn stroke by stroke. That is a few hundred
// strokes each, too many to draw every frame, so each body is drawn once
// per size into a small canvas and kept. The face, feet and the rest move,
// so they are drawn fresh on top every frame.

interface FurSpec {
  base: Hsl;
  // A second color for the right half, for the splitter.
  alt?: Hsl;
  // Width and height of the body, against its size.
  rx: number;
  ry: number;
  // Longer fur along the top: a tuft, a mane.
  tuft: number;
  belly: boolean;
  stripes: number;
}

const SPECS: Record<CritterKind, FurSpec> = {
  fuzzball: {
    base: ART.fuzzball,
    rx: 0.36,
    ry: 0.34,
    tuft: 1.6,
    belly: true,
    stripes: 0,
  },
  zippy: {
    base: ART.zippy,
    rx: 0.32,
    ry: 0.3,
    tuft: 1.2,
    belly: true,
    stripes: 0,
  },
  chonk: {
    base: ART.chonk,
    rx: 0.42,
    ry: 0.34,
    tuft: 1,
    belly: true,
    stripes: 0,
  },
  splitter: {
    base: ART.splitter,
    alt: ART.splitterAlt,
    rx: 0.36,
    ry: 0.34,
    tuft: 1.3,
    belly: false,
    stripes: 0,
  },
  mini: {
    base: ART.mini,
    rx: 0.34,
    ry: 0.33,
    tuft: 1.4,
    belly: false,
    stripes: 0,
  },
  hopper: {
    base: ART.hopper,
    rx: 0.35,
    ry: 0.3,
    tuft: 1,
    belly: true,
    stripes: 3,
  },
  shellby: {
    base: ART.shellby,
    rx: 0.37,
    ry: 0.33,
    tuft: 1,
    belly: true,
    stripes: 0,
  },
  grumble: {
    base: ART.grumble,
    rx: 0.4,
    ry: 0.36,
    tuft: 2,
    belly: true,
    stripes: 4,
  },
};

export function furSpec(kind: CritterKind): FurSpec {
  return SPECS[kind];
}

function strokeFur(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  length: number,
  bend: number,
) {
  const tx = x + Math.cos(angle) * length;
  const ty = y + Math.sin(angle) * length;
  const mx = (x + tx) / 2 + Math.cos(angle + Math.PI / 2) * bend;
  const my = (y + ty) / 2 + Math.sin(angle + Math.PI / 2) * bend;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, tx, ty);
  ctx.stroke();
}

// Draw one furry body with its middle at (cx, cy), for a critter of size s.
export function drawFurBody(
  ctx: Ctx,
  kind: CritterKind,
  cx: number,
  cy: number,
  s: number,
) {
  const spec = SPECS[kind];
  const rx = spec.rx * s;
  const ry = spec.ry * s;
  const r = (rx + ry) / 2;
  const random = seeded(kind.length * 9973 + Math.round(s));
  const colorAt = (px: number) => (spec.alt && px > cx ? spec.alt : spec.base);
  ctx.lineCap = "round";

  // The outer fur, darker, sticking out all around.
  const outer = 120;
  for (let i = 0; i < outer; i++) {
    const a = (i / outer) * Math.PI * 2 + random() * 0.05;
    const px = cx + Math.cos(a) * rx * 0.9;
    const py = cy + Math.sin(a) * ry * 0.9;
    const top = Math.max(0, -Math.sin(a));
    const len = r * (0.2 + random() * 0.14) * (1 + top * (spec.tuft - 1));
    ctx.strokeStyle = hsl(colorAt(px), -14 - random() * 8);
    ctx.lineWidth = r * (0.1 + random() * 0.04);
    strokeFur(
      ctx,
      px,
      py,
      a + (random() - 0.5) * 0.4,
      len,
      (random() - 0.5) * r * 0.12,
    );
  }

  // The body itself, lit from the top left.
  const fill = (base: Hsl) => {
    const g = ctx.createRadialGradient(
      cx - rx * 0.35,
      cy - ry * 0.4,
      r * 0.05,
      cx,
      cy,
      r * 1.1,
    );
    g.addColorStop(0, hsl(base, 16));
    g.addColorStop(0.6, hsl(base));
    g.addColorStop(1, hsl(base, -12));
    return g;
  };
  ellipse(ctx, cx, cy, rx, ry);
  ctx.fillStyle = fill(spec.base);
  ctx.fill();
  if (spec.alt) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy - ry * 2, rx * 2, ry * 4);
    ctx.clip();
    ellipse(ctx, cx, cy, rx, ry);
    ctx.fillStyle = fill(spec.alt);
    ctx.fill();
    ctx.restore();
  }

  // A second, lighter ring of fur, so the edge looks soft and thick.
  for (let i = 0; i < outer; i++) {
    const a = (i / outer) * Math.PI * 2 + random() * 0.08;
    const px = cx + Math.cos(a) * rx * 0.8;
    const py = cy + Math.sin(a) * ry * 0.8;
    const top = Math.max(0, -Math.sin(a));
    const len = r * (0.16 + random() * 0.1) * (1 + top * (spec.tuft - 1) * 0.8);
    const lit = Math.cos(a + 2.3) * 8;
    ctx.strokeStyle = hsl(colorAt(px), lit + random() * 4);
    ctx.lineWidth = r * (0.07 + random() * 0.03);
    strokeFur(
      ctx,
      px,
      py,
      a + (random() - 0.5) * 0.5,
      len,
      (random() - 0.5) * r * 0.1,
    );
  }

  // Stripes across the back, for the hopper and the boss.
  for (let i = 0; i < spec.stripes; i++) {
    const a =
      -Math.PI * 0.75 + (i / Math.max(1, spec.stripes - 1)) * Math.PI * 0.5;
    ctx.strokeStyle = hsl(spec.base, -18, 0.55);
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rx * 0.95, cy + Math.sin(a) * ry * 0.95);
    ctx.lineTo(cx + Math.cos(a) * rx * 0.5, cy + Math.sin(a) * ry * 0.45);
    ctx.stroke();
  }

  // A lighter belly patch.
  if (spec.belly) {
    const bx = cx - rx * 0.05;
    const by = cy + ry * 0.38;
    ellipse(ctx, bx, by, rx * 0.52, ry * 0.42);
    const g = ctx.createRadialGradient(bx, by - ry * 0.1, 0, bx, by, rx * 0.55);
    g.addColorStop(0, hsl(spec.base, 26, 1, -10));
    g.addColorStop(1, hsl(spec.base, 14, 1, -10));
    ctx.fillStyle = g;
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      ctx.strokeStyle = hsl(spec.base, 18 + random() * 6, 1, -10);
      ctx.lineWidth = r * 0.05;
      strokeFur(
        ctx,
        bx + Math.cos(a) * rx * 0.46,
        by + Math.sin(a) * ry * 0.36,
        a,
        r * 0.08,
        0,
      );
    }
  }

  // Fine fur inside the body, following the shape.
  for (let i = 0; i < 90; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * 0.78;
    const px = cx + Math.cos(a) * rx * d;
    const py = cy + Math.sin(a) * ry * d;
    const light = random() < 0.5;
    ctx.strokeStyle = hsl(colorAt(px), light ? 12 : -10, light ? 0.55 : 0.35);
    ctx.lineWidth = r * 0.035;
    strokeFur(ctx, px, py, a + 0.3, r * (0.07 + random() * 0.07), r * 0.03);
  }

  // A soft shine on the top left.
  const shine = ctx.createRadialGradient(
    cx - rx * 0.4,
    cy - ry * 0.45,
    0,
    cx - rx * 0.4,
    cy - ry * 0.45,
    r * 0.6,
  );
  shine.addColorStop(0, hsl(ART.white, 0, 0.35));
  shine.addColorStop(1, hsl(ART.white, 0, 0));
  ellipse(ctx, cx, cy, rx, ry);
  ctx.fillStyle = shine;
  ctx.fill();
}

interface Sprite {
  canvas: HTMLCanvasElement;
  // The sprite's size in drawing units: it is drawn from -half to +half.
  half: number;
}

const cache = new Map<string, Sprite>();

// The body for a critter of size s, drawn at the screen's pixel ratio. A
// white copy is kept too, for the flash when something hits it.
export function furSprite(
  kind: CritterKind,
  s: number,
  ratio: number,
  white: boolean,
): Sprite | null {
  const px = Math.max(8, Math.round(s * ratio));
  const key = `${kind}:${px}:${white ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;

  const half = s * 0.75;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(half * 2 * ratio);
  canvas.height = canvas.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(ratio, ratio);
  drawFurBody(ctx, kind, half, half, s);
  if (white) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = hsl(ART.white, 0, 0.75);
    ctx.fillRect(0, 0, half * 2, half * 2);
  }
  const sprite = { canvas, half };
  // A long game can visit many sizes as the window changes. Keep the cache
  // small by starting over when it grows.
  if (cache.size > 120) cache.clear();
  cache.set(key, sprite);
  return sprite;
}
