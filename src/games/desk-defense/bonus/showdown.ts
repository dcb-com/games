import type { Ctx } from "~/games/art/color";
import { ART, hsl, rounded } from "~/games/art/color";
import { RESTING, drawHelper } from "~/games/art/helpers";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import {
  Bonus,
  H,
  W,
  critterAt,
  drawDot,
  near,
} from "~/games/desk-defense/bonus/kit";

// Grumble Showdown: the last bonus game. Grumble paces along the top of the
// screen throwing crowns and fuzzballs. Dot rolls along the bottom with a
// stapler: dodge, and staple him back. At half health he gets angry and
// throws faster.

interface Falling {
  kind: "crown" | "fuzz";
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const FLOOR = H - 22;
const BOSS_Y = 152;
const BOSS_HP = 60;

export class Showdown extends Bonus {
  readonly id = "showdown";
  readonly seconds = 60;
  protected lives = 3;
  private x = W / 2;
  private target: number | null = null;
  private boss = { x: W / 2, dir: 1, hp: BOSS_HP, flash: 0 };
  private staples: { x: number; y: number }[] = [];
  private falling: Falling[] = [];
  private reload = 0;
  private throwIn = 1.5;
  private won = false;

  protected play(dt: number, input: Input) {
    const speed = 300;
    if (input.held.has("left") || input.held.has("right")) this.target = null;
    if (input.held.has("left")) this.x -= speed * dt;
    if (input.held.has("right")) this.x += speed * dt;
    if (this.target !== null) {
      const d = this.target - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), speed * 1.3 * dt);
    }
    this.x = Math.max(30, Math.min(W - 30, this.x));
    this.reload = Math.max(0, this.reload - dt);
    if (input.held.has("action")) this.fire();

    const angry = this.boss.hp <= BOSS_HP / 2;
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    this.boss.x += this.boss.dir * (angry ? 150 : 100) * dt;
    if (this.boss.x < 70 || this.boss.x > W - 70) this.boss.dir *= -1;

    this.throwIn -= dt;
    if (this.throwIn <= 0) {
      this.throwIn = angry ? 0.55 : 0.95;
      const aim = (this.x - this.boss.x) / 1.6;
      this.falling.push({
        kind: Math.random() < 0.6 ? "crown" : "fuzz",
        x: this.boss.x,
        y: 130,
        vx: aim * (0.4 + Math.random() * 0.6),
        vy: 150 + Math.random() * 60,
      });
    }

    for (const s of this.staples) s.y -= 480 * dt;
    for (const s of this.staples) {
      if (near(s.x, s.y, this.boss.x, BOSS_Y - 40, 44)) {
        s.y = -100;
        this.boss.hp -= 1;
        this.boss.flash = 0.08;
        this.score += 5;
        if (this.boss.hp === Math.floor(BOSS_HP / 2))
          this.pop(this.boss.x, BOSS_Y - 20, "ROAR!", ART.grumble);
      }
    }
    this.staples = this.staples.filter((s) => s.y > -20);

    for (const f of this.falling) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 120 * dt;
    }
    for (const f of this.falling) {
      if (near(f.x, f.y, this.x, FLOOR - 26, 26) && this.hurt()) {
        f.y = H + 100;
        this.burst(this.x, FLOOR - 20, ART.stapler);
        this.pop(this.x, FLOOR - 50, "Ouch!", ART.ember);
      }
    }
    this.falling = this.falling.filter((f) => f.y < H + 30);

    if (this.boss.hp <= 0 && !this.won) {
      this.won = true;
      this.score += 200 + Math.floor(this.seconds - this.time) * 5;
      this.burst(this.boss.x, BOSS_Y - 40, ART.grumble, 40);
      this.pop(this.boss.x, BOSS_Y - 40, "You beat Grumble!", ART.gold);
      this.over = true;
    }
  }

  private fire() {
    if (this.reload > 0) return;
    this.reload = 0.22;
    this.staples.push({ x: this.x + 14, y: FLOOR - 70 });
  }

  press(key: Key) {
    if (key === "action") this.fire();
  }

  point(x: number, _y: number, down: boolean) {
    this.target = x;
    if (down) this.fire();
  }

  protected scene(ctx: Ctx, view: BonusView) {
    // Grumble, with his health above him.
    critterAt(ctx, "grumble", this.boss.x, BOSS_Y, 92, view, {
      flash: this.boss.flash,
      chewing: true,
      facing: this.boss.dir > 0 ? 1 : -1,
    });
    rounded(ctx, W / 2 - 100, 44, 200, 8, 4);
    ctx.fillStyle = hsl(ART.ink, 0, 0.5);
    ctx.fill();
    rounded(
      ctx,
      W / 2 - 100,
      44,
      200 * Math.max(0, this.boss.hp / BOSS_HP),
      8,
      4,
    );
    ctx.fillStyle = hsl(ART.grumble, 5);
    ctx.fill();

    for (const f of this.falling) {
      if (f.kind === "fuzz") {
        critterAt(ctx, "fuzzball", f.x, f.y + 12, 30, view);
        continue;
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(view.t * 6);
      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-5, 2);
      ctx.lineTo(0, -8);
      ctx.lineTo(5, 2);
      ctx.lineTo(10, -4);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fillStyle = hsl(ART.gold, 8);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = hsl(ART.gold, 5);
    ctx.lineWidth = 3;
    for (const s of this.staples) {
      ctx.beginPath();
      ctx.moveTo(s.x - 5, s.y + 6);
      ctx.lineTo(s.x - 5, s.y - 6);
      ctx.lineTo(s.x + 5, s.y - 6);
      ctx.lineTo(s.x + 5, s.y + 6);
      ctx.stroke();
    }
    const blink = this.hurtFor > 0 && Math.floor(this.hurtFor * 10) % 2 === 0;
    if (!blink) {
      drawDot(ctx, this.x, FLOOR, 54, view.t, view.still);
      // The stapler Dot holds up over its head.
      ctx.save();
      ctx.translate(this.x + 14, FLOOR - 58);
      ctx.rotate(-Math.PI / 2);
      drawHelper(
        ctx,
        "stapler",
        0,
        0,
        30,
        { ...RESTING, t: view.t, still: view.still },
        false,
      );
      ctx.restore();
    }
  }
}
