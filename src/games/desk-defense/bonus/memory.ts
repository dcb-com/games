import type { Ctx } from "~/games/art/color";
import { ART, hsl, outline, rounded, shadeDown } from "~/games/art/color";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, W, critterAt } from "~/games/desk-defense/bonus/kit";
import type { Theme } from "~/games/desk-defense/levels";
import type { CritterKind } from "~/games/desk-defense/units";

// Sticky Memory: twelve sticky notes, face down, hide six pairs of
// critters. Turn two at a time; a pair stays up. Clear the board before the
// clock runs out, and every second left is worth points.

interface Card {
  kind: CritterKind;
  up: boolean;
  matched: boolean;
  // 0 face down, 1 face up; it turns over in between.
  turn: number;
}

const COLS = 4;
const ROWS = 3;
const KINDS: CritterKind[] = [
  "fuzzball",
  "zippy",
  "chonk",
  "splitter",
  "hopper",
  "shellby",
];

function cardAt(i: number) {
  return {
    x: W / 2 + ((i % COLS) - 1.5) * 108,
    y: 102 + Math.floor(i / COLS) * 84,
  };
}

export class Memory extends Bonus {
  readonly id = "memory";
  readonly seconds = 60;
  private cards: Card[];
  private cursor = 0;
  private open: number[] = [];
  // Seconds until a wrong pair turns back over.
  private wait = 0;

  constructor(theme: Theme) {
    super(theme);
    const deck = [...KINDS, ...KINDS];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = deck[i];
      const b = deck[j];
      if (a && b) {
        deck[i] = b;
        deck[j] = a;
      }
    }
    this.cards = deck.map((kind) => ({
      kind,
      up: false,
      matched: false,
      turn: 0,
    }));
  }

  protected play(dt: number, _input: Input) {
    for (const c of this.cards) {
      const goal = c.up || c.matched ? 1 : 0;
      c.turn +=
        Math.sign(goal - c.turn) * Math.min(Math.abs(goal - c.turn), dt * 6);
    }
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) {
        for (const i of this.open) {
          const c = this.cards[i];
          if (c) c.up = false;
        }
        this.open = [];
      }
    }
    if (this.cards.every((c) => c.matched)) {
      // A clear board ends the game, with a bonus for the time left.
      this.score += Math.floor(this.seconds - this.time) * 2;
      this.over = true;
    }
  }

  press(key: Key) {
    if (key === "left" && this.cursor % COLS > 0) this.cursor -= 1;
    if (key === "right" && this.cursor % COLS < COLS - 1) this.cursor += 1;
    if (key === "up" && this.cursor >= COLS) this.cursor -= COLS;
    if (key === "down" && this.cursor < COLS * (ROWS - 1)) this.cursor += COLS;
    if (key === "action") this.flip(this.cursor);
  }

  point(x: number, y: number, down: boolean) {
    for (let i = 0; i < this.cards.length; i++) {
      const p = cardAt(i);
      if (Math.abs(x - p.x) < 48 && Math.abs(y - p.y) < 36) {
        this.cursor = i;
        if (down) this.flip(i);
        return;
      }
    }
  }

  private flip(i: number) {
    const c = this.cards[i];
    if (!c || c.up || c.matched || this.wait > 0) return;
    c.up = true;
    this.open.push(i);
    if (this.open.length < 2) return;
    const [a, b] = this.open.map((n) => this.cards[n]);
    if (a && b && a.kind === b.kind) {
      a.matched = true;
      b.matched = true;
      this.open = [];
      this.score += 10;
      const p = cardAt(i);
      this.pop(p.x, p.y - 40, "+10 Pair!", ART.gold);
      this.burst(p.x, p.y, ART.note);
    } else {
      this.wait = 0.7;
    }
  }

  protected scene(ctx: Ctx, view: BonusView) {
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (!c) continue;
      const p = cardAt(i);
      // A card turns by squashing to a line and back.
      const face = c.turn > 0.5;
      const squeeze = Math.abs(c.turn - 0.5) * 2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((i % 3) - 1) * 0.03);
      ctx.scale(Math.max(0.04, squeeze), 1);
      rounded(ctx, -46, -34, 92, 68, 6);
      if (face) {
        ctx.fillStyle = hsl(
          c.matched ? ART.hopper : ART.white,
          c.matched ? 30 : 0,
        );
      } else {
        shadeDown(ctx, ART.note, -34, 34, 8, -10);
      }
      ctx.fill();
      outline(ctx, 2, ART.ink, 0.4);
      if (face) critterAt(ctx, c.kind, 0, 26, 50, view);
      else {
        ctx.fillStyle = hsl(ART.note, -30);
        ctx.font = `800 26px ${view.font}`;
        ctx.textAlign = "center";
        ctx.fillText("?", 0, 10);
      }
      ctx.restore();
      if (i === this.cursor) {
        rounded(ctx, p.x - 52, p.y - 40, 104, 80, 9);
        ctx.strokeStyle = hsl(ART.white);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
}
