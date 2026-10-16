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
  shade,
  shadeDown,
  smile,
} from "~/games/art/color";
import type { HelperKind } from "~/games/desk-defense/units";
import { STICKY_USES } from "~/games/desk-defense/units";

// Draws the office helpers. Each one is a cute desk object with a face, and
// each shows its special move: the stapler's arm snaps down, the coffee pot
// fills, the lamp glows brighter as it charges.

export interface HelperLook {
  t: number;
  still: boolean;
  // Seconds since it last fired, brewed or zapped.
  acted: number;
  // Seconds since a critter last bit it.
  bitten: number;
  // How full its next brew, zap or wipe is, from 0 to 1.
  charge: number;
  uses: number;
  // The next staple is a gold one.
  power: boolean;
  hpShare: number;
}

export const RESTING: HelperLook = {
  t: 0,
  still: true,
  acted: 99,
  bitten: 99,
  charge: 0.6,
  uses: STICKY_USES,
  power: false,
  hpShare: 1,
};

// A quick squash after acting, then back to normal.
function kick(acted: number, still: boolean) {
  if (still || acted > 0.25) return 0;
  return Math.sin((acted / 0.25) * Math.PI);
}

function coffee(ctx: Ctx, u: number, look: HelperLook) {
  const k = kick(look.acted, look.still);
  ctx.save();
  ctx.scale(1 + k * 0.06, 1 - k * 0.08);
  // The machine's body.
  rounded(ctx, -u * 3.4, -u * 7.6, u * 6.4, u * 7.4, u * 1.4);
  shade(ctx, ART.coffee, -u * 0.2, -u * 4, u * 4.5, 14, -18);
  outline(ctx, u * 0.35);
  // The top.
  rounded(ctx, -u * 3.8, -u * 8.4, u * 7.2, u * 1.6, u * 0.8);
  shadeDown(ctx, ART.slate, -u * 8.4, -u * 6.8, 18, -6);
  outline(ctx, u * 0.3);
  // The spout.
  rounded(ctx, -u * 0.9, -u * 3.4, u * 1.4, u * 0.9, u * 0.3);
  ctx.fillStyle = hsl(ART.slate, 8);
  ctx.fill();
  // The glass pot, filling as the next cup gets ready.
  ctx.save();
  rounded(ctx, -u * 2.2, -u * 2.4, u * 3.8, u * 2.6, u * 0.9);
  ctx.fillStyle = hsl(ART.ice, 10, 0.55);
  ctx.fill();
  ctx.clip();
  const level = look.charge * u * 2.4;
  ctx.fillStyle = hsl(ART.brew);
  ctx.fillRect(-u * 2.3, u * 0.2 - level, u * 4, level);
  ctx.restore();
  rounded(ctx, -u * 2.2, -u * 2.4, u * 3.8, u * 2.6, u * 0.9);
  outline(ctx, u * 0.3);
  ellipse(ctx, -u * 1.4, -u * 1.7, u * 0.25, u * 0.6, 0.2);
  ctx.fillStyle = hsl(ART.white, 0, 0.7);
  ctx.fill();
  // The ready light.
  const glow = look.acted < 0.6 ? 1 : 0.35 + look.charge * 0.4;
  ellipse(ctx, u * 2, -u * 5.6, u * 0.5, u * 0.5);
  ctx.fillStyle = hsl(ART.hopper, 15, glow);
  ctx.fill();
  // Face.
  dotEyes(ctx, -u * 0.6, -u * 5.4, u * 2, u * 0.5, { happy: look.acted < 0.6 });
  blush(ctx, -u * 0.6, -u * 4.4, u * 3.4, u * 0.45);
  ctx.restore();
  // Steam.
  if (!look.still) {
    for (let i = 0; i < 2; i++) {
      const rise = (look.t * 0.7 + i * 0.5) % 1;
      ellipse(
        ctx,
        -u * 0.8 + i * u * 1.6 + Math.sin(look.t * 3 + i) * u * 0.4,
        -u * 9 - rise * u * 2.4,
        u * (0.4 + rise * 0.5),
        u * (0.4 + rise * 0.5),
      );
      ctx.fillStyle = hsl(ART.white, 0, 0.6 * (1 - rise));
      ctx.fill();
    }
  }
}

function stapler(ctx: Ctx, u: number, look: HelperLook) {
  const k = kick(look.acted, look.still);
  // The base.
  rounded(ctx, -u * 4.4, -u * 1.6, u * 8.6, u * 1.6, u * 0.7);
  shadeDown(ctx, ART.slate, -u * 1.6, 0, 16, -6);
  outline(ctx, u * 0.3);
  // The arm, hinged at the back, snapping down when it fires.
  ctx.save();
  ctx.translate(-u * 3.6, -u * 2);
  ctx.rotate(-0.12 + k * 0.12);
  rounded(ctx, -u * 0.6, -u * 2.8, u * 8.8, u * 2.9, u * 1.3);
  shade(ctx, ART.stapler, u * 3.5, -u * 1.6, u * 5, 16, -16);
  outline(ctx, u * 0.35);
  // A gold band when the next staple is a gold one.
  if (look.power) {
    rounded(ctx, u * 0.6, -u * 2.75, u * 1.2, u * 2.8, u * 0.3);
    shade(ctx, ART.gold, u * 1.2, -u * 1.4, u * 1.5, 20, -10);
  }
  ellipse(ctx, u * 2.6, -u * 2.2, u * 2.4, u * 0.35);
  ctx.fillStyle = hsl(ART.white, 0, 0.45);
  ctx.fill();
  dotEyes(ctx, u * 4.6, -u * 1.4, u * 1.9, u * 0.45, { happy: k > 0.2 });
  blush(ctx, u * 4.6, -u * 0.6, u * 3.2, u * 0.4);
  ctx.restore();
  // The hinge.
  ellipse(ctx, -u * 3.6, -u * 2, u * 0.8, u * 0.8);
  shade(ctx, ART.metal, -u * 3.6, -u * 2, u * 0.8);
  outline(ctx, u * 0.25);
  if (look.power && !look.still) {
    const tw = (Math.sin(look.t * 8) + 1) / 2;
    star(ctx, u * 2.5, -u * 5.5, u * (0.6 + tw * 0.5), hsl(ART.gold, 20));
  }
}

function star(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const d = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function firewall(ctx: Ctx, u: number, look: HelperLook) {
  const w = u * 7.4;
  const h = u * 7;
  rounded(ctx, -w / 2, -h, w, h, u * 0.8);
  ctx.fillStyle = hsl(ART.mortar);
  ctx.fill();
  const rows = 4;
  const bh = h / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : -w / 4;
    for (let i = -1; i < 3; i++) {
      const bx = -w / 2 + off + i * (w / 2);
      const x0 = Math.max(-w / 2 + u * 0.3, bx + u * 0.25);
      const x1 = Math.min(w / 2 - u * 0.3, bx + w / 2 - u * 0.25);
      if (x1 - x0 < u * 0.5) continue;
      const y0 = -h + r * bh + u * 0.25;
      rounded(ctx, x0, y0, x1 - x0, bh - u * 0.5, u * 0.4);
      shadeDown(ctx, ART.brick, y0, y0 + bh, 10 - r * 2, -12);
    }
  }
  rounded(ctx, -w / 2, -h, w, h, u * 0.8);
  outline(ctx, u * 0.35);
  // Cracks as it wears down.
  ctx.strokeStyle = hsl(ART.ink, 0, 0.7);
  ctx.lineWidth = u * 0.3;
  if (look.hpShare < 0.66) {
    ctx.beginPath();
    ctx.moveTo(-u * 1, -h + u * 0.3);
    ctx.lineTo(-u * 0.2, -h + u * 2);
    ctx.lineTo(-u * 1.2, -h + u * 3.4);
    ctx.stroke();
  }
  if (look.hpShare < 0.33) {
    ctx.beginPath();
    ctx.moveTo(u * 2.6, -u * 0.3);
    ctx.lineTo(u * 1.6, -u * 2);
    ctx.lineTo(u * 2.2, -u * 3.4);
    ctx.stroke();
  }
  dotEyes(ctx, 0, -h * 0.55, u * 2.6, u * 0.55);
  ctx.beginPath();
  ctx.moveTo(-u * 1.8, -h * 0.55 - u * 1.2);
  ctx.lineTo(-u * 0.6, -h * 0.55 - u * 0.8);
  ctx.moveTo(u * 1.8, -h * 0.55 - u * 1.2);
  ctx.lineTo(u * 0.6, -h * 0.55 - u * 0.8);
  outline(ctx, u * 0.4, ART.ink, 1);
  // Flames along the top.
  for (let i = 0; i < 4; i++) {
    const fx = -w / 2 + u * 1.1 + (i * (w - u * 2.2)) / 3;
    const flick = look.still ? 0.5 : (Math.sin(look.t * 14 + i * 1.9) + 1) / 2;
    const fh = u * (2 + flick * 1.4);
    ctx.beginPath();
    ctx.moveTo(fx - u * 0.9, -h + u * 0.2);
    ctx.quadraticCurveTo(
      fx - u * 1,
      -h - fh * 0.5,
      fx + (flick - 0.5) * u * 0.6,
      -h - fh,
    );
    ctx.quadraticCurveTo(fx + u * 1, -h - fh * 0.5, fx + u * 0.9, -h + u * 0.2);
    ctx.closePath();
    const g = ctx.createLinearGradient(fx, -h, fx, -h - fh);
    g.addColorStop(0, hsl(ART.ember));
    g.addColorStop(0.55, hsl(ART.flame));
    g.addColorStop(1, hsl(ART.spark, 10));
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function fan(ctx: Ctx, u: number, look: HelperLook) {
  // Stand and base.
  rounded(ctx, -u * 0.5, -u * 4, u * 1, u * 3.6, u * 0.4);
  shadeDown(ctx, ART.metal, -u * 4, 0, 10, -14);
  rounded(ctx, -u * 2.8, -u * 1, u * 5.6, u * 1.1, u * 0.5);
  shadeDown(ctx, ART.fan, -u * 1, 0, 6, -20);
  outline(ctx, u * 0.3);
  const cx = 0;
  const cy = -u * 5.6;
  const r = u * 3.6;
  ellipse(ctx, cx, cy, r, r);
  ctx.fillStyle = hsl(ART.ice, 8, 0.45);
  ctx.fill();
  // Blades, spinning.
  const spin = look.still ? 0.4 : look.t * 14;
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ellipse(ctx, r * 0.48, 0, r * 0.48, r * 0.22, 0.25);
    shade(ctx, ART.fan, r * 0.48, 0, r * 0.5, 18, -10);
    ctx.restore();
  }
  // The cage.
  ellipse(ctx, cx, cy, r, r);
  outline(ctx, u * 0.45, ART.fan, 1);
  ctx.strokeStyle = hsl(ART.fan, 10, 0.55);
  ctx.lineWidth = u * 0.18;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
    ctx.stroke();
  }
  ellipse(ctx, cx, cy, r, r);
  outline(ctx, u * 0.3);
  // The middle cap, with a face.
  ellipse(ctx, cx, cy, u * 1.5, u * 1.5);
  shade(ctx, ART.white, cx, cy, u * 1.5, 0, -14);
  outline(ctx, u * 0.25);
  dotEyes(ctx, cx, cy - u * 0.2, u * 1.1, u * 0.28, {
    happy: look.acted < 0.3,
  });
  smile(ctx, cx, cy + u * 0.8, u * 0.8, u * 0.22);
}

function sticky(ctx: Ctx, u: number, look: HelperLook) {
  const wobble =
    look.still || look.acted > 0.4 ? 0 : Math.sin(look.acted * 30) * 0.08;
  for (let i = look.uses - 1; i >= 0; i--) {
    ctx.save();
    ctx.translate(i * u * 0.5, -i * u * 0.4);
    ctx.rotate(-0.06 + i * 0.05 + wobble);
    // A sticky note lies flat, so it is drawn wide and low.
    ctx.beginPath();
    ctx.moveTo(-u * 3.6, -u * 2.6);
    ctx.lineTo(u * 3.6, -u * 2.6);
    ctx.lineTo(u * 3.6, -u * 0.4);
    ctx.quadraticCurveTo(u * 3.2, u * 0.1, u * 2.4, u * 0.4);
    ctx.lineTo(-u * 3.6, u * 0.4);
    ctx.closePath();
    shadeDown(ctx, ART.note, -u * 2.6, u * 0.4, 8 - i * 6, -8 - i * 6);
    outline(ctx, u * 0.25, ART.ink, 0.45);
    if (i === 0) {
      dotEyes(ctx, -u * 0.6, -u * 1.4, u * 2, u * 0.4, {
        happy: look.acted < 0.6,
      });
      smile(ctx, -u * 0.6, -u * 0.3, u * 0.9, u * 0.22);
    }
    ctx.restore();
  }
}

function printer(ctx: Ctx, u: number, look: HelperLook) {
  const k = kick(look.acted, look.still);
  // Paper waiting at the top.
  rounded(ctx, -u * 2.4, -u * 8.2, u * 4.8, u * 2.4, u * 0.2);
  ctx.fillStyle = hsl(ART.white);
  ctx.fill();
  outline(ctx, u * 0.25, ART.ink, 0.5);
  // The body.
  rounded(ctx, -u * 4.2, -u * 6.4, u * 8.4, u * 5.6, u * 1.3);
  shade(ctx, ART.printer, 0, -u * 4, u * 5, 6, -18);
  outline(ctx, u * 0.35);
  // The colored stripe.
  const stripe = [ART.cyan, ART.magenta, ART.yellow];
  stripe.forEach((color, i) => {
    rounded(
      ctx,
      -u * 4.2 + u * 0.3,
      -u * 2.8 + i * u * 0.5,
      u * 7.8,
      u * 0.45,
      u * 0.2,
    );
    ctx.fillStyle = hsl(color);
    ctx.fill();
  });
  // The screen with a face.
  rounded(ctx, -u * 2.2, -u * 5.8, u * 4.4, u * 2.2, u * 0.5);
  shadeDown(ctx, ART.slate, -u * 5.8, -u * 3.6, 8, -6);
  ctx.fillStyle = hsl(ART.ice, 10);
  ctx.font = `700 ${u * 1.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(look.acted < 0.5 ? "^ ^" : "• •", 0, -u * 4.2);
  // The out tray, with a page coming out after a throw.
  rounded(ctx, -u * 3.4, -u * 1.1, u * 6.8, u * 1, u * 0.4);
  ctx.fillStyle = hsl(ART.slate, 10);
  ctx.fill();
  if (k > 0) {
    rounded(ctx, -u * 2, -u * 1.2, u * 4, u * 0.6 + k * u * 1.2, u * 0.2);
    ctx.fillStyle = hsl(ART.white);
    ctx.fill();
  }
}

function eraser(ctx: Ctx, u: number, look: HelperLook) {
  const shake = look.still ? 0 : Math.sin(look.t * 50) * u * 0.4 * look.charge;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.rotate(-0.12);
  rounded(ctx, -u * 4, -u * 4.2, u * 4.8, u * 4, u * 0.9);
  shade(ctx, ART.eraserPink, -u * 1.6, -u * 2.2, u * 3.5, 10, -14);
  outline(ctx, u * 0.35);
  rounded(ctx, u * 0.6, -u * 4.2, u * 3.4, u * 4, u * 0.9);
  shade(ctx, ART.eraserBlue, u * 2.2, -u * 2.2, u * 3, 12, -14);
  outline(ctx, u * 0.35);
  dotEyes(ctx, -u * 1.6, -u * 2.6, u * 2, u * 0.45);
  ctx.beginPath();
  ctx.moveTo(-u * 3, -u * 3.6);
  ctx.lineTo(-u * 2, -u * 3.2);
  ctx.moveTo(-u * 0.2, -u * 3.6);
  ctx.lineTo(-u * 1.2, -u * 3.2);
  outline(ctx, u * 0.35, ART.ink, 1);
  ctx.beginPath();
  ctx.arc(-u * 1.6, -u * 1, u * 0.6, Math.PI * 1.15, Math.PI * 1.85);
  outline(ctx, u * 0.3, ART.ink, 1);
  ctx.restore();
  // A ring closing as it gets ready to wipe.
  ctx.beginPath();
  ctx.arc(
    0,
    -u * 2.2,
    u * 4.6,
    -Math.PI / 2,
    -Math.PI / 2 + look.charge * Math.PI * 2,
  );
  outline(ctx, u * 0.45, ART.ember, 0.9);
}

function lamp(ctx: Ctx, u: number, look: HelperLook) {
  const k = kick(look.acted, look.still);
  // Base and arm.
  ellipse(ctx, -u * 1.5, -u * 0.5, u * 2.6, u * 0.8);
  shade(ctx, ART.slate, -u * 1.5, -u * 0.5, u * 2.6, 16, -6);
  outline(ctx, u * 0.3);
  ctx.strokeStyle = hsl(ART.lamp, -6);
  ctx.lineWidth = u * 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-u * 1.5, -u * 0.8);
  ctx.lineTo(-u * 2.6, -u * 5);
  ctx.lineTo(u * 0.6, -u * 7);
  ctx.stroke();
  for (const [jx, jy] of [
    [-u * 2.6, -u * 5],
    [-u * 1.5, -u * 0.8],
  ]) {
    ellipse(ctx, jx ?? 0, jy ?? 0, u * 0.6, u * 0.6);
    shade(ctx, ART.metal, jx ?? 0, jy ?? 0, u * 0.6);
  }
  // The glow, brighter as it charges.
  const glow = Math.min(1, look.charge * 0.8 + k);
  const gx = u * 3.4;
  const gy = -u * 5.4;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, u * 4.5);
  g.addColorStop(0, hsl(ART.bulb, 0, 0.75 * glow));
  g.addColorStop(1, hsl(ART.bulb, 0, 0));
  ctx.fillStyle = g;
  ellipse(ctx, gx, gy, u * 4.5, u * 4.5);
  ctx.fill();
  // The shade, pointing at the critters.
  ctx.save();
  ctx.translate(u * 0.6, -u * 7);
  ctx.rotate(0.55 - k * 0.15);
  ctx.beginPath();
  ctx.moveTo(-u * 1, -u * 1.2);
  ctx.lineTo(u * 1, -u * 1.2);
  ctx.lineTo(u * 2.8, u * 2.4);
  ctx.lineTo(-u * 2.8, u * 2.4);
  ctx.closePath();
  shade(ctx, ART.lamp, 0, 0, u * 3, 14, -16);
  outline(ctx, u * 0.35);
  ellipse(ctx, 0, u * 2.4, u * 1.4, u * 0.6);
  ctx.fillStyle = hsl(ART.bulb, 0, 0.5 + glow * 0.5);
  ctx.fill();
  dotEyes(ctx, 0, u * 0.7, u * 1.6, u * 0.35, { happy: k > 0.2 });
  ctx.restore();
}

const ART_FOR: Record<
  HelperKind,
  (ctx: Ctx, u: number, look: HelperLook) => void
> = {
  coffee,
  stapler,
  firewall,
  fan,
  sticky,
  printer,
  eraser,
  lamp,
};

// Draw a helper standing in a cell whose middle is (x, y), sized against s.
export function drawHelper(
  ctx: Ctx,
  kind: HelperKind,
  x: number,
  y: number,
  s: number,
  look: HelperLook,
  shadow = true,
) {
  const u = s / 10;
  const floor = y + s * 0.36;
  if (shadow && kind !== "sticky")
    groundShadow(ctx, x, floor, s * 0.36, s * 0.08);
  // A shake while a critter chews on it.
  const shake =
    !look.still && look.bitten < 0.15 ? Math.sin(look.t * 70) * u * 0.35 : 0;
  ctx.save();
  ctx.translate(x + shake, floor);
  ART_FOR[kind](ctx, u, look);
  ctx.restore();
}
