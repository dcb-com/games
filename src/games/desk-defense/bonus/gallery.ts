import type { Ctx } from "~/games/art/color";
import { ART, hsl, rounded, shadeDown } from "~/games/art/color";
import { RESTING, drawHelper } from "~/games/art/helpers";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import {
  Bonus,
  W,
  critterAt,
  drawDot,
  pick,
} from "~/games/desk-defense/bonus/kit";
import type { CritterKind } from "~/games/desk-defense/units";

// Staple Gallery: a shooting gallery. The stapler slides up and down the
// left side; critters trot across five shelves. Chonks take three staples.
// Dot rolls by now and then: do not staple Dot.

interface Target {
  kind: CritterKind | "dot";
  lane: number;
  x: number;
  speed: number;
  hp: number;
  flash: number;
}

interface Staple {
  lane: number;
  x: number;
}

const LANES = 5;
const laneY = (lane: number) => 82 + lane * 50;

export class Gallery extends Bonus {
  readonly id = "gallery";
  readonly seconds = 45;
  private lane = 2;
  private targets: Target[] = [];
  private staples: Staple[] = [];
  private reload = 0;
  private next = 0.5;
  private kick = 99;

  protected play(dt: number, _input: Input) {
    this.reload = Math.max(0, this.reload - dt);
    this.kick += dt;
    this.next -= dt;
    if (this.next <= 0) {
      const pace = this.time / this.seconds;
      this.next = 0.9 - pace * 0.45;
      const roll = Math.random();
      const kind: Target["kind"] =
        roll < 0.1
          ? "dot"
          : roll < 0.25
            ? "chonk"
            : roll < 0.45
              ? "zippy"
              : "fuzzball";
      const fast = kind === "zippy" ? 1.7 : kind === "chonk" ? 0.7 : 1;
      this.targets.push({
        kind,
        lane: pick(LANES),
        x: W + 30,
        speed: (70 + pace * 70) * fast,
        hp: kind === "chonk" ? 3 : 1,
        flash: 0,
      });
    }
    for (const t of this.targets) {
      t.x -= t.speed * dt;
      t.flash = Math.max(0, t.flash - dt);
    }
    for (const s of this.staples) s.x += 520 * dt;

    for (const s of this.staples) {
      const hit = this.targets.find(
        (t) => t.lane === s.lane && t.hp > 0 && Math.abs(t.x - s.x) < 22,
      );
      if (!hit) continue;
      s.x = W + 100;
      hit.hp -= 1;
      hit.flash = 0.1;
      if (hit.kind === "dot") {
        hit.hp = 0;
        this.score = Math.max(0, this.score - 5);
        this.pop(hit.x, laneY(hit.lane) - 40, "-5 Not Dot!", ART.ember);
        continue;
      }
      if (hit.hp <= 0) {
        const points = hit.kind === "chonk" ? 3 : hit.kind === "zippy" ? 2 : 1;
        this.score += points;
        this.burst(
          hit.x,
          laneY(hit.lane) - 20,
          ART[
            hit.kind === "chonk"
              ? "chonk"
              : hit.kind === "zippy"
                ? "zippy"
                : "fuzzball"
          ],
        );
        this.pop(hit.x, laneY(hit.lane) - 40, `+${points}`, ART.gold);
      }
    }
    this.targets = this.targets.filter((t) => t.hp > 0 && t.x > -40);
    this.staples = this.staples.filter((s) => s.x < W + 40);
  }

  press(key: Key) {
    if (key === "up") this.lane = Math.max(0, this.lane - 1);
    if (key === "down") this.lane = Math.min(LANES - 1, this.lane + 1);
    if (key === "action") this.fire();
  }

  point(_x: number, y: number, down: boolean) {
    this.lane = Math.max(0, Math.min(LANES - 1, Math.round((y - 82) / 50)));
    if (down) this.fire();
  }

  private fire() {
    if (this.reload > 0) return;
    this.reload = 0.22;
    this.kick = 0;
    this.staples.push({ lane: this.lane, x: 80 });
  }

  protected scene(ctx: Ctx, view: BonusView) {
    for (let lane = 0; lane < LANES; lane++) {
      const y = laneY(lane);
      rounded(ctx, 30, y + 2, W - 50, 10, 4);
      shadeDown(ctx, ART.wood, y + 2, y + 12, 10, -16);
    }
    for (const t of this.targets) {
      const y = laneY(t.lane);
      if (t.kind === "dot") drawDot(ctx, t.x, y + 2, 46, view.t, view.still);
      else
        critterAt(ctx, t.kind, t.x, y + 2, t.kind === "chonk" ? 52 : 44, view, {
          flash: t.flash,
        });
    }
    ctx.strokeStyle = hsl(ART.metal, -10);
    ctx.lineWidth = 3;
    for (const s of this.staples) {
      const y = laneY(s.lane) - 16;
      ctx.beginPath();
      ctx.moveTo(s.x - 7, y - 5);
      ctx.lineTo(s.x + 7, y - 5);
      ctx.lineTo(s.x + 7, y + 5);
      ctx.lineTo(s.x - 7, y + 5);
      ctx.stroke();
    }
    const kick = this.kick < 0.2 ? this.kick * 5 : 1;
    drawHelper(ctx, "stapler", 52, laneY(this.lane) - 18, 54, {
      ...RESTING,
      t: view.t,
      still: view.still,
      acted: kick < 1 ? this.kick : 99,
    });
  }
}
