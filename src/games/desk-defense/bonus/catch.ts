import type { Ctx } from "~/games/art/color";
import { ART, ellipse, hsl, shade } from "~/games/art/color";
import { RESTING, drawHelper } from "~/games/art/helpers";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, H, W, critterAt } from "~/games/desk-defense/bonus/kit";

// Coffee Catch: coffee beans rain down. Slide the coffee maker left and
// right to catch them; a gold orb is worth five. Fuzzballs fall too: catch
// one and lose a heart.

interface Drop {
  kind: "bean" | "orb" | "fuzz";
  x: number;
  y: number;
  vy: number;
  spin: number;
}

const FLOOR = H - 24;

export class Catch extends Bonus {
  readonly id = "catch";
  readonly seconds = 45;
  private x = W / 2;
  private target: number | null = null;
  private drops: Drop[] = [];
  private next = 0.3;
  protected lives = 3;
  private gulp = 99;

  protected play(dt: number, input: Input) {
    this.gulp += dt;
    const speed = 340;
    if (input.held.has("left")) this.target = null;
    if (input.held.has("right")) this.target = null;
    if (input.held.has("left")) this.x -= speed * dt;
    if (input.held.has("right")) this.x += speed * dt;
    if (this.target !== null) {
      const d = this.target - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), speed * 1.4 * dt);
    }
    this.x = Math.max(40, Math.min(W - 40, this.x));

    this.next -= dt;
    if (this.next <= 0) {
      const pace = this.time / this.seconds;
      this.next = 0.45 - pace * 0.22;
      const roll = Math.random();
      this.drops.push({
        kind: roll < 0.08 ? "orb" : roll < 0.28 + pace * 0.12 ? "fuzz" : "bean",
        x: 30 + Math.random() * (W - 60),
        y: -20,
        vy: 110 + pace * 130 + Math.random() * 40,
        spin: Math.random() * 6,
      });
    }
    for (const d of this.drops) {
      d.y += d.vy * dt;
      d.spin += dt * 4;
    }
    const caught = this.drops.filter(
      (d) =>
        d.y > FLOOR - 48 && d.y < FLOOR - 20 && Math.abs(d.x - this.x) < 34,
    );
    for (const d of caught) {
      d.y = H + 100;
      if (d.kind === "fuzz") {
        if (this.hurt()) {
          this.burst(this.x, FLOOR - 40, ART.fuzzball);
          this.pop(this.x, FLOOR - 70, "Ouch!", ART.ember);
        }
        continue;
      }
      const points = d.kind === "orb" ? 5 : 1;
      this.score += points;
      this.gulp = 0;
      this.pop(this.x, FLOOR - 70, `+${points}`, ART.gold);
    }
    this.drops = this.drops.filter((d) => d.y < H + 30);
  }

  press(_key: Key) {
    // Movement is read from the held keys each step.
  }

  point(x: number) {
    this.target = x;
  }

  protected scene(ctx: Ctx, view: BonusView) {
    for (const d of this.drops) {
      if (d.kind === "fuzz") {
        critterAt(ctx, "fuzzball", d.x, d.y + 14, 34, view);
        continue;
      }
      if (d.kind === "orb") {
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 16);
        g.addColorStop(0, hsl(ART.white, 0, 0.95));
        g.addColorStop(0.4, hsl(ART.gold, 10, 0.95));
        g.addColorStop(1, hsl(ART.gold, 10, 0));
        ctx.fillStyle = g;
        ellipse(ctx, d.x, d.y, 16, 16);
        ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.spin);
      ellipse(ctx, 0, 0, 7, 10);
      shade(ctx, ART.brew, 0, 0, 10, 18, -6);
      ctx.strokeStyle = hsl(ART.brew, -12);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(3, 0, 0, 8);
      ctx.stroke();
      ctx.restore();
    }
    const blink = this.hurtFor > 0 && Math.floor(this.hurtFor * 10) % 2 === 0;
    if (!blink) {
      const squash =
        this.gulp < 0.15 ? 1 - Math.sin((this.gulp / 0.15) * Math.PI) * 0.1 : 1;
      ctx.save();
      ctx.translate(this.x, FLOOR);
      ctx.scale(1 / squash, squash);
      drawHelper(ctx, "coffee", 0, -28, 72, {
        ...RESTING,
        t: view.t,
        still: view.still,
        acted: this.gulp,
      });
      ctx.restore();
    }
  }
}
