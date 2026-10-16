import type { Ctx } from "~/games/art/color";
import {
  ART,
  blush,
  dotEyes,
  ellipse,
  groundShadow,
  hsl,
  outline,
  rounded,
  seeded,
  shade,
  shadeDown,
} from "~/games/art/color";
import type { HelperLook } from "~/games/art/helpers";
import { RESTING, drawHelper } from "~/games/art/helpers";
import type { BuildingKind } from "~/games/cubicle-clash/units";

// Cubicle Clash's buildings. Turrets are the same desk helpers as in Desk
// Defense; the rest are drawn here: the head office, coin press, vault,
// break room, cubicle walls and the rubble a raid leaves behind.

export interface BuildingLook {
  t: number;
  still: boolean;
  level: number;
  // Seconds since it last fired, and since it was last hit.
  acted: number;
  bitten: number;
  // How full a press or coffee maker is, from 0 to 1.
  full: number;
  // Which way a turret faces: 1 is right.
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

const OFFICE = { h: 205, s: 45, l: 62 };
const ROOF = { h: 214, s: 30, l: 34 };
const WINDOW = { h: 48, s: 100, l: 72 };
const CARPET = { h: 222, s: 22, l: 46 };
const PANEL = { h: 214, s: 28, l: 66 };
const VENDING = { h: 352, s: 72, l: 56 };

function badge(ctx: Ctx, x: number, y: number, r: number, level: number) {
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

function office(ctx: Ctx, u: number, look: BuildingLook) {
  // u is a tenth of one tile; the head office stands on two by two.
  const floors = 2 + Math.ceil(look.level / 2);
  const w = u * 15;
  const fh = u * 3.6;
  const h = floors * fh + u * 2;
  rounded(ctx, -w / 2, -h, w, h, u * 0.8);
  shadeDown(ctx, OFFICE, -h, 0, 14, -16);
  outline(ctx, u * 0.4);
  // Windows, a few of them lit.
  const random = seeded(look.level * 31);
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 4; i++) {
      const wx = -w / 2 + u * 1.2 + i * u * 3.4;
      const wy = -h + u * 1.4 + f * fh;
      rounded(ctx, wx, wy, u * 2.4, u * 2.2, u * 0.3);
      const lit = random() < 0.55;
      ctx.fillStyle = lit ? hsl(WINDOW) : hsl(ROOF, 18);
      ctx.fill();
      if (lit) {
        ctx.fillStyle = hsl(ART.white, 0, 0.5);
        ctx.fillRect(wx + u * 0.3, wy + u * 0.3, u * 0.5, u * 1.2);
      }
    }
  }
  // The door, with a little face over it.
  rounded(ctx, -u * 1.6, -u * 3.2, u * 3.2, u * 3.2, u * 0.5);
  shadeDown(ctx, ROOF, -u * 3.2, 0, 10, -6);
  outline(ctx, u * 0.3);
  // The roof and its sign.
  rounded(ctx, -w / 2 - u * 0.6, -h - u * 1.4, w + u * 1.2, u * 1.8, u * 0.6);
  shadeDown(ctx, ROOF, -h - u * 1.4, -h + u * 0.4, 12, -6);
  outline(ctx, u * 0.35);
  rounded(ctx, -u * 3, -h - u * 3.8, u * 6, u * 2.2, u * 0.5);
  shadeDown(ctx, ART.stapler, -h - u * 3.8, -h - u * 1.6, 14, -10);
  outline(ctx, u * 0.3);
  ctx.fillStyle = hsl(ART.white);
  ctx.font = `800 ${Math.round(u * 1.6)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("HQ", 0, -h - u * 2.15);
  // A flag on top that waves.
  const wave = look.still ? 0 : Math.sin(look.t * 4) * u * 0.5;
  ctx.strokeStyle = hsl(ART.ink);
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - u * 1.2, -h - u * 1.4);
  ctx.lineTo(w / 2 - u * 1.2, -h - u * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 - u * 1.2, -h - u * 6);
  ctx.quadraticCurveTo(
    w / 2 + u * 0.4,
    -h - u * 5.6 + wave,
    w / 2 + u * 1.6,
    -h - u * 5.2,
  );
  ctx.lineTo(w / 2 - u * 1.2, -h - u * 4.2);
  ctx.closePath();
  ctx.fillStyle = hsl(ART.magenta, 5);
  ctx.fill();
}

function press(ctx: Ctx, u: number, look: BuildingLook) {
  rounded(ctx, -u * 3.6, -u * 6.8, u * 7.2, u * 6.6, u * 1.2);
  shadeDown(ctx, ART.metal, -u * 6.8, 0, 16, -22);
  outline(ctx, u * 0.35);
  // The stamp on top, pressing now and then.
  const press = look.still ? 0 : Math.max(0, Math.sin(look.t * 3)) * u * 0.8;
  rounded(ctx, -u * 1.4, -u * 8.6 + press, u * 2.8, u * 2, u * 0.4);
  shadeDown(ctx, ART.slate, -u * 8.6, -u * 6.6, 16, -6);
  outline(ctx, u * 0.3);
  // The coin slot and a gold light.
  rounded(ctx, -u * 2.4, -u * 4.8, u * 4.8, u * 0.8, u * 0.4);
  ctx.fillStyle = hsl(ART.ink);
  ctx.fill();
  dotEyes(ctx, 0, -u * 2.8, u * 2, u * 0.45, { happy: look.full > 0.9 });
  // A pile of coins in front, growing as it fills.
  const coins = Math.round(look.full * 6);
  for (let i = 0; i < coins; i++) {
    const cx = -u * 2.2 + (i % 3) * u * 2.2;
    const cy = -u * 0.2 - Math.floor(i / 3) * u * 0.8;
    ellipse(ctx, cx, cy, u * 1.1, u * 0.55);
    shade(ctx, ART.gold, cx, cy, u * 1.1, 18, -16);
    outline(ctx, u * 0.2, ART.ink, 0.6);
  }
}

function vault(ctx: Ctx, u: number, look: BuildingLook) {
  rounded(ctx, -u * 3.8, -u * 7.4, u * 7.6, u * 7.4, u * 0.9);
  shadeDown(
    ctx,
    { h: 215, s: 14, l: 52 + look.level * 2 },
    -u * 7.4,
    0,
    16,
    -18,
  );
  outline(ctx, u * 0.4);
  rounded(ctx, -u * 3, -u * 6.6, u * 6, u * 5.8, u * 0.5);
  outline(ctx, u * 0.25, ART.ink, 0.5);
  // The dial.
  ellipse(ctx, 0, -u * 3.8, u * 1.7, u * 1.7);
  shade(ctx, ART.metal, 0, -u * 3.8, u * 1.7, 22, -16);
  outline(ctx, u * 0.3);
  const turn = look.still ? 0.5 : look.t;
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * u * 0.4, -u * 3.8 + Math.sin(a) * u * 0.4);
    ctx.lineTo(Math.cos(a) * u * 1.4, -u * 3.8 + Math.sin(a) * u * 1.4);
    outline(ctx, u * 0.25);
  }
  // Gold bars peeking out at the bottom.
  for (let i = 0; i < 3; i++) {
    rounded(ctx, -u * 2.6 + i * u * 1.8, -u * 1.6, u * 1.6, u * 0.9, u * 0.2);
    shade(ctx, ART.gold, -u * 1.8 + i * u * 1.8, -u * 1.2, u, 20, -10);
  }
}

function breakroom(ctx: Ctx, u: number, look: BuildingLook) {
  // A vending machine with a sofa cushion for a roof.
  rounded(ctx, -u * 3.2, -u * 8.2, u * 6.4, u * 8, u * 1);
  shadeDown(ctx, VENDING, -u * 8.2, 0, 14, -18);
  outline(ctx, u * 0.35);
  rounded(ctx, -u * 2.5, -u * 7.4, u * 3.6, u * 5, u * 0.4);
  ctx.fillStyle = hsl(ART.ice, 14, 0.9);
  ctx.fill();
  outline(ctx, u * 0.25, ART.ink, 0.5);
  const snacks = [ART.gold, ART.hopper, ART.magenta, ART.cyan];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 2; i++) {
      rounded(
        ctx,
        -u * 2.1 + i * u * 1.6,
        -u * 6.9 + r * u * 1.5,
        u * 1.2,
        u * 1,
        u * 0.3,
      );
      ctx.fillStyle = hsl(snacks[(r + i) % snacks.length] ?? ART.gold);
      ctx.fill();
    }
  }
  // Buttons, blinking.
  for (let i = 0; i < 3; i++) {
    const on = look.still ? i === 0 : Math.floor(look.t * 3 + i) % 3 === 0;
    ellipse(ctx, u * 2, -u * 6.6 + i * u * 1.2, u * 0.4, u * 0.4);
    ctx.fillStyle = on ? hsl(ART.spark, 10) : hsl(ART.ink, 20);
    ctx.fill();
  }
  rounded(ctx, -u * 2.2, -u * 1.8, u * 4.4, u * 1, u * 0.4);
  ctx.fillStyle = hsl(ART.ink, 6);
  ctx.fill();
  dotEyes(ctx, u * 0, -u * 2.8, u * 2.6, u * 0.4);
  blush(ctx, 0, -u * 2.2, u * 4, u * 0.4);
}

function wallPanel(
  ctx: Ctx,
  u: number,
  look: BuildingLook,
  links: { left: boolean; right: boolean },
) {
  const top = -u * 6.4;
  const tone = { ...PANEL, l: PANEL.l - look.level * 3 };
  const x0 = links.left ? -u * 5 : -u * 2.2;
  const x1 = links.right ? u * 5 : u * 2.2;
  rounded(ctx, x0, top, x1 - x0, u * 6.2, u * 0.6);
  shadeDown(ctx, tone, top, 0, 12, -14);
  outline(ctx, u * 0.3);
  // Fabric dots, and a metal rail on top.
  ctx.fillStyle = hsl(tone, -10, 0.35);
  for (let x = x0 + u * 0.8; x < x1 - u * 0.4; x += u * 1.2) {
    for (let y = top + u * 1.8; y < -u * 0.6; y += u * 1.2)
      ctx.fillRect(x, y, u * 0.2, u * 0.2);
  }
  rounded(ctx, x0 - u * 0.2, top - u * 0.4, x1 - x0 + u * 0.4, u * 1, u * 0.4);
  shadeDown(ctx, ART.metal, top - u * 0.4, top + u * 0.6, 20, -10);
  outline(ctx, u * 0.25);
}

export function drawRubble(
  ctx: Ctx,
  x: number,
  floor: number,
  s: number,
  seed: number,
) {
  const random = seeded(seed);
  groundShadow(ctx, x, floor, s * 0.42, s * 0.1);
  for (let i = 0; i < 9; i++) {
    const rx = x + (random() - 0.5) * s * 0.7;
    const ry = floor - random() * s * 0.22;
    const r = s * (0.06 + random() * 0.08);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(random() * 3);
    rounded(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.3);
    ctx.fillStyle = hsl(ART.metal, -10 - random() * 25);
    ctx.fill();
    ctx.restore();
  }
}

// Draw a building standing on a tile (or two by two) whose bottom middle is
// (x, floor). `tile` is the size of one tile.
export function drawBuilding(
  ctx: Ctx,
  kind: BuildingKind,
  x: number,
  floor: number,
  tile: number,
  look: BuildingLook,
  links: { left: boolean; right: boolean } = { left: false, right: false },
) {
  const u = tile / 10;
  const shake =
    !look.still && look.bitten < 0.12 ? Math.sin(look.t * 70) * u * 0.4 : 0;
  const helper: HelperLook = {
    ...RESTING,
    t: look.t,
    still: look.still,
    acted: look.acted,
    bitten: look.bitten,
    charge: look.full,
  };
  switch (kind) {
    case "coffee":
    case "stapler":
    case "fan":
    case "printer":
    case "lamp": {
      // The desk helpers stand a little above their floor line.
      const s = tile * 1.05;
      ctx.save();
      ctx.translate(x + shake, 0);
      ctx.scale(look.facing, 1);
      drawHelper(ctx, kind, 0, floor - s * 0.36, s, helper);
      ctx.restore();
      break;
    }
    case "wall": {
      groundShadow(ctx, x, floor, tile * 0.5, tile * 0.08);
      ctx.save();
      ctx.translate(x + shake, floor);
      wallPanel(ctx, u, look, links);
      ctx.restore();
      return;
    }
    default: {
      const big = kind === "office";
      groundShadow(
        ctx,
        x,
        floor,
        tile * (big ? 0.9 : 0.42),
        tile * (big ? 0.16 : 0.1),
      );
      ctx.save();
      ctx.translate(x + shake, floor);
      if (kind === "office") office(ctx, u, look);
      if (kind === "press") press(ctx, u, look);
      if (kind === "vault") vault(ctx, u, look);
      if (kind === "breakroom") breakroom(ctx, u, look);
      ctx.restore();
    }
  }
  if (look.level > 1) {
    const big = kind === "office";
    badge(
      ctx,
      x + tile * (big ? 0.75 : 0.36),
      floor - tile * 0.12,
      tile * 0.13,
      look.level,
    );
  }
}

// The floor of an office: carpet tiles, a darker edge where troops land.
export function drawFloor(
  ctx: Ctx,
  ox: number,
  oy: number,
  tile: number,
  cols: number,
  rows: number,
) {
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const edge =
        col === 0 || row === 0 || col === cols - 1 || row === rows - 1;
      const check = (col + row) % 2 === 0 ? 3 : -1;
      ctx.fillStyle = hsl(CARPET, edge ? -8 + check : 12 + check);
      ctx.fillRect(ox + col * tile, oy + row * tile, tile + 0.5, tile + 0.5);
    }
  }
  // Carpet speckle.
  const random = seeded(3);
  ctx.fillStyle = hsl(CARPET, 26, 0.18);
  for (let i = 0; i < cols * rows * 3; i++) {
    ctx.fillRect(
      ox + random() * cols * tile,
      oy + random() * rows * tile,
      1.5,
      1.5,
    );
  }
  // A light line where the base area starts.
  ctx.strokeStyle = hsl(CARPET, 30, 0.35);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(ox + tile, oy + tile, (cols - 2) * tile, (rows - 2) * tile);
  ctx.setLineDash([]);
}
