import type { Round } from "~/games/desk-defense/round";

// The guided first level. Dot, the desk robot, says one thing at a time and
// waits for the player to do it. While a step "holds", the round stands
// still, so nobody is rushed while they read.

export interface GuideStep {
  words: string;
  holds: boolean;
  // Enter moves on from this step.
  enter: boolean;
  // The step is done when this is true. Seconds is how long it has shown.
  done: (r: Round, seconds: number) => boolean;
}

export const HOST = "Dot";

export const GUIDE: GuideStep[] = [
  {
    words:
      "Hi, I'm Dot. Fuzzy critters want to cross your desk. Let's stop them together.",
    holds: true,
    enter: true,
    done: () => false,
  },
  {
    words:
      "Helpers cost energy. You have 150. Press 1, or click the first card, to pick a coffee maker.",
    holds: true,
    enter: false,
    done: (r) => r.selected === "coffee",
  },
  {
    words:
      "Move with the arrow keys and press Enter to set it down. Coffee makers brew more energy.",
    holds: true,
    enter: false,
    done: (r) => r.helpers.some((h) => h.kind === "coffee"),
  },
  {
    words:
      "Now press 2 for a stapler. Put it in the same row, to the right of the coffee.",
    holds: true,
    enter: false,
    done: (r) => r.helpers.some((h) => h.kind === "stapler"),
  },
  {
    words:
      "Good. Critters come in from the right. Staplers fire at anything in their row, and every fourth staple is gold.",
    holds: false,
    enter: false,
    done: (r) => r.kills >= 1,
  },
  {
    words:
      "Got one! Add more staplers as energy comes in. Every critter you stop earns coins.",
    holds: false,
    enter: true,
    done: (_, seconds) => seconds > 7,
  },
  {
    words:
      "If a critter reaches the left edge, the shredder clears that row once. Then it's up to you.",
    holds: false,
    enter: true,
    done: (_, seconds) => seconds > 7,
  },
];

export const GUIDE_DONE =
  "You're ready. Spend your coins on upgrades between levels. Every helper has a special move, so try each new one.";
