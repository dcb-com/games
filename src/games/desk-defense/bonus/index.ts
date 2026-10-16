import { Beat } from "~/games/desk-defense/bonus/beat";
import { Catch } from "~/games/desk-defense/bonus/catch";
import { Dash } from "~/games/desk-defense/bonus/dash";
import { Gallery } from "~/games/desk-defense/bonus/gallery";
import type { BonusRun } from "~/games/desk-defense/bonus/kit";
import { Memory } from "~/games/desk-defense/bonus/memory";
import { Plane } from "~/games/desk-defense/bonus/plane";
import { Showdown } from "~/games/desk-defense/bonus/showdown";
import { Snake } from "~/games/desk-defense/bonus/snake";
import { Sort } from "~/games/desk-defense/bonus/sort";
import { Whack } from "~/games/desk-defense/bonus/whack";
import type { BonusId, Theme } from "~/games/desk-defense/levels";

// The ten bonus games, one on every twentieth level. Each is a short game of
// its own with the same characters. A bonus level always counts as cleared;
// a great score pays more coins.

export interface BonusDef {
  name: string;
  // What it is, in one line, for the level card.
  blurb: string;
  // The keys, in one line.
  keys: string;
  // A score that counts as a great run.
  great: number;
  make: (theme: Theme) => BonusRun;
}

export const BONUSES: Record<BonusId, BonusDef> = {
  whack: {
    name: "Whack-a-Critter",
    blurb:
      "Critters pop out of desk drawers. Bonk them, but leave Grumble alone.",
    keys: "Arrow keys pick a drawer, Space bonks. Or click.",
    great: 35,
    make: (theme) => new Whack(theme),
  },
  gallery: {
    name: "Staple Gallery",
    blurb: "Staple the critters trotting along the shelves. Do not staple Dot.",
    keys: "Up and down move, Space fires. Or click a shelf.",
    great: 40,
    make: (theme) => new Gallery(theme),
  },
  catch: {
    name: "Coffee Catch",
    blurb: "Catch the falling coffee beans. Dodge the falling fuzzballs.",
    keys: "Left and right move. Or move the mouse.",
    great: 70,
    make: (theme) => new Catch(theme),
  },
  memory: {
    name: "Sticky Memory",
    blurb: "Find the six pairs of critters under the sticky notes.",
    keys: "Arrow keys move, Space turns a note. Or click.",
    great: 100,
    make: (theme) => new Memory(theme),
  },
  dash: {
    name: "Dot's Dash",
    blurb: "Dot rolls along the desk. Jump the critters and grab the gold.",
    keys: "Space or Up jumps, twice for a double jump. Or click.",
    great: 80,
    make: (theme) => new Dash(theme),
  },
  plane: {
    name: "Paper Plane",
    blurb: "Fly a paper plane through the gaps between stacks of binders.",
    keys: "Space or Up flaps. Or click.",
    great: 15,
    make: (theme) => new Plane(theme),
  },
  snake: {
    name: "Shredder Snake",
    blurb: "Eat paper, grow a trail, and stay off the edges and the critters.",
    keys: "Arrow keys steer.",
    great: 20,
    make: (theme) => new Snake(theme),
  },
  sort: {
    name: "Critter Sort",
    blurb: "Flick each critter into the bin with its picture.",
    keys: "Left and right flick. Or click a side.",
    great: 35,
    make: (theme) => new Sort(theme),
  },
  beat: {
    name: "Stamp Beat",
    blurb: "Stamp the critters on the line, in time with the pulse.",
    keys: "Left, Down and Right stamp the three lanes.",
    great: 120,
    make: (theme) => new Beat(theme),
  },
  showdown: {
    name: "Grumble Showdown",
    blurb: "The last bonus: staple Grumble while dodging his crowns.",
    keys: "Left and right move, Space fires. Or use the mouse.",
    great: 350,
    make: (theme) => new Showdown(theme),
  },
};

// Coins for a bonus game: a share of the score, and a bonus for a great one.
export function bonusCoins(id: BonusId, score: number): number {
  const def = BONUSES[id];
  return (
    30 + Math.floor((score / def.great) * 60) + (score >= def.great ? 60 : 0)
  );
}
