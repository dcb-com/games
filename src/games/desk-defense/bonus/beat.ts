import type { Ctx } from "~/games/art/color";
import { ART, ellipse, hsl, outline, rounded } from "~/games/art/color";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, H, W, critterAt } from "~/games/desk-defense/bonus/kit";
import type { Theme } from "~/games/desk-defense/levels";
import type { CritterKind } from "~/games/desk-defense/units";

// Stamp Beat: a rhythm game with no sound. Critters drop down three lanes
// in time with a pulse. Stamp each one as it reaches the line, with the
// left, down or right arrow. Spot on scores more, and a streak doubles it.

interface Note {
  lane: number;
  // When it should be stamped, in seconds.
  at: number;
  done: boolean;
}

type Lane = 0 | 1 | 2;
const LANE_KEYS: Partial<Record<Key, Lane>> = { left: 0, down: 1, right: 2 };
const LANE_X = [W / 2 - 110, W / 2, W / 2 + 110];
const LANE_KIND: CritterKind[] = ["fuzzball", "zippy", "hopper"];
const LINE = H - 58;
const FALL = 1.6;
const BEAT = 0.5;

export class Beat extends Bonus {
  readonly id = "beat";
  readonly seconds = 40;
  private notes: Note[] = [];
  private combo = 0;
  private stamped: [number, number, number] = [99, 99, 99];

  constructor(theme: Theme) {
    super(theme);
    // A pattern of beats: mostly one note a beat, sometimes two together,
    // with rests, getting busier as the song goes on.
    for (let b = 4; b * BEAT < this.seconds - 2; b++) {
      const at = b * BEAT;
      const busy = at / this.seconds;
      if (Math.random() < 0.15 - busy * 0.1) continue;
      const lane = Math.floor(Math.random() * 3);
      this.notes.push({ lane, at, done: false });
      if (Math.random() < busy * 0.35) {
        this.notes.push({
          lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3,
          at,
          done: false,
        });
      }
      if (Math.random() < busy * 0.5)
        this.notes.push({
          lane: Math.floor(Math.random() * 3),
          at: at + BEAT / 2,
          done: false,
        });
    }
  }

  protected play(dt: number, _input: Input) {
    for (let i = 0; i < 3; i++) this.stamped[i] = (this.stamped[i] ?? 99) + dt;
    for (const n of this.notes) {
      if (!n.done && this.time - n.at > 0.18) {
        n.done = true;
        this.combo = 0;
      }
    }
  }

  press(key: Key) {
    const lane = LANE_KEYS[key];
    if (lane !== undefined) this.stamp(lane);
  }

  point(x: number, _y: number, down: boolean) {
    if (!down) return;
    const lane = x < W / 2 - 55 ? 0 : x > W / 2 + 55 ? 2 : 1;
    this.stamp(lane);
  }

  private stamp(lane: Lane) {
    this.stamped[lane] = 0;
    let best: Note | undefined;
    for (const n of this.notes) {
      if (n.done || n.lane !== lane) continue;
      if (Math.abs(n.at - this.time) > 0.18) continue;
      if (!best || Math.abs(n.at - this.time) < Math.abs(best.at - this.time))
        best = n;
    }
    const x = LANE_X[lane] ?? W / 2;
    if (!best) {
      this.combo = 0;
      return;
    }
    best.done = true;
    const off = Math.abs(best.at - this.time);
    this.combo += 1;
    const base = off < 0.07 ? 3 : 1;
    const points = this.combo >= 10 ? base * 2 : base;
    this.score += points;
    this.pop(
      x,
      LINE - 50,
      off < 0.07 ? "Perfect!" : "Good",
      off < 0.07 ? ART.gold : ART.white,
    );
    this.burst(
      x,
      LINE - 10,
      ART[
        LANE_KIND[lane] === "zippy"
          ? "zippy"
          : LANE_KIND[lane] === "hopper"
            ? "hopper"
            : "fuzzball"
      ],
      8,
    );
  }

  protected scene(ctx: Ctx, view: BonusView) {
    // The pulse: the whole stage breathes on the beat.
    const pulse = view.still
      ? 0
      : Math.max(0, 1 - ((this.time % BEAT) / BEAT) * 3);
    for (let lane = 0; lane < 3; lane++) {
      const x = LANE_X[lane] ?? W / 2;
      rounded(ctx, x - 44, 44, 88, H - 60, 16);
      ctx.fillStyle = hsl(ART.ink, 0, 0.18 + pulse * 0.08);
      ctx.fill();
      // The stamp pad on the line.
      const press = (this.stamped[lane] ?? 99) < 0.12 ? 1 : 0;
      ellipse(ctx, x, LINE, 38 + press * 4, 14);
      ctx.fillStyle = hsl(ART.white, 0, 0.35 + press * 0.4);
      ctx.fill();
      outline(ctx, 3, ART.white, 0.8);
      ctx.fillStyle = hsl(ART.white, 0, 0.8);
      ctx.font = `800 16px ${view.font}`;
      ctx.textAlign = "center";
      ctx.fillText(["◀", "▼", "▶"][lane] ?? "", x, LINE + 36);
    }
    for (const n of this.notes) {
      if (n.done) continue;
      const ahead = n.at - this.time;
      if (ahead > FALL || ahead < -0.2) continue;
      const y = LINE - (ahead / FALL) * (LINE - 40);
      critterAt(
        ctx,
        LANE_KIND[n.lane] ?? "fuzzball",
        LANE_X[n.lane] ?? W / 2,
        y + 14,
        40,
        view,
      );
    }
    if (this.combo >= 3) {
      ctx.fillStyle = hsl(ART.gold, 10);
      ctx.font = `800 18px ${view.font}`;
      ctx.textAlign = "center";
      ctx.fillText(
        `Streak ${this.combo}${this.combo >= 10 ? "  x2" : ""}`,
        W / 2,
        30,
      );
    }
  }
}
