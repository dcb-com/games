import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

// One focus ring for the whole system: a soft four-pixel halo in the ring
// token. Every clickable thing wears it, so a keyboard user never loses the
// caret. Pair it with a rounded-* class so the halo follows the corner.
export const focusRing =
  "outline-none focus-visible:ring-4 focus-visible:ring-ring/40";
