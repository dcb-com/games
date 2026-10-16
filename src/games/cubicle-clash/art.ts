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

// Cubicle Clash's art: a sunny fantasy meadow seen at an angle, the way the
// game it is modeled on looks, and an office fort on it. Every building is
// made of a few solid blocks, roofs and towers, and each one grows grander
// with its level: wood, then stone, then gold trim and banners.
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

// Walls and bases by level: wood, light stone, stone, stone with gold,
// white marble.
const MATERIAL: Hsl[] = [
  c(30, 45, 52),
  c(38, 16, 72),
  c(215, 10, 64),
  c(220, 12, 58),
  c(40, 25, 90),
];
const ROOF: Hsl[] = [
  c(6, 62, 52),
  c(174, 60, 42),
  c(210, 62, 52),
  c(268, 48, 54),
  c(45, 92, 55),
];
const GRASS = c(98, 52, 50);
const WINDOW = c(48, 100, 72);
const COPPER = c(24, 62, 48);
const STONE = c(210, 8, 62);
const LEAF = c(110, 50, 38);

function mat(level: number) {
  return (
    MATERIAL[Math.min(MATERIAL.length - 1, level - 1)] ?? MATERIAL[0] ?? STONE
  );
}
function roofOf(level: number) {
  return ROOF[Math.min(ROOF.length - 1, level - 1)] ?? ROOF[0] ?? STONE;
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

// Brick lines on the two front faces of a block.
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
  // Tile lines.
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

function cone(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  h: number,
  color: Hsl,
) {
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.15, cy);
  ctx.quadraticCurveTo(cx, cy + r * 0.7, cx + r * 1.15, cy);
  ctx.lineTo(cx, cy - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, hsl(color, 8));
  g.addColorStop(1, hsl(color, -16));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(0.8, r * 0.06), ART.ink, 0.5);
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
  ctx.strokeStyle = hsl(ART.ink, 10);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s);
  ctx.stroke();
  const wave = still ? 0 : Math.sin(t * 5 + x) * s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(
    x + s * 0.3,
    y - s * 0.95 + wave,
    x + s * 0.6,
    y - s * 0.85,
  );
  ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.75 - wave, x, y - s * 0.62);
  ctx.closePath();
  ctx.fillStyle = hsl(color, 6);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.5);
}

// Glowing windows on a block's left face.
function windows(
  ctx: Ctx,
  cx: number,
  cy: number,
  a: number,
  h: number,
  rows: number,
  cols: number,
  t: number,
) {
  const b = a / 2;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const fx = (k + 0.5) / cols;
      const fy = (r + 0.55) / rows;
      const x = cx - a + a * fx;
      const y = cy + b * fx - h * fy;
      const ww = (a / cols) * 0.45;
      const wh = (h / rows) * 0.45;
      poly(ctx, [
        x - ww / 2,
        y - wh / 2 - ww / 4,
        x + ww / 2,
        y - wh / 2 + ww / 4,
        x + ww / 2,
        y + wh / 2 + ww / 4,
        x - ww / 2,
        y + wh / 2 - ww / 4,
      ]);
      const lit = (r * 3 + k + Math.floor(t * 0.2)) % 4 !== 0;
      ctx.fillStyle = lit ? hsl(WINDOW) : hsl(c(220, 30, 30));
      ctx.fill();
    }
  }
}

function office(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const m = mat(lv);
  const trim = lv >= 4 ? ART.gold : undefined;
  const a = w * 0.92;
  const h1 = w * (0.42 + lv * 0.04);
  // Towers at the corners, more of them as it grows.
  const towers =
    lv >= 4
      ? [
          [-1, 0],
          [1, 0],
          [0, -1],
        ]
      : lv >= 3
        ? [
            [-1, 0],
            [1, 0],
          ]
        : lv >= 2
          ? [[1, 0]]
          : [];
  const back = towers.filter(([, y]) => (y ?? 0) < 0);
  const front = towers.filter(([, y]) => (y ?? 0) >= 0);
  const tower = (dx: number, dy: number) => {
    const tx = dx * a * 0.85;
    const ty = dy * a * 0.42;
    cylinder(ctx, tx, ty, w * 0.2, h1 + w * 0.35, m);
    cone(ctx, tx, ty - h1 - w * 0.35, w * 0.21, w * 0.42, roofOf(lv));
    if (lv >= 4)
      flag(
        ctx,
        tx,
        ty - h1 - w * 0.75,
        w * 0.32,
        look.t,
        look.still,
        ART.magenta,
      );
  };
  for (const [dx, dy] of back) tower(dx ?? 0, dy ?? 0);
  block(ctx, 0, 0, a, h1, m, trim);
  if (lv >= 2) bricks(ctx, 0, 0, a, h1, m);
  windows(ctx, 0, 0, a, h1, 2, 3, look.t);
  // The upper floor and the roof.
  const a2 = a * 0.62;
  const h2 = w * 0.32;
  block(ctx, 0, -h1, a2, h2, m, trim);
  windows(ctx, 0, -h1, a2, h2, 1, 2, look.t + 3);
  roof(ctx, 0, -h1 - h2, a2 * 1.08, w * (0.38 + lv * 0.03), roofOf(lv));
  flag(
    ctx,
    0,
    -h1 - h2 - w * (0.38 + lv * 0.03),
    w * 0.4,
    look.t,
    look.still,
    lv >= 5 ? ART.gold : ART.magenta,
  );
  // The door and its sign, on the front.
  poly(ctx, [
    w * 0.05,
    w * 0.42,
    w * 0.3,
    w * 0.3,
    w * 0.3,
    w * 0.06,
    w * 0.05,
    w * 0.18,
  ]);
  ctx.fillStyle = hsl(c(25, 40, 28));
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  rounded(ctx, -w * 0.22, -h1 * 0.95, w * 0.44, w * 0.16, w * 0.04);
  ctx.fillStyle = hsl(ART.stapler, 0);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  ctx.fillStyle = hsl(ART.white);
  ctx.font = `800 ${Math.round(w * 0.12)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("HQ", 0, -h1 * 0.95 + w * 0.125);
  for (const [dx, dy] of front) tower(dx ?? 0, dy ?? 0);
}

function press(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const a = w * 0.42;
  const h = w * (0.34 + lv * 0.03);
  block(
    ctx,
    0,
    0,
    a,
    h,
    lv >= 3 ? STONE : mat(1),
    lv >= 4 ? ART.gold : undefined,
  );
  // The press itself on top: a stamp that bangs up and down.
  const bang = look.still ? 0 : Math.max(0, Math.sin(look.t * 3.5)) * w * 0.08;
  block(ctx, 0, -h, a * 0.42, w * 0.06, ART.metal);
  rounded(ctx, -w * 0.05, -h - w * 0.32 + bang, w * 0.1, w * 0.22, w * 0.03);
  ctx.fillStyle = hsl(ART.slate, 10);
  ctx.fill();
  block(ctx, 0, -h - w * 0.32 + bang + w * 0.04, a * 0.3, w * 0.06, ART.metal);
  // A wheel on the side, turning.
  const wx = a * 0.55;
  const wy = -h * 0.45;
  ellipse(ctx, wx, wy, w * 0.12, w * 0.14, -0.4);
  ctx.fillStyle = hsl(COPPER, 6);
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  const turn = look.still ? 0 : look.t * 2;
  ctx.strokeStyle = hsl(ART.ink, 0, 0.6);
  for (let i = 0; i < 3; i++) {
    const ang = turn + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(wx - Math.cos(ang) * w * 0.1, wy - Math.sin(ang) * w * 0.12);
    ctx.lineTo(wx + Math.cos(ang) * w * 0.1, wy + Math.sin(ang) * w * 0.12);
    ctx.stroke();
  }
  // A heap of coins in front that grows as it fills.
  const coins = Math.round(look.full * 7);
  for (let i = 0; i < coins; i++) {
    const x = -a * 0.6 + (i % 4) * w * 0.1;
    const y = a * 0.28 - Math.floor(i / 4) * w * 0.06;
    ellipse(ctx, x, y, w * 0.07, w * 0.035);
    shade(ctx, ART.gold, x, y, w * 0.07, 18, -16);
    outline(ctx, 0.8, ART.ink, 0.6);
  }
}

function brewery(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const tanks = lv >= 3 ? 2 : 1;
  const tank = (x: number, y: number, r: number, h: number) => {
    cylinder(ctx, x, y, r, h, COPPER);
    // Bands, gold from level 4.
    ctx.strokeStyle = lv >= 4 ? hsl(ART.gold, 5) : hsl(COPPER, -20);
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    for (const k of [0.3, 0.7]) {
      ctx.beginPath();
      ctx.ellipse(x, y - h * k, r, r / 2, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Coffee at the top, bubbling.
    ellipse(ctx, x, y - h, r * 0.78, r * 0.36);
    ctx.fillStyle = hsl(ART.brew, 4);
    ctx.fill();
    if (!look.still) {
      for (let i = 0; i < 3; i++) {
        const rise = (look.t * 0.8 + i / 3 + x) % 1;
        ellipse(
          ctx,
          x + Math.sin(i * 2.1 + look.t) * r * 0.4,
          y - h - rise * w * 0.4,
          w * (0.03 + rise * 0.04),
          w * (0.03 + rise * 0.04),
        );
        ctx.fillStyle = hsl(ART.white, 0, 0.6 * (1 - rise));
        ctx.fill();
      }
    }
  };
  if (tanks === 2) tank(w * 0.18, -w * 0.08, w * 0.15, w * 0.4);
  tank(-w * 0.06, w * 0.04, w * 0.22, w * (0.42 + lv * 0.03));
  // A tap and a cup.
  rounded(ctx, -w * 0.32, -w * 0.12, w * 0.1, w * 0.05, w * 0.02);
  ctx.fillStyle = hsl(ART.metal, -10);
  ctx.fill();
  dotEyes(ctx, -w * 0.06, -w * 0.22, w * 0.12, w * 0.025, {
    happy: look.full > 0.9,
  });
}

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
    lv >= 2 ? STONE : mat(1),
    lv >= 3 ? ART.gold : undefined,
  );
  bricks(ctx, 0, 0, a, h, STONE);
  // The round door on the right face.
  const dx = a * 0.5;
  const dy = a * 0.25 - h * 0.5;
  ellipse(ctx, dx, dy, w * 0.14, w * 0.16, -0.45);
  shade(ctx, ART.metal, dx, dy, w * 0.16, 22, -14);
  outline(ctx, 1.2, ART.ink, 0.7);
  const turn = look.still ? 0.4 : look.t * 0.8;
  ctx.strokeStyle = hsl(ART.ink, 0, 0.7);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const ang = turn + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + Math.cos(ang) * w * 0.1, dy + Math.sin(ang) * w * 0.11);
    ctx.stroke();
  }
  // Gold bars on top, more with each level.
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
}

function breakroom(ctx: Ctx, w: number, look: BuildingLook) {
  const lv = look.level;
  const a = w * 0.44;
  const h = w * 0.34;
  block(ctx, 0, 0, a, h, mat(lv), lv >= 4 ? ART.gold : undefined);
  // A striped awning roof.
  const peak = w * 0.34;
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const k0 = i / stripes;
    const k1 = (i + 1) / stripes;
    poly(ctx, [
      -a + a * k0,
      -h + (a / 2) * k0,
      -a + a * k1,
      -h + (a / 2) * k1,
      0,
      -h - peak,
    ]);
    ctx.fillStyle = i % 2 === 0 ? hsl(roofOf(lv), 4) : hsl(ART.white, -4);
    ctx.fill();
    poly(ctx, [
      a * k0,
      -h + a / 2 - (a / 2) * k0,
      a * k1,
      -h + a / 2 - (a / 2) * k1,
      0,
      -h - peak,
    ]);
    ctx.fillStyle = i % 2 === 0 ? hsl(roofOf(lv), -12) : hsl(ART.white, -18);
    ctx.fill();
  }
  poly(ctx, [-a, -h, 0, -h + a / 2, a, -h, 0, -h - peak]);
  outline(ctx, 1, ART.ink, 0.5);
  // A vending machine by the door, with a blinking light.
  rounded(ctx, -a * 0.75, -h * 0.95, w * 0.16, h * 0.9, w * 0.02);
  ctx.fillStyle = hsl(c(352, 70, 54));
  ctx.fill();
  outline(ctx, 1, ART.ink, 0.6);
  rounded(ctx, -a * 0.71, -h * 0.85, w * 0.1, h * 0.4, w * 0.012);
  ctx.fillStyle = hsl(ART.ice, 12);
  ctx.fill();
  const on = look.still || Math.floor(look.t * 2) % 2 === 0;
  ellipse(ctx, -a * 0.6, -h * 0.3, w * 0.02, w * 0.02);
  ctx.fillStyle = on ? hsl(ART.spark, 10) : hsl(ART.ink, 20);
  ctx.fill();
  if (lv >= 3) flag(ctx, a * 0.6, -h, w * 0.4, look.t, look.still, ART.cyan);
}

// A defense: a tower whose height grows with its level, with the desk
// helper on top.
function turret(ctx: Ctx, kind: BuildingKind, w: number, look: BuildingLook) {
  const lv = look.level;
  const tall = kind === "lamp";
  const h = w * (tall ? 0.6 + lv * 0.06 : 0.22 + lv * 0.05);
  const m = lv >= 3 ? STONE : mat(lv);
  if (tall) {
    cylinder(ctx, 0, 0, w * 0.26, h, m);
    ctx.strokeStyle = hsl(m, -20, 0.4);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -h * (i / 4), w * 0.26, w * 0.13, 0, 0, Math.PI);
      ctx.stroke();
    }
  } else {
    block(ctx, 0, 0, w * 0.4, h, m, lv >= 4 ? ART.gold : undefined);
    bricks(ctx, 0, 0, w * 0.4, h, m);
    // Little battlements on top.
    for (const [dx, dy] of [
      [-0.28, 0],
      [0.28, 0],
      [0, -0.14],
      [0, 0.14],
    ]) {
      block(ctx, (dx ?? 0) * w, -h + (dy ?? 0) * w, w * 0.07, w * 0.08, m);
    }
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

// A cubicle wall post, with panels running to its neighbors.
export interface Links {
  right: boolean;
  down: boolean;
}

function wall(ctx: Ctx, w: number, look: BuildingLook, links: Links) {
  const lv = look.level;
  const m = lv === 1 ? c(214, 26, 66) : mat(lv);
  const h = w * (0.26 + lv * 0.025);
  // Panels toward the next wall along each grid direction. They are drawn
  // from this post, so each joint is drawn once.
  const panel = (dx: number, dy: number) => {
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const k = i / (steps + 1);
      block(ctx, dx * k, dy * k, w * 0.12, h * 0.85, m);
    }
  };
  if (links.right) panel(w / 2, w / 4);
  if (links.down) panel(-w / 2, w / 4);
  block(ctx, 0, 0, w * 0.15, h, m, lv >= 4 ? ART.gold : undefined);
  // A cap on the post.
  block(
    ctx,
    0,
    -h,
    w * 0.17,
    w * 0.04,
    lv >= 5 ? ART.gold : c(m.h, m.s, m.l - 14),
  );
}

function decor(ctx: Ctx, kind: BuildingKind, w: number, look: BuildingLook) {
  switch (kind) {
    case "plant": {
      cylinder(ctx, 0, 0, w * 0.13, w * 0.14, c(14, 55, 48));
      const leaves = 7;
      for (let i = 0; i < leaves; i++) {
        const ang = -Math.PI / 2 + ((i - (leaves - 1) / 2) / leaves) * 2.4;
        const sway = look.still ? 0 : Math.sin(look.t * 2 + i) * 0.06;
        ctx.save();
        ctx.translate(0, -w * 0.16);
        ctx.rotate(ang + Math.PI / 2 + sway);
        ellipse(ctx, 0, -w * 0.13, w * 0.05, w * 0.14);
        ctx.fillStyle = hsl(LEAF, (i % 3) * 6);
        ctx.fill();
        ctx.restore();
      }
      return;
    }
    case "cooler": {
      block(ctx, 0, 0, w * 0.13, w * 0.26, ART.white);
      cylinder(ctx, 0, -w * 0.26, w * 0.1, w * 0.2, c(200, 80, 72));
      if (!look.still) {
        const rise = (look.t * 0.6) % 1;
        ellipse(
          ctx,
          Math.sin(look.t * 3) * w * 0.03,
          -w * 0.3 - rise * w * 0.16,
          w * 0.02,
          w * 0.02,
        );
        ctx.fillStyle = hsl(ART.white, 0, 0.8);
        ctx.fill();
      }
      return;
    }
    case "banner": {
      cylinder(ctx, 0, 0, w * 0.06, w * 0.04, STONE);
      flag(
        ctx,
        0,
        -w * 0.04,
        w * 0.7,
        look.t,
        look.still,
        [ART.magenta, ART.cyan, ART.gold][look.level % 3] ?? ART.magenta,
      );
      return;
    }
    case "lamppost": {
      ctx.strokeStyle = hsl(ART.ink, 6);
      ctx.lineWidth = Math.max(2, w * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -w * 0.62);
      ctx.stroke();
      const g = ctx.createRadialGradient(
        0,
        -w * 0.66,
        0,
        0,
        -w * 0.66,
        w * 0.3,
      );
      g.addColorStop(0, hsl(ART.bulb, 0, 0.8));
      g.addColorStop(1, hsl(ART.bulb, 0, 0));
      ctx.fillStyle = g;
      ellipse(ctx, 0, -w * 0.66, w * 0.3, w * 0.3);
      ctx.fill();
      rounded(ctx, -w * 0.06, -w * 0.74, w * 0.12, w * 0.14, w * 0.03);
      ctx.fillStyle = hsl(ART.bulb, 5);
      ctx.fill();
      outline(ctx, 1, ART.ink, 0.7);
      return;
    }
    case "fountain": {
      cylinder(ctx, 0, 0, w * 0.4, w * 0.1, STONE);
      ellipse(ctx, 0, -w * 0.1, w * 0.33, w * 0.15);
      ctx.fillStyle = hsl(c(196, 80, 62));
      ctx.fill();
      cylinder(ctx, 0, -w * 0.1, w * 0.07, w * 0.22, STONE);
      // Jets of water, rising and falling.
      ctx.strokeStyle = hsl(c(196, 90, 80), 0, 0.85);
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
      block(ctx, 0, 0, w * 0.24, w * 0.2, mat(5), ART.gold);
      drawDot(ctx, 0, -w * 0.18, w * 0.5, 0, true);
      // A golden sheen over Dot, so it reads as a statue.
      ellipse(ctx, 0, -w * 0.45, w * 0.24, w * 0.3);
      ctx.fillStyle = hsl(ART.gold, 10, 0.45);
      ctx.fill();
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
      const cardboard = c(32, 50, 58);
      block(ctx, cx - w * 0.08, cy + w * 0.02, w * 0.2, w * 0.2, cardboard);
      block(ctx, cx + w * 0.14, cy - w * 0.02, w * 0.16, w * 0.16, cardboard);
      block(ctx, cx, cy - w * 0.18, w * 0.15, w * 0.14, cardboard);
      return;
    }
    case "papers": {
      for (let i = 0; i < 6; i++) {
        block(
          ctx,
          cx + (random() - 0.5) * w * 0.12,
          cy - i * w * 0.035,
          w * 0.24,
          w * 0.02,
          ART.white,
        );
      }
      return;
    }
    case "bush": {
      for (let i = 0; i < 5; i++) {
        const x = cx + (random() - 0.5) * w * 0.4;
        const y = cy - w * 0.08 - random() * w * 0.16;
        ellipse(ctx, x, y, w * 0.16, w * 0.13);
        shade(ctx, LEAF, x, y, w * 0.16, 14, -12);
      }
      for (let i = 0; i < 3; i++) {
        ellipse(
          ctx,
          cx + (random() - 0.5) * w * 0.3,
          cy - w * 0.12 - random() * w * 0.1,
          w * 0.025,
          w * 0.025,
        );
        ctx.fillStyle = hsl(ART.magenta, 10);
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
      c(210, 6, 40 + random() * 25),
    );
  }
}

// The meadow the fort stands on, with forest around the edge. Drawn once
// for each size and kept.
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

function paintGround(ctx: Ctx, g: Ground) {
  const random = seeded(5);
  // Forest floor everywhere first.
  const bg = ctx.createLinearGradient(0, 0, 0, g.height);
  bg.addColorStop(0, hsl(c(120, 36, 30)));
  bg.addColorStop(1, hsl(c(110, 40, 24)));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, g.width, g.height);

  const corner = (gx: number, gy: number) => g.at(gx, gy);
  const diamond = (x0: number, y0: number, x1: number, y1: number) => {
    const p = [corner(x0, y0), corner(x1, y0), corner(x1, y1), corner(x0, y1)];
    ctx.beginPath();
    p.forEach((q, i) =>
      i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y),
    );
    ctx.closePath();
  };
  // A raised edge of earth under the meadow, for depth.
  ctx.save();
  ctx.translate(0, g.w * 0.18);
  diamond(0, 0, g.cols, g.rows);
  ctx.fillStyle = hsl(c(30, 35, 30));
  ctx.fill();
  ctx.restore();
  // The meadow.
  diamond(0, 0, g.cols, g.rows);
  ctx.fillStyle = hsl(GRASS);
  ctx.fill();
  // Tiles in two greens, like mown stripes.
  for (let gx = 0; gx < g.cols; gx++) {
    for (let gy = 0; gy < g.rows; gy++) {
      const edge =
        gx === 0 || gy === 0 || gx === g.cols - 1 || gy === g.rows - 1;
      diamond(gx, gy, gx + 1, gy + 1);
      ctx.fillStyle = edge
        ? hsl(GRASS, -8)
        : hsl(GRASS, (gx + gy) % 2 === 0 ? 4 : 0);
      ctx.fill();
    }
  }
  // Blades of grass and small flowers.
  const top = corner(0, 0);
  for (let i = 0; i < g.cols * g.rows * 4; i++) {
    const gx = random() * g.cols;
    const gy = random() * g.rows;
    const p = g.at(gx, gy);
    if (random() < 0.08) {
      const colors = [ART.white, ART.gold, ART.magenta, ART.cyan];
      ctx.fillStyle = hsl(
        colors[Math.floor(random() * colors.length)] ?? ART.white,
      );
      ellipse(ctx, p.x, p.y, 1.6, 1.6);
      ctx.fill();
    } else {
      ctx.strokeStyle = hsl(GRASS, -16, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 1, p.y - 3);
      ctx.stroke();
    }
  }
  // A dashed line where the fort's land begins.
  diamond(1, 1, g.cols - 1, g.rows - 1);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = hsl(ART.white, 0, 0.35);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
  // Trees around the outside, back ones first.
  const trees: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < 70; i++) {
    const x = random() * g.width;
    const y = random() * g.height;
    // Keep them off the meadow: test the point against the diamond.
    const u = (x - top.x) / (g.w / 2);
    const v = (y - top.y) / (g.w / 4);
    const gx = (u + v) / 2;
    const gy = (v - u) / 2;
    if (gx > -0.6 && gy > -0.6 && gx < g.cols + 0.6 && gy < g.rows + 0.6)
      continue;
    trees.push({ x, y, s: g.w * (0.5 + random() * 0.4) });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) {
    groundShadow(ctx, t.x, t.y, t.s * 0.5, t.s * 0.18);
    ctx.fillStyle = hsl(c(28, 40, 30));
    ctx.fillRect(t.x - t.s * 0.06, t.y - t.s * 0.4, t.s * 0.12, t.s * 0.4);
    for (let k = 0; k < 3; k++) {
      const ty = t.y - t.s * (0.55 + k * 0.28);
      const tr = t.s * (0.5 - k * 0.12);
      ellipse(ctx, t.x, ty, tr, tr * 0.8);
      shade(ctx, c(120, 45, 34 + k * 4), t.x, ty, tr, 14, -14);
    }
  }
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
