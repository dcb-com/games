import type { Ctx } from "~/games/desk-defense/art/color";
import {
  ART,
  blush,
  ellipse,
  eye,
  groundShadow,
  hsl,
  outline,
  rounded,
  shade,
} from "~/games/desk-defense/art/color";
import { furSpec, furSprite } from "~/games/desk-defense/art/fur";
import type { Critter } from "~/games/desk-defense/round";
import type { CritterKind } from "~/games/desk-defense/units";
import { CRITTERS } from "~/games/desk-defense/units";

// Draws one critter: its shadow, feet, furry body, face and whatever it
// wears, plus how it feels right now: chewing, stuck, cold or burned.

// A critter standing still, for the menus and the level cards.
export function sampleCritter(kind: CritterKind): Critter {
  const def = CRITTERS[kind];
  return {
    id: kind.length,
    kind,
    row: 0,
    x: 0,
    hp: def.hp,
    maxHp: def.hp,
    armor: def.armor,
    maxArmor: def.armor,
    slowFor: 0,
    stuckFor: 0,
    stuckOn: 0,
    hopped: false,
    hop: null,
    chewing: false,
    flash: 0,
    burn: 0,
    angry: kind === "grumble",
    age: 9,
  };
}

function mouth(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  open: number,
  fangs: boolean,
) {
  if (open < 0.08) {
    ctx.beginPath();
    ctx.arc(x, y - w * 0.3, w * 0.45, Math.PI * 0.18, Math.PI * 0.82);
    outline(ctx, Math.max(1, w * 0.16), ART.ink, 1);
    return;
  }
  const h = w * (0.25 + open * 0.55);
  ellipse(ctx, x, y, w * 0.5, h * 0.6);
  ctx.fillStyle = hsl(ART.mouth);
  ctx.fill();
  outline(ctx, Math.max(1, w * 0.12));
  ctx.save();
  ellipse(ctx, x, y, w * 0.5, h * 0.6);
  ctx.clip();
  ellipse(ctx, x, y + h * 0.45, w * 0.35, h * 0.3);
  ctx.fillStyle = hsl(ART.tongue);
  ctx.fill();
  ctx.fillStyle = hsl(ART.tooth);
  const tooth = w * 0.18;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.3, y - h * 0.6);
  ctx.lineTo(x - w * 0.3 + tooth / 2, y - h * 0.6 + tooth * (fangs ? 1.6 : 1));
  ctx.lineTo(x - w * 0.3 + tooth, y - h * 0.6);
  ctx.moveTo(x + w * 0.3 - tooth, y - h * 0.6);
  ctx.lineTo(x + w * 0.3 - tooth / 2, y - h * 0.6 + tooth * (fangs ? 1.6 : 1));
  ctx.lineTo(x + w * 0.3, y - h * 0.6);
  ctx.fill();
  ctx.restore();
}

function paw(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  kind: CritterKind,
  lift: number,
) {
  const base = furSpec(kind).base;
  ellipse(ctx, x, y - lift, r * 1.25, r * 0.8);
  shade(ctx, base, x, y - lift, r * 1.2, 6, -20);
  outline(ctx, Math.max(0.8, r * 0.18), ART.ink, 0.5);
  ctx.strokeStyle = hsl(base, -28, 0.7);
  ctx.lineWidth = Math.max(0.6, r * 0.14);
  for (const dx of [-0.4, 0.05]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r * 1.6, y - lift + r * 0.1);
    ctx.lineTo(x + dx * r * 1.6, y - lift + r * 0.65);
    ctx.stroke();
  }
}

function ear(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  kind: CritterKind,
) {
  const base = furSpec(kind).base;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ellipse(ctx, 0, -h / 2, w / 2, h / 2);
  shade(ctx, base, 0, -h / 2, h / 2, 10, -18);
  outline(ctx, Math.max(0.8, w * 0.1), ART.ink, 0.55);
  ellipse(ctx, 0, -h / 2 + h * 0.06, w * 0.24, h * 0.36);
  ctx.fillStyle = hsl(ART.blush, 4, 0.85);
  ctx.fill();
  ctx.restore();
}

function horn(ctx: Ctx, x: number, y: number, s: number, flip: number) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.quadraticCurveTo(
    x - s * 0.4 + flip * s * 0.2,
    y - s * 1.2,
    x + flip * s * 0.6,
    y - s * 1.5,
  );
  ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.6, x + s * 0.5, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y - s * 1.5);
  g.addColorStop(0, hsl(ART.tooth, -18));
  g.addColorStop(1, hsl(ART.tooth));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(0.8, s * 0.12), ART.ink, 0.6);
}

function crown(ctx: Ctx, x: number, y: number, w: number) {
  const h = w * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h * 0.6);
  ctx.lineTo(x - w / 4, y - h * 0.2);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w / 4, y - h * 0.2);
  ctx.lineTo(x + w / 2, y - h * 0.6);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - h, x, y);
  g.addColorStop(0, hsl(ART.gold, 18));
  g.addColorStop(1, hsl(ART.gold, -14));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(1, w * 0.06));
  for (const [dx, color] of [
    [-w / 4, ART.magenta],
    [0, ART.cyan],
    [w / 4, ART.hopper],
  ] as const) {
    ellipse(ctx, x + dx, y - h * 0.18, w * 0.07, w * 0.07);
    ctx.fillStyle = hsl(color, 10);
    ctx.fill();
  }
}

function helmet(ctx: Ctx, x: number, y: number, w: number, share: number) {
  const h = w * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, y - h, x + w / 2, y);
  g.addColorStop(0, hsl(ART.metal, 24));
  g.addColorStop(0.5, hsl(ART.metal));
  g.addColorStop(1, hsl(ART.metal, -22));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, Math.max(1, w * 0.05));
  rounded(ctx, x - w * 0.58, y - h * 0.1, w * 1.16, h * 0.22, h * 0.1);
  ctx.fillStyle = hsl(ART.metal, -10);
  ctx.fill();
  outline(ctx, Math.max(1, w * 0.04));
  // The handle, sticking out the back.
  rounded(ctx, x + w * 0.55, y - h * 0.08, w * 0.3, h * 0.16, h * 0.08);
  ctx.fillStyle = hsl(ART.ink, 10);
  ctx.fill();
  // Dents as the helmet takes hits.
  ctx.strokeStyle = hsl(ART.ink, 0, 0.6);
  ctx.lineWidth = Math.max(0.8, w * 0.03);
  if (share < 0.7) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.2, y - h * 0.8);
    ctx.lineTo(x - w * 0.05, y - h * 0.55);
    ctx.lineTo(x - w * 0.15, y - h * 0.35);
    ctx.stroke();
  }
  if (share < 0.35) {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y - h * 0.85);
    ctx.lineTo(x + w * 0.1, y - h * 0.5);
    ctx.lineTo(x + w * 0.25, y - h * 0.3);
    ctx.stroke();
  }
  ellipse(ctx, x - w * 0.18, y - h * 0.7, w * 0.08, h * 0.12, -0.6);
  ctx.fillStyle = hsl(ART.white, 0, 0.7);
  ctx.fill();
}

function flames(ctx: Ctx, x: number, y: number, s: number, t: number) {
  for (let i = -1; i <= 1; i++) {
    const h = s * (0.35 + 0.12 * Math.sin(t * 20 + i * 2));
    const fx = x + i * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(fx - s * 0.08, y);
    ctx.quadraticCurveTo(fx - s * 0.1, y - h * 0.6, fx, y - h);
    ctx.quadraticCurveTo(fx + s * 0.1, y - h * 0.6, fx + s * 0.08, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(fx, y, fx, y - h);
    g.addColorStop(0, hsl(ART.ember, 0, 0.9));
    g.addColorStop(0.6, hsl(ART.flame, 0, 0.9));
    g.addColorStop(1, hsl(ART.spark, 0, 0.6));
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function snowflake(ctx: Ctx, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t);
  ctx.strokeStyle = hsl(ART.ice, 10, 0.95);
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export interface CritterLook {
  // Real seconds, for wiggles. 0 when motion is reduced.
  t: number;
  still: boolean;
  ratio: number;
}

// Draw a critter standing at (x, y): the middle of its cell. s is the cell
// size the critter is drawn against.
export function drawCritter(
  ctx: Ctx,
  c: Critter,
  x: number,
  y: number,
  s: number,
  look: CritterLook,
) {
  const def = CRITTERS[c.kind];
  const size = s * def.scale;
  const u = size / 10;
  const { t, still } = look;
  const moving = !c.chewing && c.stuckFor <= 0 && !c.hop;
  const pace =
    c.kind === "zippy" || c.kind === "mini" || (c.kind === "shellby" && c.angry)
      ? 14
      : 9;
  const phase = still ? 0 : t * pace + c.id * 1.7;
  const step = moving ? Math.sin(phase) : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * u * 0.7 : 0;
  const chew = c.chewing && !still ? (Math.sin(t * 16 + c.id) + 1) / 2 : 0;
  const wiggle =
    c.stuckFor > 0 && !still ? Math.sin(t * 30 + c.id) * u * 0.4 : 0;
  // A short pop as the critter arrives.
  const pop = still
    ? 1
    : Math.min(1, 0.6 + c.age * 1.6) +
      (c.age < 0.4 ? Math.sin(c.age * 8) * 0.08 : 0);

  const feetY = y + s * 0.32;
  const hopY = c.hop ? -Math.sin(Math.PI * c.hop.t) * s * 0.85 : 0;
  const hopTilt = c.hop ? -0.35 * Math.sin(Math.PI * c.hop.t) : 0;
  const shadowScale = c.hop ? 1 - Math.sin(Math.PI * c.hop.t) * 0.5 : 1;

  groundShadow(
    ctx,
    x,
    feetY + u * 0.4,
    size * 0.34 * shadowScale,
    size * 0.09 * shadowScale,
  );

  // The sticky note it is stuck on, flat on the desk under its feet.
  if (c.stuckFor > 0) {
    ctx.save();
    ctx.translate(x, feetY);
    ctx.rotate(-0.08);
    rounded(ctx, -size * 0.32, -size * 0.07, size * 0.64, size * 0.16, 2);
    ctx.fillStyle = hsl(ART.note);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x + wiggle, feetY + hopY);
  ctx.rotate(hopTilt);
  ctx.scale(pop, pop);

  const bodyY = -size * 0.36 - bob;
  const squash = moving ? Math.sin(phase * 2) * 0.05 : chew * 0.06;

  // Things behind the body.
  if (c.kind === "zippy") {
    const sway = still ? 0 : Math.sin(phase * 0.5) * 0.15;
    ear(ctx, -u * 1.4, bodyY - u * 2.2, u * 1.5, u * 4.2, -0.35 + sway, c.kind);
    ear(ctx, u * 0.8, bodyY - u * 2.2, u * 1.5, u * 4.2, 0.25 + sway, c.kind);
  }
  if (c.kind === "chonk") {
    horn(ctx, -u * 2, bodyY - u * 3.1, u * 1.5, -1);
    horn(ctx, u * 1.8, bodyY - u * 3.1, u * 1.5, 1);
  }
  if (c.kind === "fuzzball" || c.kind === "grumble") {
    ear(ctx, -u * 2.3, bodyY - u * 2.2, u * 1.7, u * 2.8, -0.55, c.kind);
    ear(ctx, u * 2.3, bodyY - u * 2.2, u * 1.7, u * 2.8, 0.55, c.kind);
  }
  if (c.kind === "hopper") {
    // Big springy back feet.
    for (const dx of [u * 2.2, -u * 0.2]) {
      ellipse(ctx, dx, -u * 0.5, u * 1.9, u * 0.8);
      shade(ctx, ART.hopper, dx, -u * 0.5, u * 1.9, 8, -20);
      outline(ctx, Math.max(0.8, u * 0.18), ART.ink, 0.5);
    }
  }

  // The body.
  const sprite = furSprite(c.kind, size, look.ratio, c.flash > 0);
  if (sprite) {
    ctx.save();
    ctx.translate(0, bodyY);
    ctx.scale(1 + squash, 1 - squash);
    ctx.drawImage(
      sprite.canvas,
      -sprite.half,
      -sprite.half,
      sprite.half * 2,
      sprite.half * 2,
    );
    ctx.restore();
  }

  // Feet, peeking out in front of the fur.
  if (c.kind !== "hopper") {
    paw(ctx, -u * 1.6, u * 0.1, u * 0.95, c.kind, Math.max(0, step) * u * 0.9);
    paw(ctx, u * 1.4, u * 0.1, u * 0.95, c.kind, Math.max(0, -step) * u * 0.9);
  }

  // The face, looking left, where it is going.
  const fx = -u * 0.9;
  const fy = bodyY - u * 0.5;
  const lid = furSpec(c.kind).base;
  const cycle = 3.2 + (c.id % 5) * 0.45;
  const blink = !still && (t + c.id * 0.37) % cycle < 0.13 ? 1 : 0;
  const iris = ART.iris[c.kind];
  const eyeR = u * (c.kind === "mini" ? 1.35 : 1.05);

  switch (c.kind) {
    case "hopper": {
      // Frog-like eyes on top of the head.
      for (const dx of [-u * 1.7, u * 0.5]) {
        ellipse(ctx, fx + dx + u * 0.6, fy - u * 2.1, u * 1.3, u * 1.2);
        shade(ctx, ART.hopper, fx + dx + u * 0.6, fy - u * 2.1, u * 1.3);
        eye(ctx, fx + dx + u * 0.6, fy - u * 2.2, u * 0.95, iris, lid, {
          shut: blink,
        });
      }
      break;
    }
    case "chonk":
      eye(ctx, fx - u * 1.1, fy, eyeR, iris, lid, {
        shut: blink,
        sleepy: true,
      });
      eye(ctx, fx + u * 1.2, fy, eyeR, iris, lid, {
        shut: blink,
        sleepy: true,
      });
      break;
    case "grumble":
      eye(ctx, fx - u * 1.2, fy, eyeR, iris, lid, { shut: blink, angry: 1 });
      eye(ctx, fx + u * 1.2, fy, eyeR, iris, lid, { shut: blink, angry: -1 });
      break;
    case "shellby":
      eye(ctx, fx - u * 1.1, fy + u * 0.3, eyeR, iris, lid, {
        shut: blink,
        angry: c.angry ? 1 : 0,
      });
      eye(ctx, fx + u * 1.1, fy + u * 0.3, eyeR, iris, lid, {
        shut: blink,
        angry: c.angry ? -1 : 0,
      });
      break;
    default:
      eye(ctx, fx - u * 1.1, fy, eyeR, iris, lid, { shut: blink });
      eye(ctx, fx + u * 1.1, fy, eyeR, iris, lid, { shut: blink });
  }

  if (c.kind !== "grumble" && c.kind !== "shellby") {
    blush(ctx, fx, fy + u * 1.4, u * 3.6, u * 0.7);
  }
  const mouthY = c.kind === "hopper" ? fy + u * 0.4 : fy + u * 1.7;
  const mouthW = c.kind === "chonk" || c.kind === "grumble" ? u * 1.9 : u * 1.3;
  mouth(
    ctx,
    fx,
    mouthY,
    mouthW,
    c.kind === "grumble" ? Math.max(0.3, chew) : chew,
    c.kind === "grumble",
  );

  if (c.kind === "zippy") {
    // Two big front teeth.
    rounded(ctx, fx - u * 0.45, mouthY - u * 0.15, u * 0.9, u * 0.75, u * 0.15);
    ctx.fillStyle = hsl(ART.tooth);
    ctx.fill();
    outline(ctx, Math.max(0.6, u * 0.12), ART.ink, 0.7);
  }
  if (c.kind === "splitter") {
    // The seam it will split along.
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const sy = bodyY - size * 0.3 + (i / 6) * size * 0.55;
      ctx.lineTo(u * 0.5 + (i % 2 === 0 ? -u * 0.4 : u * 0.4), sy);
    }
    outline(ctx, Math.max(0.8, u * 0.22), ART.ink, 0.45);
  }
  if (c.kind === "shellby" && c.armor > 0) {
    helmet(
      ctx,
      0,
      bodyY - u * 1.2,
      size * 0.68,
      c.armor / Math.max(1, c.maxArmor),
    );
  }
  if (c.kind === "grumble") {
    crown(ctx, u * 0.3, bodyY - size * 0.33, size * 0.34);
  }

  // How it feels.
  if (c.slowFor > 0) {
    ellipse(ctx, 0, bodyY, size * 0.4, size * 0.37);
    ctx.fillStyle = hsl(ART.ice, 0, 0.28);
    ctx.fill();
    snowflake(ctx, u * 2.2, bodyY - u * 2.6, u * 0.7, t * 0.8);
    snowflake(ctx, -u * 2.6, bodyY + u * 0.6, u * 0.5, -t);
  }
  if (c.burn > 0) flames(ctx, 0, bodyY - size * 0.3, size, t);
  if (c.angry && c.kind === "shellby" && !still) {
    // Steam from an angry head.
    for (const dx of [-1, 1]) {
      const rise = (t * 1.5 + (dx > 0 ? 0.5 : 0)) % 1;
      ellipse(
        ctx,
        dx * u * 2.4,
        bodyY - size * 0.36 - rise * u * 3,
        u * (0.5 + rise * 0.6),
        u * (0.5 + rise * 0.6),
      );
      ctx.fillStyle = hsl(ART.white, 0, 0.7 * (1 - rise));
      ctx.fill();
    }
  }

  ctx.restore();

  // Speed lines behind a zippy on the move.
  if (
    moving &&
    !still &&
    (c.kind === "zippy" || (c.kind === "shellby" && c.angry))
  ) {
    ctx.strokeStyle = hsl(ART.white, 0, 0.8);
    ctx.lineWidth = Math.max(1, u * 0.3);
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const ly = y - size * 0.15 + i * u * 1.4 - bob;
      const lx = x + size * 0.42 + ((t * 30 + i * 7) % 6) * u * 0.2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + u * 2.2, ly);
      ctx.stroke();
    }
  }
}
