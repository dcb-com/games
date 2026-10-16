// The game's own colors, for the art inside the canvas only. The menus and
// the card bar around it still take their colors from the theme.
//
// Colors are kept as hue, saturation and lightness, so one base color can
// give its own highlight, shade and outline.

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hsl(c: Hsl, dl = 0, alpha = 1, ds = 0): string {
  const l = Math.max(0, Math.min(100, c.l + dl));
  const s = Math.max(0, Math.min(100, c.s + ds));
  return alpha >= 1
    ? `hsl(${c.h} ${s}% ${l}%)`
    : `hsl(${c.h} ${s}% ${l}% / ${alpha})`;
}

const c = (h: number, s: number, l: number): Hsl => ({ h, s, l });

export const ART = {
  ink: c(260, 30, 16),
  white: c(0, 0, 100),
  shadow: c(25, 40, 20),
  blush: c(350, 90, 72),
  mouth: c(350, 60, 28),
  tongue: c(355, 85, 68),
  tooth: c(45, 40, 97),
  gold: c(45, 95, 55),
  metal: c(215, 12, 70),
  ice: c(195, 90, 80),
  flame: c(28, 100, 55),
  ember: c(10, 95, 50),
  spark: c(50, 100, 70),
  wood: c(30, 52, 60),
  closed: c(30, 18, 52),
  rail: c(220, 14, 30),
  stain: c(25, 50, 35),

  fuzzball: c(330, 85, 72),
  zippy: c(46, 100, 60),
  chonk: c(268, 62, 62),
  splitter: c(178, 70, 48),
  splitterAlt: c(195, 85, 60),
  mini: c(186, 78, 55),
  hopper: c(98, 62, 52),
  shellby: c(208, 82, 62),
  grumble: c(22, 95, 57),

  iris: {
    fuzzball: c(200, 80, 45),
    zippy: c(140, 60, 38),
    chonk: c(40, 90, 50),
    splitter: c(330, 70, 50),
    mini: c(330, 70, 50),
    hopper: c(25, 90, 50),
    shellby: c(160, 70, 40),
    grumble: c(0, 85, 45),
  },

  coffee: c(4, 76, 56),
  brew: c(25, 60, 26),
  stapler: c(174, 72, 42),
  slate: c(220, 18, 30),
  brick: c(10, 68, 52),
  mortar: c(30, 35, 82),
  fan: c(198, 85, 58),
  note: c(52, 98, 66),
  printer: c(240, 14, 88),
  cyan: c(190, 90, 50),
  magenta: c(320, 85, 58),
  yellow: c(50, 100, 55),
  eraserPink: c(345, 85, 76),
  eraserBlue: c(212, 80, 58),
  lamp: c(42, 92, 55),
  bulb: c(52, 100, 80),
};

// A seeded random number source, so a sprite looks the same every time.
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Ctx = CanvasRenderingContext2D;

export function ellipse(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation = 0,
) {
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    Math.max(0.01, rx),
    Math.max(0.01, ry),
    rotation,
    0,
    Math.PI * 2,
  );
}

export function rounded(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

// A soft shadow on the desk under something standing on it.
export function groundShadow(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, hsl(ART.shadow, 0, 0.35));
  g.addColorStop(1, hsl(ART.shadow, 0, 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ellipse(ctx, x, y, rx, rx);
  ctx.fill();
  ctx.restore();
}

// Fill the current path with a light-from-the-top-left gradient.
export function shade(
  ctx: Ctx,
  base: Hsl,
  x: number,
  y: number,
  r: number,
  light = 14,
  dark = -16,
) {
  const g = ctx.createRadialGradient(
    x - r * 0.4,
    y - r * 0.45,
    r * 0.05,
    x,
    y,
    r * 1.15,
  );
  g.addColorStop(0, hsl(base, light));
  g.addColorStop(0.55, hsl(base));
  g.addColorStop(1, hsl(base, dark));
  ctx.fillStyle = g;
  ctx.fill();
}

// Fill the current path with a straight gradient from top to bottom.
export function shadeDown(
  ctx: Ctx,
  base: Hsl,
  top: number,
  bottom: number,
  light = 12,
  dark = -14,
) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, hsl(base, light));
  g.addColorStop(1, hsl(base, dark));
  ctx.fillStyle = g;
  ctx.fill();
}

export function outline(
  ctx: Ctx,
  width: number,
  color: Hsl = ART.ink,
  alpha = 0.85,
) {
  ctx.strokeStyle = hsl(color, 0, alpha);
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

// A glossy cartoon eye. `look` moves the pupil, from -1 (left) to 1.
// `shut` closes the lid from 0 (open) to 1 (closed).
export function eye(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  iris: Hsl,
  lid: Hsl,
  opts: { look?: number; shut?: number; angry?: number; sleepy?: boolean } = {},
) {
  const look = opts.look ?? -0.4;
  const shut = Math.min(1, Math.max(0, opts.shut ?? 0));
  ctx.save();
  ellipse(ctx, x, y, r, r * 1.08);
  const white = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r,
  );
  white.addColorStop(0, hsl(ART.white));
  white.addColorStop(1, hsl(ART.white, -12, 1, 0));
  ctx.fillStyle = white;
  ctx.fill();
  outline(ctx, Math.max(0.6, r * 0.14));
  ellipse(ctx, x, y, r, r * 1.08);
  ctx.clip();

  const ix = x + look * r * 0.32;
  const iy = y + r * 0.08;
  ellipse(ctx, ix, iy, r * 0.62, r * 0.66);
  const g = ctx.createRadialGradient(
    ix,
    iy + r * 0.2,
    r * 0.05,
    ix,
    iy,
    r * 0.66,
  );
  g.addColorStop(0, hsl(iris, 22));
  g.addColorStop(1, hsl(iris, -12));
  ctx.fillStyle = g;
  ctx.fill();
  ellipse(ctx, ix, iy, r * 0.32, r * 0.36);
  ctx.fillStyle = hsl(ART.ink, -8);
  ctx.fill();
  ellipse(ctx, ix - r * 0.22, iy - r * 0.26, r * 0.2, r * 0.2);
  ctx.fillStyle = hsl(ART.white);
  ctx.fill();
  ellipse(ctx, ix + r * 0.2, iy + r * 0.2, r * 0.09, r * 0.09);
  ctx.fill();

  const lidDrop = opts.sleepy ? Math.max(shut, 0.35) : shut;
  if (lidDrop > 0) {
    ctx.fillStyle = hsl(lid, -4);
    ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4 * lidDrop);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.1, y - r * 1.2 + r * 2.4 * lidDrop);
    ctx.lineTo(x + r * 1.1, y - r * 1.2 + r * 2.4 * lidDrop);
    outline(ctx, Math.max(0.6, r * 0.14));
  }
  ctx.restore();

  if (opts.angry) {
    // A slanted brow, low on the inside.
    const tilt = opts.angry;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.05, y - r * 1.25 - tilt * r * 0.3);
    ctx.lineTo(x + r * 1.05, y - r * 1.25 + tilt * r * 0.3);
    outline(ctx, Math.max(1, r * 0.32), ART.ink, 1);
  }
}

// A simple pair of dot eyes with a shine, for the cute office helpers.
export function dotEyes(
  ctx: Ctx,
  x: number,
  y: number,
  gap: number,
  r: number,
  opts: { happy?: boolean; blink?: boolean } = {},
) {
  for (const dx of [-gap / 2, gap / 2]) {
    if (opts.happy || opts.blink) {
      ctx.beginPath();
      if (opts.happy)
        ctx.arc(x + dx, y + r * 0.4, r, Math.PI * 1.15, Math.PI * 1.85);
      else {
        ctx.moveTo(x + dx - r, y);
        ctx.lineTo(x + dx + r, y);
      }
      outline(ctx, Math.max(1, r * 0.55), ART.ink, 1);
      continue;
    }
    ellipse(ctx, x + dx, y, r, r * 1.15);
    ctx.fillStyle = hsl(ART.ink);
    ctx.fill();
    ellipse(ctx, x + dx - r * 0.3, y - r * 0.4, r * 0.38, r * 0.38);
    ctx.fillStyle = hsl(ART.white);
    ctx.fill();
  }
}

export function blush(ctx: Ctx, x: number, y: number, gap: number, r: number) {
  ctx.fillStyle = hsl(ART.blush, 0, 0.45);
  for (const dx of [-gap / 2, gap / 2]) {
    ellipse(ctx, x + dx, y, r, r * 0.6);
    ctx.fill();
  }
}

export function smile(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  width: number,
) {
  ctx.beginPath();
  ctx.arc(x, y - w * 0.35, w * 0.5, Math.PI * 0.2, Math.PI * 0.8);
  outline(ctx, width, ART.ink, 1);
}
