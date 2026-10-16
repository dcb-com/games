import type { Ctx } from "~/games/art/color";
import { ART, hsl, outline, rounded, shadeDown } from "~/games/art/color";
import { drawShredder } from "~/games/desk-defense/art/desk";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, critterAt, pick } from "~/games/desk-defense/bonus/kit";

// Shredder Snake: the shredder roams the desk eating paper, and its trail
// of shredded strips grows longer with every sheet. Do not run into the
// edge, your own trail, or a sleeping critter.

interface Spot {
  col: number;
  row: number;
}

const COLS = 21;
const ROWS = 10;
const CELL = 25;
const OX = (560 - COLS * CELL) / 2;
const OY = 46;

type Dir = "left" | "right" | "up" | "down";
const STEP: Record<Dir, Spot> = {
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
};
const BACK: Record<Dir, Dir> = {
  left: "right",
  right: "left",
  up: "down",
  down: "up",
};

export class Snake extends Bonus {
  readonly id = "snake";
  readonly seconds = 60;
  private body: Spot[] = [
    { col: 6, row: 5 },
    { col: 5, row: 5 },
    { col: 4, row: 5 },
  ];
  private dir: Dir = "right";
  // Turns asked for before the next move, so quick presses are not lost.
  private queue: Dir[] = [];
  private wait = 0;
  private paper: Spot = { col: 14, row: 5 };
  private critters: Spot[] = [];

  private taken(s: Spot) {
    return (
      this.body.some((b) => b.col === s.col && b.row === s.row) ||
      this.critters.some((c) => c.col === s.col && c.row === s.row)
    );
  }

  private freeSpot(): Spot {
    for (let i = 0; i < 200; i++) {
      const s = { col: pick(COLS), row: pick(ROWS) };
      if (
        !this.taken(s) &&
        !(s.col === this.paper.col && s.row === this.paper.row)
      )
        return s;
    }
    return { col: 0, row: 0 };
  }

  protected play(dt: number, _input: Input) {
    this.wait -= dt;
    if (this.wait > 0) return;
    // A little faster with every sheet eaten.
    this.wait = Math.max(0.075, 0.15 - this.score * 0.003);
    const turn = this.queue.shift();
    if (turn && turn !== BACK[this.dir]) this.dir = turn;
    const head = this.body[0];
    if (!head) return;
    const step = STEP[this.dir];
    const next = { col: head.col + step.col, row: head.row + step.row };
    const out =
      next.col < 0 || next.row < 0 || next.col >= COLS || next.row >= ROWS;
    if (out || this.taken(next)) {
      this.over = true;
      this.burst(
        OX + (head.col + 0.5) * CELL,
        OY + (head.row + 0.5) * CELL,
        ART.white,
        16,
      );
      return;
    }
    this.body.unshift(next);
    if (next.col === this.paper.col && next.row === this.paper.row) {
      this.score += 1;
      this.pop(
        OX + (next.col + 0.5) * CELL,
        OY + next.row * CELL,
        "+1",
        ART.gold,
      );
      this.paper = this.freeSpot();
      // Every fifth sheet, a critter curls up somewhere in the way.
      if (this.score % 5 === 0) this.critters.push(this.freeSpot());
    } else {
      this.body.pop();
    }
  }

  press(key: Key) {
    if (key === "action") return;
    const last = this.queue.at(-1) ?? this.dir;
    if (key !== last && key !== BACK[last] && this.queue.length < 3)
      this.queue.push(key);
  }

  protected scene(ctx: Ctx, view: BonusView) {
    rounded(ctx, OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, 10);
    shadeDown(ctx, ART.wood, OY, OY + ROWS * CELL, 8, -12);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if ((c + r) % 2 !== 0) continue;
        ctx.fillStyle = hsl(ART.wood, 12, 0.35);
        ctx.fillRect(OX + c * CELL, OY + r * CELL, CELL, CELL);
      }
    }
    // The sheet of paper.
    const px = OX + this.paper.col * CELL;
    const py = OY + this.paper.row * CELL;
    rounded(ctx, px + 4, py + 3, CELL - 8, CELL - 6, 2);
    ctx.fillStyle = hsl(ART.white);
    ctx.fill();
    outline(ctx, 1, ART.ink, 0.4);
    ctx.fillStyle = hsl(ART.ink, 40, 0.5);
    for (let i = 0; i < 3; i++)
      ctx.fillRect(px + 7, py + 7 + i * 4, CELL - 14, 1.5);

    for (const c of this.critters) {
      critterAt(
        ctx,
        "fuzzball",
        OX + (c.col + 0.5) * CELL,
        OY + (c.row + 0.9) * CELL,
        26,
        view,
        {
          stuckFor: 1,
        },
      );
    }
    // The trail of shredded strips, then the shredder at its head.
    for (let i = this.body.length - 1; i >= 1; i--) {
      const b = this.body[i];
      if (!b) continue;
      const x = OX + b.col * CELL;
      const y = OY + b.row * CELL;
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = hsl(k % 2 === 0 ? ART.white : ART.note, 0, 0.95);
        ctx.fillRect(x + 4 + k * 4.5, y + 4, 3, CELL - 8);
      }
    }
    const head = this.body[0];
    if (head)
      drawShredder(
        ctx,
        OX + (head.col + 0.5) * CELL,
        OY + (head.row + 0.5) * CELL,
        CELL * 1.25,
        true,
        view.t,
      );
  }
}
