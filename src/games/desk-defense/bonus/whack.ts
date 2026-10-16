import type { Ctx } from "~/games/art/color";
import { ART, ellipse, hsl, rounded, shadeDown } from "~/games/art/color";
import { RESTING, drawHelper } from "~/games/art/helpers";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import {
  Bonus,
  H,
  W,
  critterAt,
  near,
  pick,
} from "~/games/desk-defense/bonus/kit";
import type { CritterKind } from "~/games/desk-defense/units";

// Whack-a-Critter: critters pop out of nine desk drawers. Bonk them with
// the big eraser before they duck back in. Zippies are worth more. Leave
// Grumble alone: bonking the boss costs points.

interface Hole {
  kind: CritterKind;
  // Seconds since it popped up, and how long it stays.
  age: number;
  stay: number;
  hit: boolean;
}

const COLS = 3;
const ROWS = 3;

function holeAt(i: number) {
  return {
    x: W / 2 + ((i % COLS) - 1) * 150,
    y: 112 + Math.floor(i / COLS) * 78,
  };
}

export class Whack extends Bonus {
  readonly id = "whack";
  readonly seconds = 40;
  private holes: (Hole | null)[] = Array.from(
    { length: COLS * ROWS },
    () => null,
  );
  private cursor = 4;
  private swing = 99;
  private next = 0.6;

  protected play(dt: number, _input: Input) {
    this.swing += dt;
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (!h) continue;
      h.age += dt;
      if (h.age >= h.stay) this.holes[i] = null;
    }
    this.next -= dt;
    if (this.next <= 0) {
      // Faster and faster as the clock runs down.
      const pace = 1 - this.time / this.seconds;
      this.next = 0.35 + pace * 0.45;
      const free = this.holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
      const at = free[pick(free.length)];
      if (at !== undefined) {
        const roll = Math.random();
        const kind: CritterKind =
          roll < 0.15 ? "grumble" : roll < 0.32 ? "zippy" : "fuzzball";
        this.holes[at] = { kind, age: 0, stay: 0.7 + pace * 0.7, hit: false };
      }
    }
  }

  press(key: Key) {
    if (key === "left" && this.cursor % COLS > 0) this.cursor -= 1;
    if (key === "right" && this.cursor % COLS < COLS - 1) this.cursor += 1;
    if (key === "up" && this.cursor >= COLS) this.cursor -= COLS;
    if (key === "down" && this.cursor < COLS * (ROWS - 1)) this.cursor += COLS;
    if (key === "action") this.bonk();
  }

  point(x: number, y: number, down: boolean) {
    for (let i = 0; i < this.holes.length; i++) {
      const p = holeAt(i);
      if (near(x, y, p.x, p.y - 20, 55)) {
        this.cursor = i;
        if (down) this.bonk();
        return;
      }
    }
  }

  private bonk() {
    this.swing = 0;
    const h = this.holes[this.cursor];
    const p = holeAt(this.cursor);
    if (!h || h.hit || h.age > h.stay - 0.1) {
      this.pop(p.x, p.y - 40, "Miss", ART.white);
      return;
    }
    h.hit = true;
    h.age = Math.max(h.age, h.stay - 0.2);
    if (h.kind === "grumble") {
      this.score = Math.max(0, this.score - 5);
      this.pop(p.x, p.y - 50, "-5 Ouch!", ART.ember);
      return;
    }
    const points = h.kind === "zippy" ? 3 : 1;
    this.score += points;
    this.burst(p.x, p.y - 30, h.kind === "zippy" ? ART.zippy : ART.fuzzball);
    this.pop(p.x, p.y - 50, `+${points}`, ART.gold);
  }

  protected scene(ctx: Ctx, view: BonusView) {
    // A big desk front with nine drawers.
    rounded(ctx, 40, 50, W - 80, H - 62, 18);
    shadeDown(ctx, ART.wood, 50, H, 4, -18);
    for (let i = 0; i < this.holes.length; i++) {
      const p = holeAt(i);
      ellipse(ctx, p.x, p.y, 52, 16);
      ctx.fillStyle = hsl(ART.ink, 4);
      ctx.fill();
      const h = this.holes[i];
      if (h) {
        // Up quickly, down quickly at the end.
        const rise = Math.min(1, h.age / 0.12, (h.stay - h.age) / 0.12);
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.x - 70, p.y - 120, 140, 120);
        ctx.clip();
        critterAt(
          ctx,
          h.kind,
          p.x,
          p.y + 32 - rise * 42,
          h.kind === "grumble" ? 66 : 56,
          view,
          {
            flash: h.hit ? 0.1 : 0,
            stuckFor: h.hit ? 1 : 0,
          },
        );
        ctx.restore();
      }
      // The drawer's front lip, in front of the critter.
      rounded(ctx, p.x - 58, p.y, 116, 22, 6);
      shadeDown(ctx, ART.wood, p.y, p.y + 22, 10, -10);
      rounded(ctx, p.x - 12, p.y + 8, 24, 6, 3);
      ctx.fillStyle = hsl(ART.metal, 10);
      ctx.fill();
    }
    // The eraser, over the chosen drawer, swinging down after a bonk.
    const p = holeAt(this.cursor);
    const swing =
      this.swing < 0.15 ? Math.sin((this.swing / 0.15) * Math.PI) : 0;
    ctx.save();
    ctx.translate(p.x + 34, p.y - 58);
    ctx.rotate(-0.5 + swing * 0.9);
    drawHelper(ctx, "eraser", 0, 0, 58, { ...RESTING, charge: 0 }, false);
    ctx.restore();
  }
}
