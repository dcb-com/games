import { ART, ellipse, hsl, rounded } from "~/games/art/color";
import type { Pose } from "~/games/art/critters";
import { drawCritter } from "~/games/art/critters";
import type { Fx } from "~/games/art/fx";
import { furSpec } from "~/games/art/fur";
import type { BuildingLook, Ground } from "~/games/cubicle-clash/art";
import {
  STANDING,
  badge,
  drawBuilding,
  drawClutter,
  drawGround,
  drawRubble,
  drawScaffold,
  tileDiamond,
} from "~/games/cubicle-clash/art";
import type { Base, Building } from "~/games/cubicle-clash/base";
import { stored } from "~/games/cubicle-clash/base";
import type { Raid, RaidEvent, Shot } from "~/games/cubicle-clash/raid";
import { canDrop } from "~/games/cubicle-clash/raid";
import type { BuildingKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  COLS,
  ROWS,
  holds,
  isDecor,
} from "~/games/cubicle-clash/units";

// Draws Cubicle Clash at an angle, the way the game it is modeled on looks:
// the grid becomes a field of diamonds, and buildings, clutter and troops
// are drawn back to front so nearer things stand in front. The bars above
// and below the field are React, not canvas, so they take the theme.

// The height of those bars, in pixels: h-7.5 in cubicle-clash.tsx.
const BAR = 30;

export interface Layout {
  width: number;
  height: number;
  // The width of one tile's diamond.
  w: number;
  // Where the grid's top corner sits.
  ox: number;
  oy: number;
}

export function layout(width: number, height: number): Layout {
  const span = (COLS + ROWS) / 2;
  const w = Math.min(
    width / (span + 0.6),
    (height - BAR * 2) / (span / 2 + 0.9),
  );
  return {
    width,
    height,
    w,
    ox: width / 2 - ((COLS - ROWS) * w) / 4,
    oy: BAR + (height - BAR * 2 - (span / 2) * w) / 2 + w * 0.35,
  };
}

// A spot on the grid, in tiles, as a point on screen.
export function px(l: Layout, gx: number, gy: number) {
  return { x: l.ox + ((gx - gy) * l.w) / 2, y: l.oy + ((gx + gy) * l.w) / 4 };
}

export function ground(l: Layout): Ground {
  return {
    width: l.width,
    height: l.height,
    at: (gx, gy) => px(l, gx, gy),
    w: l.w,
    cols: COLS,
    rows: ROWS,
  };
}

// The tile under a point on screen, if there is one.
export function cellAt(l: Layout, x: number, y: number) {
  const u = (x - l.ox) / (l.w / 2);
  const v = (y - l.oy) / (l.w / 4);
  const col = Math.floor((u + v) / 2);
  const row = Math.floor((v - u) / 2);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
  return { col, row };
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  share: number,
  good: boolean,
) {
  if (share >= 1) return;
  rounded(ctx, x, y, w, 4, 2);
  ctx.fillStyle = hsl(ART.ink, 0, 0.5);
  ctx.fill();
  rounded(ctx, x, y, w * Math.max(0, share), 4, 2);
  ctx.fillStyle = good ? hsl(ART.hopper, 5) : hsl(ART.ember, 8);
  ctx.fill();
}

function wallLinks(
  list: { kind: BuildingKind; col: number; row: number; down?: boolean }[],
  b: { col: number; row: number },
) {
  const wallAt = (col: number, row: number) =>
    list.some(
      (o) => o.kind === "wall" && !o.down && o.col === col && o.row === row,
    );
  return { right: wallAt(b.col + 1, b.row), down: wallAt(b.col, b.row + 1) };
}

// A little bubble over a press or brewery that is ready to collect.
function readyBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  coins: boolean,
  t: number,
) {
  const bob = Math.sin(t * 3) * w * 0.04;
  ctx.beginPath();
  ctx.ellipse(x, y + bob, w * 0.17, w * 0.15, 0, 0, Math.PI * 2);
  ctx.moveTo(x - w * 0.05, y + bob + w * 0.13);
  ctx.lineTo(x, y + bob + w * 0.24);
  ctx.lineTo(x + w * 0.05, y + bob + w * 0.13);
  ctx.fillStyle = hsl(ART.white, 0, 0.95);
  ctx.fill();
  ctx.strokeStyle = hsl(ART.ink, 0, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ellipse(ctx, x, y + bob, w * 0.08, w * 0.08);
  ctx.fillStyle = coins ? hsl(ART.gold, 5) : hsl(ART.brew, 10);
  ctx.fill();
}

function timeLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export interface VillageView {
  t: number;
  still: boolean;
  ratio: number;
  now: number;
  cursor: { col: number; row: number } | null;
  // A building being placed or moved, and whether it fits there.
  ghost: { kind: BuildingKind; level: number; ok: boolean } | null;
  selected: number | null;
  // Show the tile grid, while building or moving.
  grid: boolean;
  fx: Fx;
  font: string;
}

function footMiddle(l: Layout, b: { col: number; row: number }, size: number) {
  return px(l, b.col + size / 2, b.row + size / 2);
}

export function drawVillage(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  base: Base,
  view: VillageView,
) {
  ctx.clearRect(0, 0, l.width, l.height);
  const g = ground(l);
  drawGround(ctx, g, view.ratio);

  if (view.grid) {
    ctx.strokeStyle = hsl(ART.white, 0, 0.22);
    ctx.lineWidth = 1;
    for (let col = 1; col < COLS - 1; col++) {
      for (let row = 1; row < ROWS - 1; row++) {
        tileDiamond(ctx, g, col, row);
        ctx.stroke();
      }
    }
  }

  const chosen = base.buildings.find((b) => b.id === view.selected);
  if (chosen && BUILDINGS[chosen.kind].range > 0) {
    const m = footMiddle(l, chosen, 1);
    const r = BUILDINGS[chosen.kind].range;
    ellipse(ctx, m.x, m.y, r * l.w * 0.71, r * l.w * 0.355);
    ctx.fillStyle = hsl(ART.white, 0, 0.12);
    ctx.fill();
    ctx.strokeStyle = hsl(ART.white, 0, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (chosen) {
    tileDiamond(ctx, g, chosen.col, chosen.row, BUILDINGS[chosen.kind].size);
    ctx.fillStyle = hsl(ART.gold, 10, 0.35);
    ctx.fill();
  }

  if (view.cursor) {
    const size = view.ghost ? BUILDINGS[view.ghost.kind].size : 1;
    tileDiamond(ctx, g, view.cursor.col, view.cursor.row, size);
    ctx.fillStyle = hsl(
      view.ghost && !view.ghost.ok ? ART.ember : ART.white,
      0,
      0.28,
    );
    ctx.fill();
    ctx.strokeStyle =
      view.ghost && !view.ghost.ok
        ? hsl(ART.ember, 5)
        : hsl(ART.white, 0, 0.95);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  interface Item {
    depth: number;
    draw: () => void;
  }
  const items: Item[] = [];
  for (const c of base.clutter) {
    const m = px(l, c.col + 0.5, c.row + 0.5);
    items.push({
      depth: c.col + c.row + 1,
      draw: () => {
        drawClutter(ctx, c.kind, m.x, m.y, l.w, c.id);
        if (c.clearing) {
          const share = 1 - (c.clearing.until - view.now) / c.clearing.total;
          drawScaffold(
            ctx,
            m.x,
            m.y,
            l.w,
            1,
            share,
            timeLeft(c.clearing.until - view.now),
            view.t,
            view.still,
          );
        }
      },
    });
  }
  for (const b of base.buildings) {
    const size = BUILDINGS[b.kind].size;
    const m = footMiddle(l, b, size);
    const moving = view.ghost && b.id === view.selected;
    items.push({
      depth: b.col + b.row + size,
      draw: () => {
        if (moving) ctx.globalAlpha = 0.35;
        const have = stored(b, view.now);
        const look: BuildingLook = {
          ...STANDING,
          t: view.t,
          still: view.still,
          level: b.job?.kind === "build" ? 1 : b.level,
          full:
            b.kind === "press" || b.kind === "coffee"
              ? have / holds(b.level)
              : 0.5,
        };
        if (b.job?.kind === "build") ctx.globalAlpha *= 0.55;
        drawBuilding(
          ctx,
          b.kind,
          m.x,
          m.y,
          l.w,
          look,
          wallLinks(base.buildings, b),
        );
        ctx.globalAlpha = 1;
        if (b.job) {
          const share = 1 - (b.job.until - view.now) / b.job.total;
          drawScaffold(
            ctx,
            m.x,
            m.y,
            l.w,
            size,
            share,
            timeLeft(b.job.until - view.now),
            view.t,
            view.still,
          );
          return;
        }
        if (b.level > 1 && b.kind !== "wall" && !isDecor(b.kind)) {
          badge(
            ctx,
            m.x + l.w * 0.3 * size,
            m.y + l.w * 0.04,
            l.w * 0.11,
            b.level,
          );
        }
        if ((b.kind === "press" || b.kind === "coffee") && have >= 10) {
          readyBubble(
            ctx,
            m.x + l.w * 0.1,
            m.y - l.w * 0.95,
            l.w,
            b.kind === "press",
            view.t,
          );
        }
      },
    });
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const item of items) item.draw();

  if (view.cursor && view.ghost) {
    const size = BUILDINGS[view.ghost.kind].size;
    const m = px(l, view.cursor.col + size / 2, view.cursor.row + size / 2);
    ctx.globalAlpha = 0.7;
    drawBuilding(ctx, view.ghost.kind, m.x, m.y, l.w, {
      ...STANDING,
      level: view.ghost.level,
    });
    ctx.globalAlpha = 1;
  }
  view.fx.draw(ctx, view.font);
}

export interface RaidView {
  ratio: number;
  t: number;
  still: boolean;
  showCursor: boolean;
  fx: Fx;
  font: string;
}

function drawShot(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  s: Shot,
  t: number,
) {
  const p = px(l, s.x, s.y);
  const y = p.y - l.w * 0.45;
  const u = l.w / 10;
  if (s.kind === "staple") {
    ctx.strokeStyle = hsl(ART.metal, -12);
    ctx.lineWidth = u * 0.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - u, y + u * 0.6);
    ctx.lineTo(p.x - u, y - u * 0.6);
    ctx.lineTo(p.x + u, y - u * 0.6);
    ctx.lineTo(p.x + u, y + u * 0.6);
    ctx.stroke();
    return;
  }
  if (s.kind === "puff") {
    const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, u * 2.4);
    g.addColorStop(0, hsl(ART.white, 0, 0.95));
    g.addColorStop(1, hsl(ART.ice, 0, 0));
    ctx.fillStyle = g;
    ellipse(ctx, p.x, y, u * 2.4, u * 2.4);
    ctx.fill();
    return;
  }
  const to = px(l, s.tx, s.ty);
  ctx.save();
  ctx.translate(p.x, y);
  ctx.rotate(
    Math.atan2(to.y - p.y, to.x - p.x) + Math.sin(t * 9 + s.id) * 0.15,
  );
  ctx.beginPath();
  ctx.moveTo(u * 2.4, 0);
  ctx.lineTo(-u * 1.8, -u * 1.5);
  ctx.lineTo(-u, 0);
  ctx.lineTo(-u * 1.8, u * 1.1);
  ctx.closePath();
  ctx.fillStyle = hsl(ART.white);
  ctx.fill();
  ctx.strokeStyle = hsl(ART.ink, 0, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawRaid(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  r: Raid,
  view: RaidView,
) {
  ctx.clearRect(0, 0, l.width, l.height);
  const g = ground(l);
  drawGround(ctx, g, view.ratio);

  // Where troops may not land, shown while the player is choosing.
  if (view.showCursor) {
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (canDrop(r, col, row)) continue;
        tileDiamond(ctx, g, col, row);
        ctx.fillStyle = hsl(ART.ember, 0, 0.14);
        ctx.fill();
      }
    }
    const { col, row } = r.cursor;
    const ok = canDrop(r, col, row);
    tileDiamond(ctx, g, col, row);
    ctx.fillStyle = hsl(ok ? ART.white : ART.ember, 0, 0.3);
    ctx.fill();
    ctx.strokeStyle = ok ? hsl(ART.white, 0, 0.95) : hsl(ART.ember, 5);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  interface Item {
    depth: number;
    draw: () => void;
  }
  const items: Item[] = [];
  for (const d of r.scenery) {
    const m = px(l, d.col + 0.5, d.row + 0.5);
    items.push({
      depth: d.col + d.row + 1,
      draw: () =>
        drawBuilding(ctx, d.kind, m.x, m.y, l.w, {
          ...STANDING,
          t: view.t,
          still: view.still,
          level: d.level,
        }),
    });
  }
  for (const t of r.targets) {
    const m = footMiddle(l, t, t.size);
    items.push({
      depth: t.col + t.row + t.size,
      draw: () => {
        if (t.down) {
          drawRubble(ctx, m.x, m.y, l.w * t.size, t.id);
          return;
        }
        let facing: 1 | -1 = 1;
        if (BUILDINGS[t.kind].role === "defense") {
          let best = Infinity;
          for (const troop of r.troops) {
            const d = Math.hypot(
              troop.x - (t.col + 0.5),
              troop.y - (t.row + 0.5),
            );
            if (d < best) {
              best = d;
              // On screen, a troop is to the right when (x - y) is larger.
              facing = troop.x - troop.y >= t.col - t.row ? 1 : -1;
            }
          }
        }
        drawBuilding(
          ctx,
          t.kind,
          m.x,
          m.y,
          l.w,
          {
            ...STANDING,
            t: view.t,
            still: view.still,
            level: t.level,
            acted: t.acted,
            bitten: t.bitten,
            facing,
          },
          wallLinks(r.targets, t),
        );
        bar(
          ctx,
          m.x - l.w * 0.3,
          m.y - l.w * (0.75 + t.size * 0.25),
          l.w * 0.6,
          t.hp / t.maxHp,
          true,
        );
      },
    });
  }
  for (const troop of r.troops) {
    const p = px(l, troop.x, troop.y);
    const s = l.w * 0.62;
    const screenFacing: 1 | -1 = troop.facing;
    const pose: Pose = {
      id: troop.id,
      kind: troop.kind,
      armor: 0,
      maxArmor: 0,
      slowFor: troop.slowFor,
      stuckFor: 0,
      hop: troop.hop ? { t: Math.min(1, troop.hop.t) } : null,
      chewing: troop.chewing,
      flash: troop.flash,
      burn: 0,
      angry: troop.kind === "grumble",
      age: troop.age,
      facing: screenFacing,
    };
    items.push({
      depth: troop.x + troop.y + 0.2,
      draw: () => {
        drawCritter(ctx, pose, p.x, p.y - s * 0.32, s, {
          t: view.t,
          still: view.still,
          ratio: view.ratio,
        });
        bar(
          ctx,
          p.x - s * 0.25,
          p.y - s * 1.05,
          s * 0.5,
          troop.hp / troop.maxHp,
          false,
        );
      },
    });
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const item of items) item.draw();

  for (const s of r.shots) drawShot(ctx, l, s, view.t);
  view.fx.draw(ctx, view.font);
}

// Turns what just happened in a raid into puffs, dust and sparks.
export function raidEffects(
  fx: Fx,
  events: RaidEvent[],
  l: Layout,
  still: boolean,
) {
  const rand = Math.random;
  for (const e of events) {
    if (e.type === "star") continue;
    const p = px(l, e.x, e.y);
    switch (e.type) {
      case "drop":
        fx.add({
          kind: "ring",
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          life: 0.4,
          size: l.w * 0.5,
          color: ART.white,
        });
        break;
      case "poof": {
        const base = furSpec(e.kind).base;
        for (let i = 0; i < (still ? 5 : 12); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.w * (0.6 + rand());
          fx.add({
            kind: "fur",
            x: p.x,
            y: p.y - l.w * 0.25,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - l.w * 0.4,
            life: 0.5,
            size: l.w * 0.06,
            color: base,
          });
        }
        break;
      }
      case "rubble":
        for (let i = 0; i < (still ? 4 : 16); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.w * (0.5 + rand() * 1.4);
          fx.add({
            kind: i % 2 === 0 ? "fur" : "shard",
            x: p.x,
            y: p.y - l.w * 0.2,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - l.w,
            life: 0.7,
            size: l.w * (0.06 + rand() * 0.05),
            color: ART.metal,
            spin: rand() * 6,
          });
        }
        break;
      case "hit":
        if (e.shot === "zap") {
          fx.add({
            kind: "flash",
            x: p.x,
            y: p.y - l.w * 0.3,
            vx: 0,
            vy: 0,
            life: 0.25,
            size: l.w * 0.5,
            color: ART.bulb,
          });
        }
        for (let i = 0; i < (still ? 1 : 4); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.w * 2;
          fx.add({
            kind: "spark",
            x: p.x,
            y: p.y - l.w * 0.3,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.22,
            size: l.w * 0.04,
            color: e.shot === "puff" ? ART.ice : ART.spark,
          });
        }
        break;
      case "fire":
        if (e.shot === "zap") {
          fx.add({
            kind: "flash",
            x: p.x,
            y: p.y - l.w * 1.1,
            vx: 0,
            vy: 0,
            life: 0.2,
            size: l.w * 0.45,
            color: ART.bulb,
          });
        }
        break;
    }
  }
}

// Confetti and a few words over a finished job; fireworks for the head
// office.
export function celebrate(
  fx: Fx,
  l: Layout,
  at: { col: number; row: number; size: number },
  text: string,
  big: boolean,
  still: boolean,
) {
  const p = px(l, at.col + at.size / 2, at.row + at.size / 2);
  const colors = [ART.gold, ART.magenta, ART.cyan, ART.hopper, ART.white];
  const count = still ? 6 : big ? 70 : 26;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = still
      ? 0
      : l.w * (big ? 2 + Math.random() * 3 : 1 + Math.random() * 2);
    fx.add({
      kind: big && i % 3 === 0 ? "star" : "shard",
      x: p.x,
      y: p.y - l.w * (big ? 1.2 : 0.6),
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - l.w * 1.5,
      life: big ? 1.4 : 0.9,
      size: l.w * (big ? 0.07 : 0.05),
      color: colors[i % colors.length] ?? ART.gold,
      spin: Math.random() * 6,
    });
  }
  if (big && !still) {
    for (let k = 0; k < 3; k++) {
      fx.add({
        kind: "ring",
        x: p.x,
        y: p.y - l.w,
        vx: 0,
        vy: 0,
        life: 0.7 + k * 0.25,
        size: l.w * (1 + k),
        color: ART.gold,
      });
    }
  }
  fx.add({
    kind: "text",
    x: p.x,
    y: p.y - l.w * (big ? 1.8 : 1.1),
    vx: 0,
    vy: still ? 0 : -l.w * 0.4,
    life: big ? 2 : 1.3,
    size: l.w * (big ? 0.36 : 0.26),
    color: ART.gold,
    text,
  });
}

// A single building, for the build menu.
export function drawBuildingPortrait(
  ctx: CanvasRenderingContext2D,
  kind: BuildingKind,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  const big = BUILDINGS[kind].size === 2;
  const tile = big ? Math.min(w * 0.48, h * 0.42) : Math.min(w * 0.85, h * 0.7);
  ctx.save();
  // A patch of grass to stand on.
  ellipse(
    ctx,
    w / 2,
    h * 0.8,
    tile * (big ? 1 : 0.5),
    tile * (big ? 0.5 : 0.25),
  );
  ctx.fillStyle = hsl({ h: 98, s: 52, l: 50 }, 0, 0.9);
  ctx.fill();
  ctx.restore();
  drawBuilding(ctx, kind, w / 2, h * 0.8, tile, STANDING);
}

export function readyToCollect(b: Building, now: number) {
  return stored(b, now) >= 10;
}
