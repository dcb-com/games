import type { Ctx } from "~/games/art/color";
import { ART, hsl, outline, rounded, shadeDown } from "~/games/art/color";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, H, W, critterAt, pick } from "~/games/desk-defense/bonus/kit";
import type { CritterKind } from "~/games/desk-defense/units";

// Critter Sort: critters slide down the chute one at a time. Flick each one
// left or right into the bin with its picture. The bins swap now and then,
// and the chute gets faster.

interface Falling {
  kind: CritterKind;
  y: number;
  // Once sorted, it flies off toward a side.
  fly: -1 | 0 | 1;
  fx: number;
}

const KINDS: CritterKind[] = [
  "fuzzball",
  "zippy",
  "chonk",
  "hopper",
  "splitter",
  "shellby",
];
const LINE = H - 70;

export class Sort extends Bonus {
  readonly id = "sort";
  readonly seconds = 45;
  private bins: [CritterKind, CritterKind] = ["fuzzball", "zippy"];
  private current: Falling | null = null;
  private flying: Falling[] = [];
  private swapIn = 12;
  private combo = 0;

  private nextCritter() {
    const kind = Math.random() < 0.5 ? this.bins[0] : this.bins[1];
    this.current = { kind, y: 40, fly: 0, fx: W / 2 };
  }

  protected play(dt: number, _input: Input) {
    this.swapIn -= dt;
    if (this.swapIn <= 0) {
      this.swapIn = 12;
      const others = KINDS.filter((k) => !this.bins.includes(k));
      const a = others[pick(others.length)] ?? "chonk";
      const rest = others.filter((k) => k !== a);
      const b = rest[pick(rest.length)] ?? "hopper";
      this.bins = [a, b];
      this.current = null;
      this.pop(W / 2, 80, "New bins!", ART.white);
    }
    if (!this.current) this.nextCritter();
    const c = this.current;
    if (c) {
      c.y += (90 + this.time * 3.5) * dt;
      if (c.y >= LINE) {
        // Not sorted in time.
        this.combo = 0;
        this.pop(W / 2, LINE - 30, "Missed", ART.ember);
        this.current = null;
      }
    }
    for (const f of this.flying) {
      f.fx += f.fly * 600 * dt;
      f.y += 120 * dt;
    }
    this.flying = this.flying.filter((f) => f.fx > -60 && f.fx < W + 60);
  }

  press(key: Key) {
    if (key === "left") this.flick(-1);
    if (key === "right") this.flick(1);
  }

  point(x: number, _y: number, down: boolean) {
    if (down) this.flick(x < W / 2 ? -1 : 1);
  }

  private flick(side: -1 | 1) {
    const c = this.current;
    if (!c) return;
    const bin = side < 0 ? this.bins[0] : this.bins[1];
    if (c.kind === bin) {
      this.combo += 1;
      const points = this.combo >= 5 ? 2 : 1;
      this.score += points;
      this.pop(
        side < 0 ? 90 : W - 90,
        LINE - 70,
        this.combo >= 5 ? `+2 x${this.combo}` : "+1",
        ART.gold,
      );
    } else {
      this.combo = 0;
      this.score = Math.max(0, this.score - 1);
      this.pop(side < 0 ? 90 : W - 90, LINE - 70, "Wrong bin", ART.ember);
    }
    this.flying.push({ ...c, fly: side });
    this.current = null;
  }

  protected scene(ctx: Ctx, view: BonusView) {
    // The chute.
    rounded(ctx, W / 2 - 46, 30, 92, LINE - 10, 14);
    shadeDown(ctx, ART.metal, 30, LINE, 18, -14);
    outline(ctx, 2, ART.ink, 0.5);
    // Two bins, each showing what goes in it.
    this.bins.forEach((kind, i) => {
      const x = i === 0 ? 90 : W - 90;
      rounded(ctx, x - 66, LINE - 40, 132, 96, 14);
      shadeDown(
        ctx,
        i === 0 ? ART.coffee : ART.fan,
        LINE - 40,
        LINE + 56,
        14,
        -16,
      );
      outline(ctx, 2, ART.ink, 0.6);
      critterAt(ctx, kind, x, LINE + 30, 58, view);
      ctx.fillStyle = hsl(ART.white);
      ctx.font = `800 14px ${view.font}`;
      ctx.textAlign = "center";
      ctx.fillText(i === 0 ? "◀" : "▶", x, LINE - 22);
    });
    const c = this.current;
    if (c) critterAt(ctx, c.kind, W / 2, c.y + 20, 56, view);
    for (const f of this.flying)
      critterAt(ctx, f.kind, f.fx, f.y + 20, 50, view, { hop: { t: 0.5 } });
  }
}
