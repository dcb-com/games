import type { Ctx } from "~/games/art/color";
import { ART, ellipse, hsl, rounded, shadeDown } from "~/games/art/color";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import {
  Bonus,
  H,
  W,
  critterAt,
  drawDot,
  near,
} from "~/games/desk-defense/bonus/kit";
import type { CritterKind } from "~/games/desk-defense/units";

// Dot's Dash: Dot rolls along the desk, faster and faster. Jump over the
// critters (press again in the air for a second jump) and grab the gold
// orbs. Three bumps and the run is over.

interface Thing {
  kind: CritterKind | "orb";
  x: number;
  // Height above the desk.
  lift: number;
  done: boolean;
}

const GROUND = H - 46;
const DOT_X = 96;

export class Dash extends Bonus {
  readonly id = "dash";
  readonly seconds = 45;
  protected lives = 3;
  private y = 0;
  private vy = 0;
  private jumps = 0;
  private distance = 0;
  private things: Thing[] = [];
  private next = 1.2;

  private get speed() {
    return 230 + this.time * 4.5;
  }

  protected play(dt: number, _input: Input) {
    const speed = this.speed;
    this.distance += speed * dt;
    this.vy -= 1500 * dt;
    this.y = Math.max(0, this.y + this.vy * dt);
    if (this.y === 0) {
      this.vy = 0;
      this.jumps = 0;
    }

    this.next -= dt;
    if (this.next <= 0) {
      this.next = 0.9 + Math.random() * 0.9 - Math.min(0.5, this.time / 90);
      const roll = Math.random();
      if (roll < 0.25) {
        this.things.push({
          kind: "orb",
          x: W + 30,
          lift: 40 + Math.random() * 90,
          done: false,
        });
      } else {
        const kind: CritterKind =
          roll < 0.45 ? "zippy" : roll < 0.6 ? "chonk" : "fuzzball";
        this.things.push({ kind, x: W + 30, lift: 0, done: false });
      }
    }
    for (const t of this.things) t.x -= speed * dt;

    for (const t of this.things) {
      if (t.done) continue;
      if (t.kind === "orb") {
        if (near(t.x, GROUND - t.lift, DOT_X, GROUND - this.y - 20, 28)) {
          t.done = true;
          this.score += 5;
          this.pop(t.x, GROUND - t.lift - 20, "+5", ART.gold);
        }
        continue;
      }
      const tall = t.kind === "chonk" ? 46 : 34;
      const wide = t.kind === "chonk" ? 26 : 18;
      if (Math.abs(t.x - DOT_X) < wide && this.y < tall) {
        // A bump: no points for this one, whether or not a heart is lost.
        t.done = true;
        if (this.hurt()) {
          this.burst(DOT_X, GROUND - 20, ART.stapler);
          this.pop(DOT_X, GROUND - 60, "Bump!", ART.ember);
        }
        continue;
      }
      // Cleared it: two points for every critter jumped.
      if (t.x < DOT_X - wide) {
        t.done = true;
        this.score += 2;
      }
    }
    this.things = this.things.filter(
      (t) => t.x > -40 && !(t.kind === "orb" && t.done),
    );
    this.score = Math.max(this.score, 0);
  }

  press(key: Key) {
    if ((key === "action" || key === "up") && this.jumps < 2) {
      this.vy = this.jumps === 0 ? 560 : 480;
      this.jumps += 1;
    }
  }

  point(_x: number, _y: number, down: boolean) {
    if (down) this.press("action");
  }

  protected scene(ctx: Ctx, view: BonusView) {
    // The desk edge, scrolling by.
    rounded(ctx, -10, GROUND, W + 20, H - GROUND + 10, 0);
    shadeDown(ctx, ART.wood, GROUND, H, 6, -20);
    ctx.strokeStyle = hsl(ART.wood, -22, 0.6);
    ctx.lineWidth = 2;
    const offset = this.distance % 60;
    for (let x = -offset; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 14);
      ctx.lineTo(x + 30, GROUND + 14);
      ctx.stroke();
    }
    for (const t of this.things) {
      if (t.kind === "orb") {
        const y = GROUND - t.lift;
        const g = ctx.createRadialGradient(t.x, y, 0, t.x, y, 14);
        g.addColorStop(0, hsl(ART.white, 0, 0.95));
        g.addColorStop(0.4, hsl(ART.gold, 10, 0.95));
        g.addColorStop(1, hsl(ART.gold, 10, 0));
        ctx.fillStyle = g;
        ellipse(ctx, t.x, y, 14, 14);
        ctx.fill();
        continue;
      }
      critterAt(ctx, t.kind, t.x, GROUND, t.kind === "chonk" ? 56 : 44, view);
    }
    const blink = this.hurtFor > 0 && Math.floor(this.hurtFor * 10) % 2 === 0;
    if (!blink)
      drawDot(ctx, DOT_X, GROUND - this.y, 54, view.t * 1.5, view.still);
  }
}
