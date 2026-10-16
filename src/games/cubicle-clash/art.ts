import type { Ctx, Hsl } from "~/games/art/color";
import {
  ART,
  dotEyes,
  ellipse,
  groundShadow,
  hsl,
  outline,
  rounded,
  seeded,
  shade,
} from "~/games/art/color";
import type { HelperLook } from "~/games/art/helpers";
import { RESTING, drawHelper } from "~/games/art/helpers";
import { drawDot } from "~/games/desk-defense/bonus/kit";
import type { BuildingKind, ClutterKind } from "~/games/cubicle-clash/units";

// Cubicle Clash's art: an enchanted forest glade at dusk, seen at an angle,
// the way the game it is modeled on looks. Light falls through the trees,
// fireflies drift, and the fort is built of living wood, mossy stone,
// mushrooms and flowers. Each building grows grander with its level: its
// leaves change color, lanterns and crystals appear, and gold runes glow.
//
// `w` is the width of one tile's diamond on screen. A point (cx, cy) is the
// middle of a building's ground, and things are drawn upward from it.

export interface BuildingLook {
  t: number;
  still: boolean;
  level: number;
  acted: number;
  bitten: number;
  // How full a press or coffee maker is, from 0 to 1.
  full: number;
  // Which way a turret's helper faces: 1 is right.
  facing: 1 | -1;
}

export const STANDING: BuildingLook = {
  t: 0,
  still: true,
  level: 1,
  acted: 99,
  bitten: 99,
  full: 0.5,
  facing: 1,
};

const c = (h: number, s: number, l: number): Hsl => ({ h, s, l });

const MOSS = c(104, 46, 40);
const BARK = c(24, 30, 30);
const STONE = c(195, 10, 60);
const MOSSY = c(160, 12, 54);
const TIMBER = c(30, 40, 50);
const LEAF = c(128, 48, 36);
const HEDGE = c(132, 44, 34);
const STEM = c(40, 34, 86);
const GLOW = c(44, 100, 68);
const RUNE = c(186, 100, 64);
const BLOSSOM = c(322, 72, 72);
const LILAC = c(272, 60, 68);
const FIREFLY = c(70, 100, 72);
const WATER = c(192, 75, 56);
const SUN = c(46, 90, 78);

// The great tree's leaves by head office level: summer green, teal, pink
// blossom, lilac, then gold.
const CANOPY: Hsl[] = [
  c(122, 46, 40),
  c(162, 48, 38),
  c(330, 62, 70),
  c(270, 50, 64),
  c(44, 86, 58),
];
// Bluebell caps for the break room, deeper with each level.
const BELL: Hsl[] = [
  c(200, 60, 68),
  c(212, 64, 64),
  c(228, 60, 66),
  c(256, 56, 66),
  c(282, 56, 66),
];

function pick(list: Hsl[], level: number) {
  return list[Math.min(list.length - 1, Math.max(0, level - 1))] ?? LEAF;
}

function poly(ctx: Ctx, points: number[]) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// A soft round light.
function glow(ctx: Ctx, x: number, y: number, r: number, color: Hsl, a = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.1, r));
  g.addColorStop(0, hsl(color, 8, a));
  g.addColorStop(1, hsl(color, 0, 0));
  ctx.fillStyle = g;
  ellipse(ctx, x, y, r, r);
  ctx.fill();
}

// A solid block on a diamond: `a` is half its width on screen, `h` its
// height. Lit from the top left, so the left face is brighter than the right.
export function block(
  ctx: Ctx,
  cx: number,
  cy: number,
  a: number,
  h: number,
  color: Hsl,
  trim?: Hsl,
) {
  const b = a / 2;
  const line = Math.max(0.8, a * 0.04);
  poly(ctx, [cx - a, cy, cx, cy + b, cx, cy + b - h, cx - a, cy - h]);
  ctx.fillStyle = hsl(color, -2);
  ctx.fill();
  outline(ctx, line, ART.ink, 0.45);
  poly(ctx, [cx, cy + b, cx + a, cy, cx + a, cy - h, cx, cy + b - h]);
  ctx.fillStyle = hsl(color, -16);
  ctx.fill();
  outline(ctx, line, ART.ink, 0.45);
  poly(ctx, [cx, cy - b - h, cx + a, cy - h, cx, cy + b - h, cx - a, cy - h]);
  ctx.fillStyle = hsl(color, 12);
  ctx.fill();
  outline(ctx, line, ART.ink, 0.45);
  if (trim) {
    // A band of trim along the top edge.
    ctx.strokeStyle = hsl(trim, 5);
    ctx.lineWidth = Math.max(1.5, a * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - a, cy - h + 1);
    ctx.lineTo(cx, cy + b - h + 1);
    ctx.lineTo(cx + a, cy - h + 1);
    ctx.stroke();
  }
}

// Stone courses on the two front faces of a block.
function bricks(
  ctx: Ctx,
  cx: number,
  cy: number,
  a: number,
  h: number,
  color: Hsl,
) {
  const b = a / 2;
  ctx.strokeStyle = hsl(color, -24, 0.35);
  ctx.lineWidth = 1;
  const rows = Math.max(2, Math.floor(h / (a * 0.22)));
  for (let i = 1; i < rows; i++) {
    const y = (h * i) / rows;
    ctx.beginPath();
    ctx.moveTo(cx - a, cy - y);
    ctx.lineTo(cx, cy + b - y);
    ctx.lineTo(cx + a, cy - y);
    ctx.stroke();
  }
}

// Moss along the top front edges of a block whose top is at cy.
function mossTop(ctx: Ctx, cx: number, cy: number, a: number, seed: number) {
  const random = seeded(seed);
  for (let i = 0; i < 7; i++) {
    const k = random();
    const left = random() < 0.5;
    const x = left ? cx - a + a * k : cx + a * k;
    const y = left ? cy + (a / 2) * k : cy + a / 2 - (a / 2) * k;
    const r = a * (0.1 + random() * 0.08);
    ellipse(ctx, x, y, r, r * 0.6);
    shade(ctx, MOSS, x, y, r, 16, -10);
  }
}

// A four-sided pointed roof on top of a block whose top is at cy.
export function roof(
  ctx: Ctx,
  cx: number,
  cy: number,
  a: number,
  peak: number,
  color: Hsl,
) {
  const b = a / 2;
  const line = Math.max(0.8, a * 0.04);
  poly(ctx, [cx - a, cy, cx, cy + b, cx, cy - peak]);
  ctx.fillStyle = hsl(color, 4);
  ctx.fill();
  outline(ctx, line, ART.ink, 0.5);
  poly(ctx, [cx, cy + b, cx + a, cy, cx, cy - peak]);
  ctx.fillStyle = hsl(color, -12);
  ctx.fill();
  outline(ctx, line, ART.ink, 0.5);
  ctx.strokeStyle = hsl(color, -24, 0.35);
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const k = i / 4;
    ctx.beginPath();
    ctx.moveTo(cx - a * (1 - k), cy - peak * k);
    ctx.lineTo(cx, cy + b * (1 - k) - peak * k);
    ctx.lineTo(cx + a * (1 - k), cy - peak * k);
    ctx.stroke();
  }
}

// A round tower or tank: r is its radius on screen, h its height.
export function cylinder(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  h: number,
  color: Hsl,
) {
  const ry = r / 2;
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, hsl(color, 6));
  g.addColorStop(0.45, hsl(color, 0));
  g.addColorStop(1, hsl(color, -20));
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
  ctx.lineTo(cx - r, cy - h);
  ctx.ellipse(cx, cy - h, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(0.8, r * 0.06), ART.ink, 0.45);
  ellipse(ctx, cx, cy - h, r, ry);
  ctx.fillStyle = hsl(color, 12);
  ctx.fill();
  outline(ctx, Math.max(0.8, r * 0.06), ART.ink, 0.45);
}

function flag(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  t: number,
  still: boolean,
  color: Hsl,
) {
  ctx.strokeStyle = hsl(TIMBER, -14);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s);
  ctx.stroke();
  const wave = still ? 0 : Math.sin(t * 4 + x) * s * 0.08;
  // A long pennant with a forked tail.
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.35, y - s * 0.96 + wave, x + s * 0.7, y - s);
  ctx.lineTo(x + s * 0.55, y - s * 0.86 + wave * 0.5);
  ctx.lineTo(x + s * 0.7, y - s * 0.72);
  ctx.quadraticCurveTo(x + s * 0.35, y - s * 0.74 - wave, x, y - s * 0.66);
  ctx.closePath();
  ctx.fillStyle = hsl(color, 6);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.5);
  ellipse(ctx, x, y - s, s * 0.05, s * 0.05);
  ctx.fillStyle = hsl(ART.gold, 5);
  ctx.fill();
}

// A cluster of leaves: overlapping puffs lit from the top left, with a
// rim of light along the top.
function foliage(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: Hsl,
  seed: number,
  puffs = 6,
) {
  const random = seeded(seed);
  const spots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < puffs; i++) {
    const a = random() * Math.PI * 2;
    const d = r * 0.55 * random();
    spots.push({
      x: x + Math.cos(a) * d * 1.25,
      y: y + Math.sin(a) * d * 0.75,
      r: r * (0.42 + random() * 0.24),
    });
  }
  spots.push({ x, y, r: r * 0.6 });
  spots.sort((p, q) => p.y - q.y);
  for (const s of spots) {
    ellipse(ctx, s.x, s.y + s.r * 0.12, s.r * 1.04, s.r * 0.94);
    ctx.fillStyle = hsl(color, -18);
    ctx.fill();
  }
  for (const s of spots) {
    ellipse(ctx, s.x, s.y, s.r, s.r * 0.88);
    shade(ctx, color, s.x, s.y, s.r, 16, -12);
  }
  // Light catching the top edge of each puff.
  ctx.strokeStyle = hsl(color, 26, 0.55);
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (const s of spots) {
    ctx.beginPath();
    ctx.ellipse(
      s.x,
      s.y,
      s.r * 0.85,
      s.r * 0.74,
      0,
      Math.PI * 1.1,
      Math.PI * 1.6,
    );
    ctx.stroke();
  }
}

// A tree trunk with roots, standing at (x, y): r is half its width.
function trunk(ctx: Ctx, x: number, y: number, r: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x - r * 1.7, y + r * 0.15);
  ctx.quadraticCurveTo(x - r * 0.9, y - r * 0.1, x - r, y - h * 0.35);
  ctx.quadraticCurveTo(x - r * 0.75, y - h * 0.8, x - r * 0.95, y - h);
  ctx.lineTo(x + r * 0.95, y - h);
  ctx.quadraticCurveTo(x + r * 0.75, y - h * 0.8, x + r, y - h * 0.35);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 0.1, x + r * 1.7, y + r * 0.15);
  ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.45, x, y + r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.6, y + r * 0.45, x - r * 1.7, y + r * 0.15);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, hsl(BARK, 14));
  g.addColorStop(0.5, hsl(BARK, 2));
  g.addColorStop(1, hsl(BARK, -10));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(1, r * 0.06), ART.ink, 0.55);
  // Grooves in the bark.
  ctx.strokeStyle = hsl(BARK, -14, 0.6);
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (const k of [-0.55, -0.1, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(x + r * k, y - h * 0.05);
    ctx.quadraticCurveTo(x + r * (k + 0.15), y - h * 0.5, x + r * k, y - h);
    ctx.stroke();
  }
}

// A round window or door full of warm light.
function lit(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  frame: Hsl = TIMBER,
) {
  glow(ctx, x, y, Math.max(rx, ry) * 2.6, GLOW, 0.32);
  ellipse(ctx, x, y, rx, ry);
  const g = ctx.createRadialGradient(x, y + ry * 0.3, 0, x, y, ry);
  g.addColorStop(0, hsl(GLOW, 18));
  g.addColorStop(1, hsl(GLOW, -12));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = hsl(frame, -6);
  ctx.lineWidth = Math.max(1.2, rx * 0.28);
  ctx.stroke();
}

// A glowing crystal that floats and bobs.
function crystal(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  color: Hsl,
  t: number,
  still: boolean,
) {
  const bob = still ? 0 : Math.sin(t * 2 + x) * s * 0.3;
  const yy = y + bob;
  glow(ctx, x, yy, s * 3.2, color, 0.5);
  poly(ctx, [
    x,
    yy - s * 1.6,
    x + s * 0.7,
    yy,
    x,
    yy + s * 1.1,
    x - s * 0.7,
    yy,
  ]);
  const g = ctx.createLinearGradient(x - s, yy - s, x + s, yy + s);
  g.addColorStop(0, hsl(color, 26));
  g.addColorStop(1, hsl(color, -12));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(0.8, s * 0.12), ART.ink, 0.4);
  ctx.strokeStyle = hsl(ART.white, 0, 0.7);
  ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, yy - s * 0.5);
  ctx.lineTo(x, yy - s * 1.3);
  ctx.stroke();
}

// A mushroom with a spotted cap; big ones are towers with a window.
function mushroom(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  h: number,
  cap: Hsl,
  window = false,
  shine = 0,
) {
  cylinder(ctx, x, y, r * 0.42, h, STEM);
  if (window) lit(ctx, x - r * 0.08, y - h * 0.5, r * 0.16, r * 0.22);
  const top = y - h;
  if (shine > 0) glow(ctx, x, top - r * 0.4, r * 2.2, cap, shine);
  ctx.beginPath();
  ctx.moveTo(x - r * 1.2, top);
  ctx.quadraticCurveTo(x - r * 1.15, top - r * 1.15, x, top - r * 1.1);
  ctx.quadraticCurveTo(x + r * 1.15, top - r * 1.15, x + r * 1.2, top);
  ctx.quadraticCurveTo(x, top + r * 0.5, x - r * 1.2, top);
  ctx.closePath();
  shade(ctx, cap, x - r * 0.2, top - r * 0.55, r * 1.2, 16, -18);
  outline(ctx, Math.max(0.8, r * 0.08), ART.ink, 0.5);
  ctx.fillStyle = hsl(ART.white, 0, 0.9);
  for (const [dx, dy, s] of [
    [-0.55, -0.35, 0.16],
    [0.1, -0.75, 0.2],
    [0.6, -0.3, 0.14],
    [-0.1, -0.2, 0.1],
  ] as const) {
    ellipse(ctx, x + dx * r, top + dy * r, s * r, s * r * 0.7);
    ctx.fill();
  }
}

// A paper lantern on a string, glowing and swaying.
function lantern(
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  s: number,
  t: number,
  still: boolean,
  color: Hsl = GLOW,
) {
  const sway = still ? 0 : Math.sin(t * 1.6 + x * 0.3) * s * 0.4;
  ctx.strokeStyle = hsl(ART.ink, 10, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sway, y + len);
  ctx.stroke();
  const lx = x + sway;
  const ly = y + len + s * 0.6;
  glow(ctx, lx, ly, s * 3, color, 0.45);
  ellipse(ctx, lx, ly, s * 0.55, s * 0.7);
  ctx.fillStyle = hsl(color, 6);
  ctx.fill();
  outline(ctx, 0.8, ART.ink, 0.5);
}

function office(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const a = w * 0.92;
  const leaves = pick(CANOPY, lv);
  const capColor = lv >= 5 ? ART.gold : lv >= 4 ? c(282, 56, 60) : c(4, 70, 56);
  // Mushroom towers at the sides, more of them as it grows.
  const towers: [number, number][] =
    lv >= 4
      ? [
          [0.1, -0.7],
          [-0.8, 0.2],
          [0.82, 0.2],
        ]
      : lv >= 3
        ? [
            [-0.8, 0.2],
            [0.82, 0.2],
          ]
        : lv >= 2
          ? [[0.82, 0.2]]
          : [];
  const tower = ([dx, dy]: [number, number]) =>
    mushroom(
      ctx,
      dx * a,
      dy * a * 0.5,
      w * 0.24,
      w * (0.42 + lv * 0.04),
      capColor,
      true,
      lv >= 4 ? 0.3 : 0,
    );
  for (const t of towers) if (t[1] < 0) tower(t);

  // A mossy stone floor for the great tree to stand on.
  const ph = w * 0.1;
  block(ctx, 0, 0, a * 0.96, ph, MOSSY, lv >= 4 ? ART.gold : undefined);
  bricks(ctx, 0, 0, a * 0.96, ph, MOSSY);
  mossTop(ctx, 0, -ph, a * 0.96, 7);

  // The great tree.
  const th = w * (0.66 + lv * 0.07);
  const tr = w * 0.3;
  const ty = -ph + w * 0.04;
  const cy = ty - th;
  // Side branches of leaves first, behind the trunk.
  foliage(ctx, -w * 0.5, cy + w * 0.12, w * 0.4, leaves, 12, 5);
  foliage(ctx, w * 0.5, cy + w * 0.1, w * 0.38, leaves, 13, 5);
  trunk(ctx, 0, ty, tr, th);
  // Gold runes that wind up the trunk from level 4.
  if (lv >= 4) {
    const pulse = look.still ? 0.8 : 0.6 + Math.sin(look.t * 2) * 0.25;
    ctx.strokeStyle = hsl(ART.gold, 12, pulse);
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.beginPath();
    ctx.moveTo(-tr * 0.8, ty - th * 0.15);
    ctx.quadraticCurveTo(tr * 0.9, ty - th * 0.35, -tr * 0.6, ty - th * 0.6);
    ctx.quadraticCurveTo(tr * 0.7, ty - th * 0.8, -tr * 0.4, ty - th * 0.95);
    ctx.stroke();
  }
  // The round door with light spilling out, and two windows.
  const flicker = look.still ? 0 : Math.sin(look.t * 3) * 0.04;
  lit(ctx, 0, ty - w * 0.15, w * (0.12 + flicker * 0.2), w * 0.16);
  ctx.strokeStyle = hsl(TIMBER, -10, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ty - w * 0.31);
  ctx.lineTo(0, ty);
  ctx.stroke();
  lit(ctx, -tr * 0.45, ty - th * 0.52, w * 0.055, w * 0.065);
  lit(ctx, tr * 0.42, ty - th * 0.74, w * 0.05, w * 0.06);
  // The crown of leaves.
  foliage(ctx, 0, cy - w * 0.08, w * (0.6 + lv * 0.05), leaves, 11, 8);
  // Lanterns hanging under the leaves, one more each level.
  for (let i = 0; i < lv + 1; i++) {
    const k = (i + 0.5) / (lv + 1) - 0.5;
    lantern(
      ctx,
      k * w * 1.3,
      cy + w * 0.22 - Math.abs(k) * w * 0.2,
      w * (0.12 + (i % 2) * 0.08),
      w * 0.05,
      look.t + i,
      look.still,
      i % 2 === 0 ? GLOW : BLOSSOM,
    );
  }
  // At the top level a crystal floats over the tree.
  if (lv >= 5)
    crystal(ctx, 0, cy - w * 0.95, w * 0.1, RUNE, look.t, look.still);
  else if (lv >= 3)
    flag(ctx, 0, cy - w * 0.55, w * 0.42, look.t, look.still, ART.magenta);
  // A wooden sign by the path.
  const sx = -a * 0.48;
  const sy = a * 0.2;
  ctx.strokeStyle = hsl(TIMBER, -12);
  ctx.lineWidth = Math.max(1.5, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - w * 0.26);
  ctx.stroke();
  rounded(ctx, sx - w * 0.16, sy - w * 0.36, w * 0.32, w * 0.15, w * 0.04);
  ctx.fillStyle = hsl(TIMBER, 6);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  ctx.fillStyle = hsl(ART.white);
  ctx.font = `800 ${Math.round(w * 0.11)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("HQ", sx, sy - w * 0.25);
  for (const t of towers) if (t[1] >= 0) tower(t);
}

// The coin press is a mill by a stream: a cottage with a water wheel and,
// from level 2, a gold crystal on the roof.
function press(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const a = w * 0.4;
  const h = w * (0.28 + lv * 0.03);
  const walls = lv >= 3 ? MOSSY : TIMBER;
  block(ctx, 0, 0, a, h, walls, lv >= 4 ? ART.gold : undefined);
  bricks(ctx, 0, 0, a, h, walls);
  lit(ctx, -a * 0.5, a * 0.25 - h * 0.5, w * 0.045, w * 0.06);
  roof(
    ctx,
    0,
    -h,
    a * 1.14,
    w * 0.3,
    lv >= 3 ? c(176, 46, 40) : c(108, 40, 40),
  );
  if (lv >= 2)
    crystal(ctx, 0, -h - w * 0.42, w * 0.07, ART.gold, look.t, look.still);
  // The water wheel on the side, turning.
  const wx = a * 0.66;
  const wy = -h * 0.42;
  ellipse(ctx, wx, wy, w * 0.11, w * 0.17, -0.45);
  ctx.fillStyle = hsl(TIMBER, -8);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  const turn = look.still ? 0 : look.t * 1.6;
  ctx.strokeStyle = hsl(TIMBER, 14);
  ctx.lineWidth = Math.max(1, w * 0.02);
  for (let i = 0; i < 4; i++) {
    const ang = turn + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(wx - Math.cos(ang) * w * 0.09, wy - Math.sin(ang) * w * 0.15);
    ctx.lineTo(wx + Math.cos(ang) * w * 0.09, wy + Math.sin(ang) * w * 0.15);
    ctx.stroke();
  }
  // Water spilling off the wheel.
  ellipse(ctx, wx + w * 0.04, w * 0.06, w * 0.12, w * 0.05);
  ctx.fillStyle = hsl(WATER, 10, 0.75);
  ctx.fill();
  if (!look.still) {
    for (let i = 0; i < 3; i++) {
      const k = (look.t * 1.2 + i / 3) % 1;
      ellipse(ctx, wx + w * 0.06, wy + k * w * 0.2, w * 0.015, w * 0.02);
      ctx.fillStyle = hsl(WATER, 22, 0.8 * (1 - k));
      ctx.fill();
    }
  }
  // A heap of coins in front that grows as it fills.
  const coins = Math.round(look.full * 7);
  for (let i = 0; i < coins; i++) {
    const x = -a * 0.6 + (i % 4) * w * 0.1;
    const y = a * 0.3 - Math.floor(i / 4) * w * 0.06;
    ellipse(ctx, x, y, w * 0.07, w * 0.035);
    shade(ctx, ART.gold, x, y, w * 0.07, 18, -16);
    outline(ctx, 0.8, ART.ink, 0.6);
  }
}

// The coffee maker is a cauldron over a small fire.
function brewery(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const pot = (x: number, y: number, r: number, h: number) => {
    const flick = look.still ? 0.5 : 0.5 + Math.sin(look.t * 9 + x) * 0.15;
    glow(ctx, x, y - r * 0.1, r * 1.7, ART.flame, 0.25 + flick * 0.4);
    // Three stones under it.
    for (const k of [-0.7, 0, 0.7]) {
      ellipse(
        ctx,
        x + k * r,
        y + Math.abs(k) * -r * 0.15 + r * 0.1,
        r * 0.22,
        r * 0.14,
      );
      shade(ctx, STONE, x + k * r, y, r * 0.22, 10, -14);
    }
    // Flames between the stones.
    if (!look.still) {
      for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * r * 0.35;
        const fh = r * (0.35 + Math.abs(Math.sin(look.t * 8 + i * 2)) * 0.25);
        ctx.beginPath();
        ctx.moveTo(fx - r * 0.1, y);
        ctx.quadraticCurveTo(fx, y - fh * 1.4, fx + r * 0.1, y);
        ctx.fillStyle = hsl(ART.flame, 8, 0.85);
        ctx.fill();
      }
    }
    // The belly of the pot.
    ellipse(ctx, x, y - h * 0.45, r * 1.05, h * 0.55);
    shade(ctx, c(240, 10, 30), x, y - h * 0.5, r * 1.05, 16, -12);
    outline(ctx, Math.max(1, r * 0.06), ART.ink, 0.6);
    if (lv >= 4) {
      ctx.strokeStyle = hsl(ART.gold, 5);
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.45, r * 1.02, h * 0.2, 0, 0, Math.PI);
      ctx.stroke();
    }
    // The rim, and the brew glowing inside.
    const ry = r * 0.36;
    ellipse(ctx, x, y - h * 0.9, r * 0.92, ry);
    ctx.fillStyle = hsl(c(240, 10, 22));
    ctx.fill();
    outline(ctx, Math.max(1, r * 0.06), ART.ink, 0.6);
    ellipse(ctx, x, y - h * 0.9, r * 0.75, ry * 0.75);
    const g = ctx.createRadialGradient(
      x,
      y - h * 0.9,
      0,
      x,
      y - h * 0.9,
      r * 0.75,
    );
    g.addColorStop(0, hsl(c(32, 80, 48)));
    g.addColorStop(1, hsl(ART.brew, 0));
    ctx.fillStyle = g;
    ctx.fill();
    if (!look.still) {
      for (let i = 0; i < 3; i++) {
        const rise = (look.t * 0.7 + i / 3 + x) % 1;
        ellipse(
          ctx,
          x + Math.sin(i * 2.1 + look.t) * r * 0.4,
          y - h * 0.95 - rise * w * 0.45,
          w * (0.03 + rise * 0.05),
          w * (0.03 + rise * 0.05),
        );
        ctx.fillStyle = hsl(ART.white, 0, 0.5 * (1 - rise));
        ctx.fill();
      }
    }
  };
  if (lv >= 3) pot(w * 0.2, -w * 0.1, w * 0.13, w * 0.24);
  pot(-w * 0.05, w * 0.05, w * 0.22, w * (0.3 + lv * 0.02));
  // A spoon left in the pot.
  ctx.strokeStyle = hsl(TIMBER, 4);
  ctx.lineWidth = Math.max(1.5, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -w * 0.28);
  ctx.lineTo(-w * 0.26, -w * 0.52);
  ctx.stroke();
  dotEyes(ctx, -w * 0.05, -w * 0.12, w * 0.12, w * 0.025, {
    happy: look.full > 0.9,
  });
}

// The vault is a mossy stone strongroom with a round rune door.
function vault(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const a = w * 0.44;
  const h = w * 0.4;
  block(
    ctx,
    0,
    0,
    a,
    h,
    lv >= 2 ? MOSSY : STONE,
    lv >= 3 ? ART.gold : undefined,
  );
  bricks(ctx, 0, 0, a, h, STONE);
  mossTop(ctx, 0, -h, a, 31);
  // Ivy down the left face.
  ctx.strokeStyle = hsl(LEAF, 0);
  ctx.lineWidth = Math.max(1, w * 0.02);
  for (const k of [0.25, 0.6]) {
    const x = -a + a * k;
    const y = (a / 2) * k - h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.04, y + h * 0.4, x - w * 0.02, y + h * 0.75);
    ctx.stroke();
    for (let i = 1; i < 4; i++) {
      ellipse(
        ctx,
        x + (i % 2 ? w * 0.025 : -w * 0.02),
        y + h * 0.2 * i,
        w * 0.03,
        w * 0.02,
        0.6,
      );
      ctx.fillStyle = hsl(LEAF, 10);
      ctx.fill();
    }
  }
  // The round door on the right face, its runes glowing.
  const dx = a * 0.5;
  const dy = a * 0.25 - h * 0.5;
  const pulse = look.still ? 0.6 : 0.45 + Math.sin(look.t * 2.4) * 0.25;
  glow(ctx, dx, dy, w * 0.3, RUNE, pulse * 0.6);
  ellipse(ctx, dx, dy, w * 0.14, w * 0.16, -0.45);
  shade(ctx, c(200, 14, 44), dx, dy, w * 0.16, 20, -14);
  outline(ctx, 1.2, ART.ink, 0.7);
  const turn = look.still ? 0.4 : look.t * 0.6;
  ctx.strokeStyle = hsl(RUNE, 10, 0.5 + pulse * 0.5);
  ctx.lineWidth = Math.max(1, w * 0.018);
  ctx.beginPath();
  ctx.ellipse(dx, dy, w * 0.09, w * 0.105, -0.45, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const ang = turn + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + Math.cos(ang) * w * 0.06, dy + Math.sin(ang) * w * 0.07);
    ctx.stroke();
  }
  // Gold bars on top, more with each level, and a crystal from level 4.
  for (let i = 0; i < Math.min(5, lv + 1); i++) {
    block(
      ctx,
      -w * 0.12 + (i % 3) * w * 0.1,
      -h - Math.floor(i / 3) * w * 0.06 + (i % 3) * w * 0.03,
      w * 0.07,
      w * 0.05,
      ART.gold,
    );
  }
  if (lv >= 4)
    crystal(ctx, w * 0.02, -h - w * 0.32, w * 0.07, RUNE, look.t, look.still);
}

// The break room is a cottage under a bluebell, like a flower sprite's hat.
function breakroom(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const r = w * 0.3;
  const h = w * 0.28;
  cylinder(ctx, 0, 0, r, h, c(42, 38, 84));
  lit(ctx, 0, r * 0.5 - h * 0.38, w * 0.065, w * 0.1);
  lit(ctx, -r * 0.62, r * 0.25 - h * 0.6, w * 0.035, w * 0.045);
  const bell = pick(BELL, lv);
  const top = -h + r * 0.05;
  const tipX = r * 0.25;
  const tipY = top - r * 1.95;
  // The bell flower, its petals curling out at the bottom.
  ctx.beginPath();
  ctx.moveTo(-r * 1.4, top);
  const petals = 5;
  for (let i = 0; i <= petals * 2; i++) {
    const ang = Math.PI - (i / (petals * 2)) * Math.PI;
    const droop = i % 2 === 1 ? r * 0.28 : 0;
    ctx.lineTo(Math.cos(ang) * r * 1.4, top + Math.sin(ang) * r * 0.5 + droop);
  }
  ctx.quadraticCurveTo(r * 1.0, top - r * 0.9, tipX, tipY);
  ctx.quadraticCurveTo(-r * 0.9, top - r * 0.9, -r * 1.4, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, tipY, r, top);
  g.addColorStop(0, hsl(bell, 14));
  g.addColorStop(0.6, hsl(bell, 0));
  g.addColorStop(1, hsl(bell, -16));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(1, w * 0.02), ART.ink, 0.5);
  // Veins from the tip to each petal.
  ctx.strokeStyle = hsl(bell, -20, 0.35);
  ctx.lineWidth = 1;
  for (let i = 1; i < petals * 2; i += 2) {
    const ang = Math.PI - (i / (petals * 2)) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY + r * 0.3);
    ctx.quadraticCurveTo(
      Math.cos(ang) * r * 0.8,
      top - r * 0.5,
      Math.cos(ang) * r * 1.3,
      top + Math.sin(ang) * r * 0.5 + r * 0.22,
    );
    ctx.stroke();
  }
  // The stem curls over, with a small flower at its end.
  const sway = look.still ? 0 : Math.sin(look.t * 1.5) * r * 0.06;
  ctx.strokeStyle = hsl(c(110, 40, 46));
  ctx.lineWidth = Math.max(1.5, w * 0.035);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(
    tipX + r * 0.5,
    tipY - r * 0.55,
    tipX + r * 1.0 + sway,
    tipY - r * 0.1,
  );
  ctx.stroke();
  if (lv >= 2) {
    const fx = tipX + r * 1.0 + sway;
    const fy = tipY + r * 0.05;
    glow(ctx, fx, fy, r * 0.5, bell, 0.4);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + 0.3;
      ellipse(
        ctx,
        fx + Math.cos(ang) * r * 0.12,
        fy + Math.sin(ang) * r * 0.12,
        r * 0.11,
        r * 0.08,
        ang,
      );
      ctx.fillStyle = hsl(bell, 14);
      ctx.fill();
    }
    ellipse(ctx, fx, fy, r * 0.05, r * 0.05);
    ctx.fillStyle = hsl(ART.gold, 10);
    ctx.fill();
  }
  if (lv >= 3)
    lantern(
      ctx,
      r * 0.95,
      top + r * 0.3,
      w * 0.08,
      w * 0.045,
      look.t,
      look.still,
    );
  if (lv >= 4)
    crystal(ctx, -r * 0.5, tipY + r * 0.1, w * 0.05, LILAC, look.t, look.still);
}

// A defense: a stump, a stone tower or a wizard's tower, with the desk
// helper on top.
function turret(ctx: Ctx, kind: BuildingKind, w: number, look: BuildingLook) {
  const lv = look.level;
  const tall = kind === "lamp";
  const h = w * (tall ? 0.6 + lv * 0.06 : 0.22 + lv * 0.05);
  if (tall) {
    cylinder(ctx, 0, 0, w * 0.24, h, MOSSY);
    ctx.strokeStyle = hsl(MOSSY, -20, 0.4);
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -h * (i / 5), w * 0.24, w * 0.12, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Bands of runes that glow as it charges.
    const charge = look.still ? 0.6 : 0.3 + look.full * 0.7;
    for (const k of [0.3, 0.7]) {
      ctx.strokeStyle = hsl(RUNE, 0, 0.25 * charge);
      ctx.lineWidth = Math.max(3, w * 0.07);
      ctx.beginPath();
      ctx.ellipse(0, -h * k, w * 0.24, w * 0.12, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.strokeStyle = hsl(RUNE, 14, charge);
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.stroke();
    }
    lit(ctx, -w * 0.08, -h * 0.52, w * 0.035, w * 0.05);
  } else if (lv <= 2) {
    // A tree stump, with its rings on top and a mushroom at its foot.
    const r = w * 0.32;
    cylinder(ctx, 0, 0, r, h, BARK);
    ellipse(ctx, 0, -h, r * 0.92, r * 0.44);
    ctx.fillStyle = hsl(c(34, 46, 62));
    ctx.fill();
    ctx.strokeStyle = hsl(c(30, 40, 46), 0, 0.7);
    ctx.lineWidth = 1;
    for (const k of [0.3, 0.55, 0.8]) {
      ctx.beginPath();
      ctx.ellipse(0, -h, r * 0.92 * k, r * 0.44 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    mushroom(ctx, r * 0.95, r * 0.25, w * 0.07, w * 0.08, c(4, 70, 56));
  } else {
    const m = lv >= 4 ? c(42, 20, 82) : MOSSY;
    block(ctx, 0, 0, w * 0.4, h, m, lv >= 4 ? ART.gold : undefined);
    bricks(ctx, 0, 0, w * 0.4, h, m);
    for (const [dx, dy] of [
      [-0.28, 0],
      [0.28, 0],
      [0, -0.14],
      [0, 0.14],
    ]) {
      block(ctx, (dx ?? 0) * w, -h + (dy ?? 0) * w, w * 0.07, w * 0.08, m);
    }
    // Ivy climbing the front corner.
    ctx.strokeStyle = hsl(LEAF, 4);
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, w * 0.2);
    ctx.quadraticCurveTo(
      w * 0.05,
      w * 0.2 - h * 0.5,
      -w * 0.02,
      w * 0.2 - h * 0.9,
    );
    ctx.stroke();
  }
  const helper: HelperLook = {
    ...RESTING,
    t: look.t,
    still: look.still,
    acted: look.acted,
    bitten: look.bitten,
    charge: look.full,
  };
  const s = w * (kind === "printer" ? 0.62 : 0.58);
  ctx.save();
  ctx.translate(0, -h - s * 0.12);
  ctx.scale(look.facing, 1);
  drawHelper(
    ctx,
    kind === "stapler" ||
      kind === "fan" ||
      kind === "printer" ||
      kind === "lamp"
      ? kind
      : "stapler",
    0,
    -s * 0.3,
    s,
    helper,
    false,
  );
  ctx.restore();
}

// A wall post, with hedges running to its neighbors.
export interface Links {
  right: boolean;
  down: boolean;
}

function wall(ctx: Ctx, w: number, look: BuildingLook, links: Links) {
  const lv = look.level;
  const h = w * (0.26 + lv * 0.025);
  const post = lv >= 4 ? c(42, 20, 82) : MOSSY;
  const base = lv >= 3 ? h * 0.35 : 0;
  // Hedges toward the next wall along each grid direction. They are drawn
  // from this post, so each joint is drawn once.
  const panel = (dx: number, dy: number) => {
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const k = i / (steps + 1);
      const x = dx * k;
      const y = dy * k;
      if (base > 0) block(ctx, x, y, w * 0.12, base, post);
      block(ctx, x, y - base, w * 0.12, (h - base) * 0.8, HEDGE);
      ellipse(ctx, x, y - base - (h - base) * 0.8, w * 0.1, w * 0.06);
      shade(ctx, HEDGE, x, y - h * 0.8, w * 0.1, 18, -6);
      if (lv >= 2 && i % 2 === 0) {
        ellipse(
          ctx,
          x - w * 0.03,
          y - base - (h - base) * 0.5,
          w * 0.025,
          w * 0.025,
        );
        ctx.fillStyle = hsl(lv >= 5 ? ART.gold : BLOSSOM, 6);
        ctx.fill();
      }
    }
  };
  if (links.right) panel(w / 2, w / 4);
  if (links.down) panel(-w / 2, w / 4);
  block(ctx, 0, 0, w * 0.15, h, post, lv >= 4 ? ART.gold : undefined);
  block(
    ctx,
    0,
    -h,
    w * 0.17,
    w * 0.04,
    lv >= 5 ? ART.gold : c(post.h, post.s, post.l - 14),
  );
  if (lv >= 5) glow(ctx, 0, -h - w * 0.06, w * 0.14, ART.gold, 0.5);
  else mossTop(ctx, 0, -h - w * 0.04, w * 0.17, 3);
}

function decor(ctx: Ctx, kind: BuildingKind, w: number, look: BuildingLook) {
  switch (kind) {
    case "plant": {
      // Glowcaps: three little mushrooms that pulse with light.
      const pulse = look.still ? 0.4 : 0.3 + Math.sin(look.t * 1.8) * 0.15;
      mushroom(
        ctx,
        -w * 0.12,
        w * 0.02,
        w * 0.11,
        w * 0.12,
        RUNE,
        false,
        pulse,
      );
      mushroom(
        ctx,
        w * 0.1,
        -w * 0.04,
        w * 0.08,
        w * 0.08,
        c(170, 90, 60),
        false,
        pulse,
      );
      mushroom(ctx, w * 0.02, w * 0.1, w * 0.06, w * 0.05, LILAC, false, pulse);
      return;
    }
    case "cooler": {
      // A wishing well with a little roof.
      cylinder(ctx, 0, 0, w * 0.24, w * 0.14, STONE);
      bricks(ctx, 0, 0, w * 0.17, w * 0.14, STONE);
      ellipse(ctx, 0, -w * 0.14, w * 0.18, w * 0.08);
      ctx.fillStyle = hsl(WATER, -10);
      ctx.fill();
      glow(ctx, 0, -w * 0.14, w * 0.2, WATER, 0.5);
      ctx.strokeStyle = hsl(TIMBER, -10);
      ctx.lineWidth = Math.max(1.5, w * 0.03);
      for (const x of [-w * 0.2, w * 0.2]) {
        ctx.beginPath();
        ctx.moveTo(x, -w * 0.1);
        ctx.lineTo(x, -w * 0.48);
        ctx.stroke();
      }
      roof(ctx, 0, -w * 0.46, w * 0.28, w * 0.18, c(8, 50, 46));
      if (!look.still) {
        const rise = (look.t * 0.5) % 1;
        glow(
          ctx,
          Math.sin(look.t * 2) * w * 0.05,
          -w * 0.18 - rise * w * 0.3,
          w * 0.04,
          SUN,
          0.9 * (1 - rise),
        );
      }
      return;
    }
    case "banner": {
      cylinder(ctx, 0, 0, w * 0.06, w * 0.04, STONE);
      flag(
        ctx,
        0,
        -w * 0.04,
        w * 0.72,
        look.t,
        look.still,
        [ART.magenta, ART.cyan, LILAC][look.level % 3] ?? ART.magenta,
      );
      return;
    }
    case "lamppost": {
      // A fairy lantern on a curling wooden post.
      ctx.strokeStyle = hsl(TIMBER, -14);
      ctx.lineWidth = Math.max(2, w * 0.045);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-w * 0.04, -w * 0.4, 0, -w * 0.62);
      ctx.quadraticCurveTo(w * 0.08, -w * 0.76, w * 0.16, -w * 0.64);
      ctx.stroke();
      lantern(ctx, w * 0.16, -w * 0.64, w * 0.05, w * 0.07, look.t, look.still);
      // Two fairies circling the light.
      for (let i = 0; i < 2; i++) {
        const ang = (look.still ? 1 : look.t * 1.4) + i * Math.PI;
        glow(
          ctx,
          w * 0.16 + Math.cos(ang) * w * 0.2,
          -w * 0.5 + Math.sin(ang) * w * 0.08,
          w * 0.05,
          i === 0 ? FIREFLY : BLOSSOM,
          0.9,
        );
      }
      return;
    }
    case "fountain": {
      cylinder(ctx, 0, 0, w * 0.4, w * 0.1, MOSSY);
      ellipse(ctx, 0, -w * 0.1, w * 0.33, w * 0.15);
      ctx.fillStyle = hsl(WATER, 6);
      ctx.fill();
      glow(ctx, 0, -w * 0.1, w * 0.36, RUNE, 0.35);
      // Lily pads.
      for (const [x, y] of [
        [-0.18, -0.08],
        [0.16, -0.14],
      ] as const) {
        ellipse(ctx, x * w, y * w, w * 0.06, w * 0.03);
        ctx.fillStyle = hsl(LEAF, 10);
        ctx.fill();
      }
      cylinder(ctx, 0, -w * 0.1, w * 0.06, w * 0.22, MOSSY);
      ctx.strokeStyle = hsl(RUNE, 16, 0.85);
      ctx.lineWidth = Math.max(1.5, w * 0.03);
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + (look.still ? 0 : look.t * 0.5);
        const jx = Math.cos(ang) * w * 0.24;
        const jy = -w * 0.1 + Math.sin(ang) * w * 0.1;
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.32);
        ctx.quadraticCurveTo(jx * 0.6, -w * 0.55, jx, jy);
        ctx.stroke();
      }
      return;
    }
    case "statue": {
      block(ctx, 0, 0, w * 0.24, w * 0.2, MOSSY, ART.gold);
      mossTop(ctx, 0, -w * 0.2, w * 0.24, 9);
      drawDot(ctx, 0, -w * 0.18, w * 0.5, 0, true);
      // A golden sheen over Dot, so it reads as a statue.
      ellipse(ctx, 0, -w * 0.45, w * 0.24, w * 0.3);
      ctx.fillStyle = hsl(ART.gold, 10, 0.45);
      ctx.fill();
      glow(
        ctx,
        0,
        -w * 0.45,
        w * 0.45,
        ART.gold,
        look.still ? 0.3 : 0.25 + Math.sin(look.t * 1.5) * 0.1,
      );
      return;
    }
    default:
      return;
  }
}

// Draw a building whose footprint's middle is at (cx, cy). `w` is the
// width of one tile's diamond on screen.
export function drawBuilding(
  ctx: Ctx,
  kind: BuildingKind,
  cx: number,
  cy: number,
  w: number,
  look: BuildingLook,
  links: Links = { right: false, down: false },
) {
  const shake =
    !look.still && look.bitten < 0.12 ? Math.sin(look.t * 70) * w * 0.03 : 0;
  const big = kind === "office";
  if (kind !== "wall")
    groundShadow(
      ctx,
      cx,
      cy + w * 0.04,
      w * (big ? 0.95 : 0.4),
      w * (big ? 0.42 : 0.18),
    );
  ctx.save();
  ctx.translate(cx + shake, cy);
  switch (kind) {
    case "office":
      office(ctx, w, look);
      break;
    case "press":
      press(ctx, w, look);
      break;
    case "coffee":
      brewery(ctx, w, look);
      break;
    case "vault":
      vault(ctx, w, look);
      break;
    case "breakroom":
      breakroom(ctx, w, look);
      break;
    case "stapler":
    case "fan":
    case "printer":
    case "lamp":
      turret(ctx, kind, w, look);
      break;
    case "wall":
      wall(ctx, w, look, links);
      break;
    default:
      decor(ctx, kind, w, look);
  }
  ctx.restore();
}

// A level badge, near the front of a footprint.
export function badge(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  level: number,
) {
  ellipse(ctx, x, y, r, r);
  shade(ctx, ART.gold, x, y, r, 18, -12);
  outline(ctx, Math.max(1, r * 0.18));
  ctx.fillStyle = hsl(ART.ink);
  ctx.font = `800 ${Math.round(r * 1.3)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(level), x, y + r * 0.08);
  ctx.textBaseline = "alphabetic";
}

// Wooden scaffolding around a job, a little builder robot hammering, and
// how far along it is.
export function drawScaffold(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  size: number,
  share: number,
  label: string,
  t: number,
  still: boolean,
) {
  const a = (w * size) / 2;
  const b = a / 2;
  const h = w * (size > 1 ? 0.9 : 0.6);
  ctx.strokeStyle = hsl(c(30, 50, 42));
  ctx.lineWidth = Math.max(1.5, w * 0.035);
  const posts: [number, number][] = [
    [-a * 0.9, 0],
    [0, b * 0.9],
    [a * 0.9, 0],
  ];
  for (const [x, y] of posts) {
    ctx.beginPath();
    ctx.moveTo(cx + x, cy + y);
    ctx.lineTo(cx + x, cy + y - h);
    ctx.stroke();
  }
  for (const k of [0.35, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(cx - a * 0.9, cy - h * k);
    ctx.lineTo(cx, cy + b * 0.9 - h * k);
    ctx.lineTo(cx + a * 0.9, cy - h * k);
    ctx.stroke();
  }
  // The builder, hopping as it hammers.
  const hop = still ? 0 : Math.abs(Math.sin(t * 8)) * w * 0.05;
  drawDot(ctx, cx + a * 0.55, cy + b * 0.6 - hop, w * 0.42, t, still);
  const swing = still ? 0 : Math.sin(t * 16) * 0.7;
  ctx.save();
  ctx.translate(cx + a * 0.55 + w * 0.12, cy + b * 0.6 - hop - w * 0.25);
  ctx.rotate(-0.6 + swing);
  ctx.fillStyle = hsl(c(30, 50, 38));
  ctx.fillRect(-w * 0.012, -w * 0.12, w * 0.024, w * 0.12);
  ctx.fillStyle = hsl(ART.metal, -10);
  ctx.fillRect(-w * 0.045, -w * 0.15, w * 0.09, w * 0.04);
  ctx.restore();
  // Progress, and the time left.
  const bw = w * Math.max(0.7, size * 0.6);
  const by = cy - h - w * 0.2;
  rounded(ctx, cx - bw / 2, by, bw, w * 0.1, w * 0.05);
  ctx.fillStyle = hsl(ART.ink, 0, 0.6);
  ctx.fill();
  rounded(
    ctx,
    cx - bw / 2,
    by,
    bw * Math.min(1, Math.max(0.06, share)),
    w * 0.1,
    w * 0.05,
  );
  ctx.fillStyle = hsl(ART.hopper, 12);
  ctx.fill();
  ctx.font = `700 ${Math.round(w * 0.16)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = hsl(ART.ink, 0, 0.8);
  ctx.strokeText(label, cx, by - w * 0.05);
  ctx.fillStyle = hsl(ART.white);
  ctx.fillText(label, cx, by - w * 0.05);
}

export function drawClutter(
  ctx: Ctx,
  kind: ClutterKind,
  cx: number,
  cy: number,
  w: number,
  seed: number,
) {
  const random = seeded(seed);
  groundShadow(ctx, cx, cy + w * 0.04, w * 0.36, w * 0.16);
  switch (kind) {
    case "boxes": {
      // A fallen log lying along the grid, with a mushroom on it.
      const r = w * 0.11;
      const x0 = cx - w * 0.22;
      const y0 = cy - w * 0.11;
      const x1 = cx + w * 0.22;
      const y1 = cy + w * 0.11;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - r * 1.6);
      ctx.lineTo(x1, y1 - r * 1.6);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x0, y0);
      ctx.closePath();
      ctx.fillStyle = hsl(BARK, 6);
      ctx.fill();
      outline(ctx, 1, ART.ink, 0.5);
      ellipse(ctx, x1, y1 - r * 0.8, r * 0.7, r * 0.85);
      ctx.fillStyle = hsl(c(34, 46, 60));
      ctx.fill();
      outline(ctx, 1, ART.ink, 0.5);
      ellipse(ctx, x1, y1 - r * 0.8, r * 0.35, r * 0.45);
      ctx.strokeStyle = hsl(c(30, 40, 44));
      ctx.stroke();
      mushroom(
        ctx,
        cx - w * 0.04,
        cy - r * 1.4,
        w * 0.05,
        w * 0.05,
        c(4, 70, 56),
      );
      return;
    }
    case "papers": {
      // A heap of fallen leaves.
      const colors = [
        c(24, 80, 52),
        c(40, 85, 55),
        c(8, 70, 48),
        c(50, 70, 50),
      ];
      for (let i = 0; i < 16; i++) {
        const x = cx + (random() - 0.5) * w * 0.42;
        const y = cy - random() * w * 0.16;
        ellipse(ctx, x, y, w * 0.06, w * 0.03, random() * Math.PI);
        ctx.fillStyle = hsl(colors[i % colors.length] ?? LEAF, random() * 10);
        ctx.fill();
      }
      return;
    }
    case "bush": {
      // A dark bramble with purple berries.
      for (let i = 0; i < 5; i++) {
        const x = cx + (random() - 0.5) * w * 0.4;
        const y = cy - w * 0.08 - random() * w * 0.16;
        ellipse(ctx, x, y, w * 0.16, w * 0.13);
        shade(ctx, c(150, 40, 28), x, y, w * 0.16, 14, -10);
      }
      for (let i = 0; i < 5; i++) {
        ellipse(
          ctx,
          cx + (random() - 0.5) * w * 0.3,
          cy - w * 0.12 - random() * w * 0.12,
          w * 0.025,
          w * 0.025,
        );
        ctx.fillStyle = hsl(LILAC, -6);
        ctx.fill();
      }
      return;
    }
    case "rock": {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, cy);
      ctx.quadraticCurveTo(
        cx - w * 0.28,
        cy - w * 0.26,
        cx - w * 0.02,
        cy - w * 0.3,
      );
      ctx.quadraticCurveTo(cx + w * 0.3, cy - w * 0.24, cx + w * 0.3, cy);
      ctx.quadraticCurveTo(cx, cy + w * 0.12, cx - w * 0.3, cy);
      shade(ctx, STONE, cx - w * 0.06, cy - w * 0.14, w * 0.3, 16, -16);
      outline(ctx, 1, ART.ink, 0.5);
      // A cap of moss on top.
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.24, cy - w * 0.14);
      ctx.quadraticCurveTo(cx - w * 0.2, cy - w * 0.3, cx, cy - w * 0.3);
      ctx.quadraticCurveTo(
        cx + w * 0.2,
        cy - w * 0.27,
        cx + w * 0.22,
        cy - w * 0.16,
      );
      ctx.quadraticCurveTo(cx, cy - w * 0.2, cx - w * 0.24, cy - w * 0.14);
      shade(ctx, MOSS, cx - w * 0.05, cy - w * 0.24, w * 0.2, 16, -10);
      return;
    }
  }
}

export function drawRubble(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  seed: number,
) {
  const random = seeded(seed);
  groundShadow(ctx, cx, cy, w * 0.42, w * 0.18);
  for (let i = 0; i < 9; i++) {
    const x = cx + (random() - 0.5) * w * 0.6;
    const y = cy - random() * w * 0.12;
    block(
      ctx,
      x,
      y,
      w * (0.04 + random() * 0.05),
      w * (0.03 + random() * 0.04),
      i % 3 === 0
        ? c(26, 30, 30 + random() * 15)
        : c(180, 8, 40 + random() * 25),
    );
  }
}

// The glade the fort stands in, with the forest around it. Drawn once for
// each size and kept.
const groundCache = new Map<string, HTMLCanvasElement>();

export interface Ground {
  width: number;
  height: number;
  // Turns a spot on the grid into a point on screen.
  at: (gx: number, gy: number) => { x: number; y: number };
  w: number;
  cols: number;
  rows: number;
}

// A forest tree: a leaning trunk under a cloud of leaves.
function forestTree(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  color: Hsl,
  seed: number,
) {
  groundShadow(ctx, x, y, s * 0.5, s * 0.18);
  const lean = (seeded(seed)() - 0.5) * s * 0.2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y);
  ctx.quadraticCurveTo(
    x - s * 0.05,
    y - s * 0.4,
    x + lean - s * 0.04,
    y - s * 0.75,
  );
  ctx.lineTo(x + lean + s * 0.04, y - s * 0.75);
  ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.4, x + s * 0.1, y);
  ctx.closePath();
  ctx.fillStyle = hsl(BARK, -4);
  ctx.fill();
  foliage(ctx, x + lean, y - s * 0.9, s * 0.48, color, seed, 6);
}

function paintGround(ctx: Ctx, g: Ground) {
  const random = seeded(5);
  const W = g.width;
  const H = g.height;

  // Behind everything: deep forest under a dusk sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, hsl(c(278, 42, 34)));
  sky.addColorStop(0.32, hsl(c(205, 44, 24)));
  sky.addColorStop(1, hsl(c(165, 48, 13)));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.5, -H * 0.1, Math.max(W, H) * 0.6, c(326, 70, 68), 0.35);
  glow(ctx, W * 0.3, 0, W * 0.4, SUN, 0.3);
  // Far trunks fading into the mist.
  for (let i = 0; i < 18; i++) {
    const x = random() * W;
    const tw = g.w * (0.1 + random() * 0.2);
    const tall = H * (0.5 + random() * 0.3);
    const fade = ctx.createLinearGradient(0, 0, 0, tall);
    fade.addColorStop(0, hsl(c(200, 40, 9), 0, 0.85));
    fade.addColorStop(1, hsl(c(200, 40, 9), 0, 0));
    ctx.fillStyle = fade;
    poly(ctx, [
      x - tw * 0.4,
      0,
      x + tw * 0.4,
      0,
      x + tw * 0.7,
      tall,
      x - tw * 0.7,
      tall,
    ]);
    ctx.fill();
  }
  // Sparkles in the sky.
  for (let i = 0; i < 60; i++) {
    const x = random() * W;
    const y = random() * H * 0.5;
    ellipse(ctx, x, y, 0.8 + random(), 0.8 + random());
    ctx.fillStyle = hsl(ART.white, 0, 0.3 + random() * 0.5);
    ctx.fill();
  }

  const corner = (gx: number, gy: number) => g.at(gx, gy);
  const diamond = (x0: number, y0: number, x1: number, y1: number) => {
    const p = [corner(x0, y0), corner(x1, y0), corner(x1, y1), corner(x0, y1)];
    ctx.beginPath();
    p.forEach((q, i) =>
      i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y),
    );
    ctx.closePath();
  };

  // A raised edge of earth under the glade, with roots hanging from it.
  const left = corner(0, g.rows);
  const bottom = corner(g.cols, g.rows);
  const right = corner(g.cols, 0);
  const deep = g.w * 0.26;
  ctx.save();
  ctx.translate(0, deep);
  diamond(0, 0, g.cols, g.rows);
  const earth = ctx.createLinearGradient(0, left.y, 0, bottom.y + deep);
  earth.addColorStop(0, hsl(c(28, 34, 26)));
  earth.addColorStop(1, hsl(c(24, 36, 16)));
  ctx.fillStyle = earth;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = hsl(c(26, 30, 18));
  ctx.lineWidth = Math.max(1, g.w * 0.03);
  for (let i = 0; i < 24; i++) {
    const k = random();
    const onLeft = i % 2 === 0;
    const from = onLeft ? left : bottom;
    const to = onLeft ? bottom : right;
    const x = from.x + (to.x - from.x) * k;
    const y = from.y + (to.y - from.y) * k + deep;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.quadraticCurveTo(
      x + g.w * 0.1,
      y + g.w * 0.15,
      x - g.w * 0.02,
      y + g.w * (0.2 + random() * 0.25),
    );
    ctx.stroke();
  }

  // The glade: soft moss in patches of green.
  ctx.save();
  diamond(0, 0, g.cols, g.rows);
  ctx.clip();
  ctx.fillStyle = hsl(MOSS);
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const p = g.at(random() * g.cols, random() * g.rows);
    const r = g.w * (0.4 + random() * 1.1);
    ellipse(ctx, p.x, p.y, r, r * 0.5);
    ctx.fillStyle = hsl(c(92 + random() * 50, 44, 34 + random() * 16), 0, 0.35);
    ctx.fill();
  }
  // A faint grid, so a tile can be read, and a darker rim.
  for (let gx = 0; gx < g.cols; gx++) {
    for (let gy = 0; gy < g.rows; gy++) {
      const edge =
        gx === 0 || gy === 0 || gx === g.cols - 1 || gy === g.rows - 1;
      diamond(gx, gy, gx + 1, gy + 1);
      ctx.fillStyle = edge
        ? hsl(ART.ink, 0, 0.14)
        : hsl(ART.white, 0, (gx + gy) % 2 === 0 ? 0.04 : 0);
      ctx.fill();
    }
  }
  // Light from the top left, and dusk in the far corner.
  const light = ctx.createLinearGradient(
    corner(0, 0).x,
    corner(0, 0).y,
    bottom.x,
    bottom.y,
  );
  light.addColorStop(0, hsl(SUN, 0, 0.18));
  light.addColorStop(0.5, hsl(SUN, 0, 0));
  light.addColorStop(1, hsl(c(250, 40, 20), 0, 0.22));
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
  // Grass, clover and flowers: lilac clusters, bluebells and glowing specks.
  for (let i = 0; i < g.cols * g.rows * 5; i++) {
    const p = g.at(random() * g.cols, random() * g.rows);
    const roll = random();
    if (roll < 0.05) {
      for (let k = 0; k < 5; k++) {
        ellipse(ctx, p.x + (random() - 0.5) * 5, p.y - k * 1.6, 1.6, 1.4);
        ctx.fillStyle = hsl(LILAC, random() * 14);
        ctx.fill();
      }
    } else if (roll < 0.08) {
      ellipse(ctx, p.x, p.y, 1.8, 2.2);
      ctx.fillStyle = hsl(BELL[0] ?? LILAC, 4);
      ctx.fill();
    } else if (roll < 0.11) {
      glow(ctx, p.x, p.y, 3, FIREFLY, 0.8);
    } else if (roll < 0.14) {
      ellipse(ctx, p.x, p.y, 1.4, 1.4);
      ctx.fillStyle = hsl(ART.white, 0, 0.9);
      ctx.fill();
    } else {
      ctx.strokeStyle = hsl(MOSS, random() < 0.5 ? -14 : 14, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + 1, p.y - 2, p.x + 2, p.y - 4);
      ctx.stroke();
    }
  }
  ctx.restore();
  // A path of glowing dots where the fort's land begins.
  diamond(1, 1, g.cols - 1, g.rows - 1);
  ctx.setLineDash([2, 7]);
  ctx.lineCap = "round";
  ctx.strokeStyle = hsl(SUN, 0, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  // Little glowing mushrooms on the rim of the glade.
  for (let i = 0; i < 14; i++) {
    const side = i % 4;
    const k = random();
    const gx =
      side === 0
        ? k * g.cols
        : side === 1
          ? g.cols - 0.4
          : side === 2
            ? k * g.cols
            : 0.4;
    const gy = side === 0 ? 0.4 : side === 2 ? g.rows - 0.4 : k * g.rows;
    const p = g.at(gx, gy);
    mushroom(
      ctx,
      p.x,
      p.y,
      g.w * 0.05,
      g.w * 0.05,
      random() < 0.5 ? RUNE : c(300, 70, 66),
      false,
      0.4,
    );
  }

  // A pond in the corner below the glade, holding the sky.
  const pondX = left.x + (bottom.x - left.x) * 0.3;
  const edgeY = left.y + (bottom.y - left.y) * 0.3 + deep + g.w * 0.3;
  const room = H - edgeY;
  let pond: { x: number; y: number; rx: number; ry: number } | null = null;
  if (room > g.w * 0.6) {
    const ry = Math.min(room * 0.3, g.w * 0.7);
    pond = { x: pondX, y: edgeY + room * 0.45, rx: ry * 2.3, ry };
    ellipse(ctx, pond.x, pond.y, pond.rx + 3, pond.ry + 3);
    ctx.fillStyle = hsl(c(160, 30, 20));
    ctx.fill();
    ellipse(ctx, pond.x, pond.y, pond.rx, pond.ry);
    const water = ctx.createLinearGradient(
      0,
      pond.y - pond.ry,
      0,
      pond.y + pond.ry,
    );
    water.addColorStop(0, hsl(c(205, 50, 26)));
    water.addColorStop(0.45, hsl(c(290, 45, 56)));
    water.addColorStop(0.7, hsl(c(330, 60, 70)));
    water.addColorStop(1, hsl(c(268, 45, 40)));
    ctx.fillStyle = water;
    ctx.fill();
    // The glow of the sky on the water, and ripples of light.
    ctx.save();
    ellipse(ctx, pond.x, pond.y, pond.rx, pond.ry);
    ctx.clip();
    glow(
      ctx,
      pond.x + pond.rx * 0.2,
      pond.y + pond.ry * 0.2,
      pond.rx * 0.6,
      SUN,
      0.4,
    );
    ctx.strokeStyle = hsl(ART.white, 0, 0.35);
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = pond.y - pond.ry * 0.6 + (i / 8) * pond.ry * 1.3;
      const x = pond.x + (random() - 0.5) * pond.rx;
      const len = pond.rx * (0.15 + random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(x - len / 2, y);
      ctx.lineTo(x + len / 2, y);
      ctx.stroke();
    }
    ctx.restore();
    // Reeds along the far shore.
    ctx.strokeStyle = hsl(c(120, 36, 30));
    ctx.lineWidth = Math.max(1, g.w * 0.02);
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + (i / 11) * Math.PI;
      const x = pond.x + Math.cos(a) * pond.rx * 0.96;
      const y = pond.y + Math.sin(a) * pond.ry * 0.96;
      const tall = g.w * (0.15 + random() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + g.w * 0.03,
        y - tall * 0.6,
        x + g.w * 0.05,
        y - tall,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2;
      const d = random() * 0.8;
      ellipse(
        ctx,
        pond.x + Math.cos(a) * pond.rx * d,
        pond.y + Math.sin(a) * pond.ry * d,
        g.w * 0.02,
        g.w * 0.02,
      );
      ctx.fillStyle = hsl(ART.white, 0, 0.7);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const x = pond.x + (random() - 0.5) * pond.rx;
      const y = pond.y + (random() - 0.5) * pond.ry;
      ellipse(ctx, x, y, g.w * 0.1, g.w * 0.045);
      ctx.fillStyle = hsl(LEAF, 8);
      ctx.fill();
      if (i === 0) {
        ellipse(ctx, x, y - 2, g.w * 0.03, g.w * 0.025);
        ctx.fillStyle = hsl(BLOSSOM, 6);
        ctx.fill();
      }
    }
  }

  // Trees around the outside, back ones first.
  const top = corner(0, 0);
  const trees: { x: number; y: number; s: number; color: Hsl; seed: number }[] =
    [];
  const colors = [
    c(140, 44, 34),
    c(168, 46, 32),
    c(150, 40, 28),
    c(322, 52, 64),
    c(270, 42, 58),
  ];
  for (let i = 0; i < 80; i++) {
    const x = random() * W;
    const y = random() * H;
    const kind = Math.floor(random() * colors.length);
    const size = g.w * (0.55 + random() * 0.45);
    // Keep them off the glade: test the point against the diamond.
    const u = (x - top.x) / (g.w / 2);
    const v = (y - top.y) / (g.w / 4);
    const gx = (u + v) / 2;
    const gy = (v - u) / 2;
    if (gx > -0.8 && gy > -0.8 && gx < g.cols + 0.8 && gy < g.rows + 1.4)
      continue;
    if (
      pond &&
      ((x - pond.x) / (pond.rx + g.w * 0.3)) ** 2 +
        ((y - pond.y) / (pond.ry + g.w * 0.6)) ** 2 <
        1
    )
      continue;
    trees.push({ x, y, s: size, color: colors[kind] ?? LEAF, seed: i });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) forestTree(ctx, t.x, t.y, t.s, t.color, t.seed);
}

export function drawGround(ctx: Ctx, g: Ground, ratio: number) {
  const key = `${g.width}x${g.height}:${ratio}:${g.w}`;
  let canvas = groundCache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(g.width * ratio);
    canvas.height = Math.ceil(g.height * ratio);
    const cx = canvas.getContext("2d");
    if (!cx) return;
    cx.scale(ratio, ratio);
    paintGround(cx, g);
    if (groundCache.size > 6) groundCache.clear();
    groundCache.set(key, canvas);
  }
  ctx.drawImage(canvas, 0, 0, g.width, g.height);
}

// The glowing motes, one small picture per color, drawn once.
const moteCache = new Map<string, HTMLCanvasElement>();

function mote(color: Hsl) {
  const key = `${color.h},${color.s},${color.l}`;
  let m = moteCache.get(key);
  if (!m) {
    m = document.createElement("canvas");
    m.width = 32;
    m.height = 32;
    const g = m.getContext("2d");
    if (g) {
      const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      r.addColorStop(0, hsl(ART.white));
      r.addColorStop(0.2, hsl(color, 8, 0.9));
      r.addColorStop(1, hsl(color, 0, 0));
      g.fillStyle = r;
      g.fillRect(0, 0, 32, 32);
    }
    moteCache.set(key, m);
  }
  return m;
}

// The air of the glade, drawn over everything: shafts of light through the
// trees, fireflies and sparkles drifting up, and a soft dark edge. With
// reduced motion they hold still.
export function drawAmbient(ctx: Ctx, g: Ground, t: number, still: boolean) {
  const W = g.width;
  const H = g.height;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 4; i++) {
    const x0 = W * (0.04 + i * 0.2);
    const sway = still ? 0 : Math.sin(t * 0.25 + i * 1.7) * W * 0.015;
    const narrow = g.w * (0.3 + (i % 2) * 0.25);
    const shift = H * 0.6;
    ctx.beginPath();
    ctx.moveTo(x0 + sway, 0);
    ctx.lineTo(x0 + sway + narrow, 0);
    ctx.lineTo(x0 + shift + narrow * 2.6, H);
    ctx.lineTo(x0 + shift, H);
    ctx.closePath();
    const a = 0.09 + (still ? 0 : Math.sin(t * 0.6 + i * 2.3) * 0.03);
    const beam = ctx.createLinearGradient(0, 0, 0, H);
    beam.addColorStop(0, hsl(SUN, 0, a));
    beam.addColorStop(1, hsl(SUN, 0, 0));
    ctx.fillStyle = beam;
    ctx.fill();
  }
  ctx.restore();

  const random = seeded(77);
  const count = Math.round(Math.min(60, Math.max(18, (W * H) / 8000)));
  for (let i = 0; i < count; i++) {
    const bx = random() * W;
    const by = random() * H;
    const speed = g.w * (0.1 + random() * 0.2);
    const phase = random() * Math.PI * 2;
    const roll = random();
    const size = g.w * (0.1 + random() * 0.12);
    const color = roll < 0.55 ? FIREFLY : roll < 0.8 ? BLOSSOM : RUNE;
    const y = still ? by : (((by - t * speed) % H) + H) % H;
    const x = bx + (still ? 0 : Math.sin(t * 0.7 + phase) * g.w * 0.25);
    ctx.globalAlpha = still
      ? 0.6
      : 0.35 + 0.6 * Math.max(0, Math.sin(t * 1.8 + phase));
    ctx.drawImage(mote(color), x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;

  const edge = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.45,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.75,
  );
  edge.addColorStop(0, hsl(c(250, 50, 8), 0, 0));
  edge.addColorStop(1, hsl(c(250, 50, 8), 0, 0.45));
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
}

// One tile's diamond, for the cursor and the grid in build mode.
export function tileDiamond(
  ctx: Ctx,
  g: Ground,
  col: number,
  row: number,
  size = 1,
) {
  const p = [
    g.at(col, row),
    g.at(col + size, row),
    g.at(col + size, row + size),
    g.at(col, row + size),
  ];
  ctx.beginPath();
  p.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
}
