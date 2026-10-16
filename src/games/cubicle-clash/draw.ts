import { ART, ellipse, hsl, rounded } from "~/games/art/color";
import type { Pose } from "~/games/art/critters";
import { drawCritter } from "~/games/art/critters";
import type { Fx } from "~/games/art/fx";
import { furSpec } from "~/games/art/fur";
import type { BuildingLook } from "~/games/cubicle-clash/art";
import {
  STANDING,
  drawBuilding,
  drawFloor,
  drawRubble,
} from "~/games/cubicle-clash/art";
import type { Base, Building } from "~/games/cubicle-clash/base";
import { stored } from "~/games/cubicle-clash/base";
import type { Raid, RaidEvent, Shot } from "~/games/cubicle-clash/raid";
import { canDrop } from "~/games/cubicle-clash/raid";
import type { BuildingKind } from "~/games/cubicle-clash/units";
import { BUILDINGS, COLS, ROWS, holds } from "~/games/cubicle-clash/units";

// Draws Cubicle Clash: a base from above, with buildings standing up on
// their tiles, and during a raid the troops, shots and effects. The bars
// above and below the field are React, not canvas, so they take the theme.

// The height of those bars, in pixels: h-7.5 in cubicle-clash.tsx.
const BAR = 30;

export interface Layout {
  width: number;
  height: number;
  tile: number;
  ox: number;
  oy: number;
}

export function layout(width: number, height: number): Layout {
  const tile = Math.min(width / COLS, (height - BAR * 2) / ROWS);
  return {
    width,
    height,
    tile,
    ox: (width - tile * COLS) / 2,
    oy: BAR + (height - BAR * 2 - tile * ROWS) / 2,
  };
}

export function cellAt(l: Layout, x: number, y: number) {
  const col = Math.floor((x - l.ox) / l.tile);
  const row = Math.floor((y - l.oy) / l.tile);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
  return { col, row };
}

// A spot in tiles, as canvas pixels.
export function px(l: Layout, x: number, y: number) {
  return { x: l.ox + x * l.tile, y: l.oy + y * l.tile };
}

function cursorBox(
  l: Layout,
  col: number,
  row: number,
  size: number,
  ok: boolean,
) {
  return {
    x: l.ox + col * l.tile,
    y: l.oy + row * l.tile,
    w: size * l.tile,
    h: size * l.tile,
    ok,
  };
}

function strokeCursor(
  ctx: CanvasRenderingContext2D,
  box: ReturnType<typeof cursorBox>,
) {
  rounded(ctx, box.x + 1.5, box.y + 1.5, box.w - 3, box.h - 3, 6);
  ctx.fillStyle = hsl(box.ok ? ART.white : ART.ember, 0, 0.22);
  ctx.fill();
  ctx.strokeStyle = box.ok ? hsl(ART.white, 0, 0.95) : hsl(ART.ember, 5);
  ctx.lineWidth = 2;
  ctx.stroke();
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
  return { left: wallAt(b.col - 1, b.row), right: wallAt(b.col + 1, b.row) };
}

// A little speech bubble over a press or coffee maker that is ready.
function readyBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  coins: boolean,
  t: number,
) {
  const bob = Math.sin(t * 3) * s * 0.04;
  ellipse(ctx, x, y + bob, s * 0.2, s * 0.17);
  ctx.fillStyle = hsl(ART.white, 0, 0.95);
  ctx.fill();
  ctx.strokeStyle = hsl(ART.ink, 0, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ellipse(ctx, x, y + bob, s * 0.1, s * 0.1);
  ctx.fillStyle = coins ? hsl(ART.gold, 5) : hsl(ART.brew, 10);
  ctx.fill();
}

export interface VillageView {
  t: number;
  still: boolean;
  now: number;
  cursor: { col: number; row: number } | null;
  // A building being placed or moved, and whether it fits there.
  ghost: { kind: BuildingKind; level: number; ok: boolean } | null;
  selected: number | null;
  fx: Fx;
  font: string;
}

export function drawVillage(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  base: Base,
  view: VillageView,
) {
  ctx.clearRect(0, 0, l.width, l.height);
  drawFloor(ctx, l.ox, l.oy, l.tile, COLS, ROWS);

  const chosen = base.buildings.find((b) => b.id === view.selected);
  if (chosen && BUILDINGS[chosen.kind].range > 0) {
    const c = px(l, chosen.col + 0.5, chosen.row + 0.5);
    ellipse(
      ctx,
      c.x,
      c.y,
      BUILDINGS[chosen.kind].range * l.tile,
      BUILDINGS[chosen.kind].range * l.tile,
    );
    ctx.fillStyle = hsl(ART.white, 0, 0.12);
    ctx.fill();
    ctx.strokeStyle = hsl(ART.white, 0, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const sorted = [...base.buildings].sort(
    (a, b) => a.row + BUILDINGS[a.kind].size - (b.row + BUILDINGS[b.kind].size),
  );
  for (const b of sorted) {
    const size = BUILDINGS[b.kind].size;
    const foot = px(l, b.col + size / 2, b.row + size);
    const isChosen = b.id === view.selected;
    if (isChosen) {
      const box = cursorBox(l, b.col, b.row, size, true);
      rounded(ctx, box.x + 1, box.y + 1, box.w - 2, box.h - 2, 6);
      ctx.fillStyle = hsl(ART.gold, 10, 0.3);
      ctx.fill();
    }
    if (isChosen && view.ghost) ctx.globalAlpha = 0.35;
    const have = stored(b, view.now);
    const look: BuildingLook = {
      ...STANDING,
      t: view.t,
      still: view.still,
      level: b.level,
      full:
        b.kind === "press" || b.kind === "coffee" ? have / holds(b.level) : 0.5,
    };
    drawBuilding(
      ctx,
      b.kind,
      foot.x,
      foot.y - l.tile * 0.06,
      l.tile,
      look,
      wallLinks(base.buildings, b),
    );
    ctx.globalAlpha = 1;
    if ((b.kind === "press" || b.kind === "coffee") && have >= 10) {
      readyBubble(
        ctx,
        foot.x + l.tile * 0.2,
        foot.y - l.tile * 1.15,
        l.tile,
        b.kind === "press",
        view.t,
      );
    }
  }

  if (view.cursor) {
    const size = view.ghost ? BUILDINGS[view.ghost.kind].size : 1;
    const box = cursorBox(
      l,
      view.cursor.col,
      view.cursor.row,
      size,
      view.ghost?.ok ?? true,
    );
    if (view.ghost) {
      ctx.globalAlpha = 0.6;
      const foot = px(l, view.cursor.col + size / 2, view.cursor.row + size);
      drawBuilding(
        ctx,
        view.ghost.kind,
        foot.x,
        foot.y - l.tile * 0.06,
        l.tile,
        {
          ...STANDING,
          level: view.ghost.level,
        },
      );
      ctx.globalAlpha = 1;
    }
    strokeCursor(ctx, box);
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
  const u = l.tile / 10;
  if (s.kind === "staple") {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(s.ty - s.y, s.tx - s.x));
    ctx.strokeStyle = hsl(ART.metal, -12);
    ctx.lineWidth = u * 0.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-u * 0.9, -u * 0.7);
    ctx.lineTo(u * 0.9, -u * 0.7);
    ctx.lineTo(u * 0.9, u * 0.7);
    ctx.lineTo(-u * 0.9, u * 0.7);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (s.kind === "puff") {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, u * 2);
    g.addColorStop(0, hsl(ART.white, 0, 0.95));
    g.addColorStop(1, hsl(ART.ice, 0, 0));
    ctx.fillStyle = g;
    ellipse(ctx, p.x, p.y, u * 2, u * 2);
    ctx.fill();
    return;
  }
  // A paper plane, banking toward its target.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(
    Math.atan2(s.ty - s.y, s.tx - s.x) + Math.sin(t * 9 + s.id) * 0.15,
  );
  ctx.beginPath();
  ctx.moveTo(u * 2.2, 0);
  ctx.lineTo(-u * 1.8, -u * 1.4);
  ctx.lineTo(-u * 1, 0);
  ctx.lineTo(-u * 1.8, u * 1);
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
  drawFloor(ctx, l.ox, l.oy, l.tile, COLS, ROWS);

  // Where troops may not land, shown while the player is choosing.
  if (view.showCursor) {
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (canDrop(r, col, row)) continue;
        ctx.fillStyle = hsl(ART.ember, 0, 0.1);
        ctx.fillRect(l.ox + col * l.tile, l.oy + row * l.tile, l.tile, l.tile);
      }
    }
    const { col, row } = r.cursor;
    strokeCursor(ctx, cursorBox(l, col, row, 1, canDrop(r, col, row)));
  }

  // Buildings and troops together, back to front.
  interface Item {
    y: number;
    draw: () => void;
  }
  const items: Item[] = [];
  for (const t of r.targets) {
    const foot = px(l, t.col + t.size / 2, t.row + t.size);
    items.push({
      y: t.row + t.size,
      draw: () => {
        if (t.down) {
          drawRubble(
            ctx,
            foot.x,
            foot.y - l.tile * 0.1,
            l.tile * t.size * 0.8,
            t.id,
          );
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
              facing = troop.x >= t.col + 0.5 ? 1 : -1;
            }
          }
        }
        drawBuilding(
          ctx,
          t.kind,
          foot.x,
          foot.y - l.tile * 0.06,
          l.tile,
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
          foot.x - l.tile * 0.35,
          foot.y - l.tile * (t.size + 0.05),
          l.tile * 0.7,
          t.hp / t.maxHp,
          true,
        );
      },
    });
  }
  for (const troop of r.troops) {
    const p = px(l, troop.x, troop.y);
    const s = l.tile * 0.9;
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
      facing: troop.facing,
    };
    items.push({
      y: troop.y,
      draw: () => {
        drawCritter(ctx, pose, p.x, p.y - s * 0.32, s, {
          t: view.t,
          still: view.still,
          ratio: view.ratio,
        });
        bar(
          ctx,
          p.x - s * 0.25,
          p.y - s * 0.95,
          s * 0.5,
          troop.hp / troop.maxHp,
          false,
        );
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
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
          size: l.tile * 0.7,
          color: ART.white,
        });
        break;
      case "poof": {
        const base = furSpec(e.kind).base;
        for (let i = 0; i < (still ? 5 : 12); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.tile * (0.6 + rand());
          fx.add({
            kind: "fur",
            x: p.x,
            y: p.y - l.tile * 0.3,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - l.tile * 0.4,
            life: 0.5,
            size: l.tile * 0.08,
            color: base,
          });
        }
        break;
      }
      case "rubble":
        for (let i = 0; i < (still ? 4 : 14); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.tile * (0.5 + rand() * 1.4);
          fx.add({
            kind: i % 2 === 0 ? "fur" : "shard",
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - l.tile,
            life: 0.7,
            size: l.tile * (0.08 + rand() * 0.06),
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
            y: p.y - l.tile * 0.3,
            vx: 0,
            vy: 0,
            life: 0.25,
            size: l.tile * 0.6,
            color: ART.bulb,
          });
        }
        for (let i = 0; i < (still ? 1 : 4); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : l.tile * 2;
          fx.add({
            kind: "spark",
            x: p.x,
            y: p.y - l.tile * 0.3,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.22,
            size: l.tile * 0.05,
            color: e.shot === "puff" ? ART.ice : ART.spark,
          });
        }
        break;
      case "fire":
        if (e.shot === "zap") {
          fx.add({
            kind: "flash",
            x: p.x,
            y: p.y - l.tile * 0.6,
            vx: 0,
            vy: 0,
            life: 0.2,
            size: l.tile * 0.5,
            color: ART.bulb,
          });
        }
        break;
    }
  }
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
  const tile = big ? Math.min(w, h) * 0.42 : Math.min(w * 0.8, h * 0.62);
  drawBuilding(ctx, kind, w / 2, h * 0.9, tile, STANDING);
}

export function readyToCollect(b: Building, now: number) {
  return stored(b, now) >= 10;
}
