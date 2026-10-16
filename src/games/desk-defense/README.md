# Desk Defense

A lane defense game in the spirit of Plants vs. Zombies. Fuzzy critters
cross the desk from the right. The player sets office helpers in their
path. A round lasts one to two minutes.

It opens in the support console's detail pane and under the payroll wait.

## How to play

- **Arrow keys** move the cursor. **1 to 8** pick a helper. **Enter** or
  **Space** sets it down. **X** picks Remove, and **Delete** takes a helper
  off at once. **Esc** goes back to the menu, and Esc on the menu leaves the
  game. The mouse works too.
- Helpers cost energy. Energy drips in by itself, and coffee makers brew
  more.
- A shredder waits at the left end of each row. It saves the row once. The
  second critter through ends the round.

## Levels

There are 36. Level 1 is guided: Dot, the desk robot, explains one step at
a time and waits while the player reads. Each level after that sends more
critters with a little more health. New helpers and new critters arrive
along the way, and the level card shows each one with its picture. Levels
10, 20, 30 and 36 end with a boss, Grumble. Each level is built from a fixed
seed, so a level is the same for everyone.

## Helpers

Every helper has a special move.

| Helper       | From level | Cost | What it does                     | Special move                                                            |
| ------------ | ---------- | ---- | -------------------------------- | ----------------------------------------------------------------------- |
| Coffee maker | 1          | 50   | Brews 25 energy every 9 seconds  | Its first cup comes after 4 seconds. The pot fills as it brews.         |
| Stapler      | 1          | 100  | Fires staples down its row       | Every fourth staple is gold and hits three times as hard                |
| Firewall     | 3          | 50   | A tough wall                     | It is hot: anything chewing on it gets burned                           |
| Desk fan     | 6          | 175  | Cold puffs slow critters by half | Every 8 seconds a gust pushes its whole row back                        |
| Sticky note  | 8          | 25   | A cheap trap on the desk         | Critters walk onto it and get stuck. It holds three, then it is used up |
| Printer      | 10         | 200  | Throws paper planes              | Each plane flies through up to three critters                           |
| Big eraser   | 14         | 150  | One use                          | Shakes, then wipes out every critter in the cells around it             |
| Desk lamp    | 22         | 250  | Charges up and glows             | Zaps a beam that hits every critter in front of it at once              |

## Critters

| Critter  | From level     | What it does                                                           |
| -------- | -------------- | ---------------------------------------------------------------------- |
| Fuzzball | 1              | A round pink puff. Slow and steady.                                    |
| Zippy    | 4              | Small, yellow, long ears, very fast                                    |
| Chonk    | 7              | Big, purple and horned. Takes three times the hits.                    |
| Splitter | 9              | Pops into two fast minis when stopped                                  |
| Hopper   | 12             | Jumps clean over the first helper in its row                           |
| Shellby  | 17             | Wears a pot for a helmet. When it breaks, Shellby gets angry and fast. |
| Grumble  | 10, 20, 30, 36 | The boss. At half health it roars and two fuzzballs come to help.      |

## How it is drawn

Everything is drawn on a canvas in code; there are no image files. Each
critter's fur is a few hundred short strokes, drawn once per size and kept,
so the game runs at a full frame rate. The face, feet and the rest are drawn
fresh each frame, so critters waddle, blink, chomp, hop and burst into puffs
of fur. Helpers recoil, glow and shake as they work and get bitten.

The art's colors live in `src/games/art/color.ts`, apart from the theme, because the
art is the game's own picture. The card bar and the menus around the desk
still take every color from `src/theme.css`.

## Coins, upgrades and the leaderboard

Every critter stopped pays coins, and a cleared level pays more. Replaying a
cleared level pays less, so moving forward pays best. Coins buy five
upgrades in the shop, each with three to five steps.

A player's leaderboard score is the sum of their best score on each cleared
level. The start screen and the end of each round show the top five,
best first. If the player is not in the top five, their place is shown
under the list. The made-up coworkers on the board are in
`src/mock/game-scores.ts`.

Progress is saved in the browser, one entry for each player. The console's
agent and the payroll admin keep separate progress. The real app would keep
it on the server.

## How it behaves in the host screen

- When the moment turns to `pause`, the loop stops before the next frame is
  drawn. From then on every key goes to the host, so A still answers a call
  while the game has focus. The round waits as it was. When work is done,
  the player presses Carry on.
- The round is kept outside React, so it survives the box leaving the
  screen. When a payroll run finishes, the menu offers to carry on with the
  same round the next time the box shows.
- The game makes no sound. With `prefers-reduced-motion`, nothing wiggles,
  blinks or floats, and puffs and sparks stay put.
- Losing focus pauses the round.

## Should playing count as activity?

The real console takes an agent out of live after five minutes with no
clicks or typing. We think play should count. An agent who is playing is at
the desk and will see a call ring. If play did not count, an agent in the
middle of a round would be taken out of live and miss the next call, which
is worse for everyone.

## Files

| File               | What it holds                                               |
| ------------------ | ----------------------------------------------------------- |
| `units.ts`         | Every helper and critter, and the numbers that balance them |
| `levels.ts`        | How the 36 levels are built                                 |
| `round.ts`         | The rules of a round, with no drawing                       |
| `draw.ts`          | Puts a round on the canvas, and draws the card bar          |
| `art/desk.ts`      | The desk, the shredders and the things helpers throw        |
| `guide.ts`         | What Dot says on level 1                                    |
| `upgrades.ts`      | What coins buy                                              |
| `progress.ts`      | Saved progress and the leaderboard                          |
| `menus.tsx`        | The screens around a round                                  |
| `desk-defense.tsx` | The game's box, its loop and its keys                       |

The fur, eyes, critters, helpers and effects are shared with Cubicle Clash,
so they live in `src/games/art`. `fx-events.ts` turns a round's events into
those effects.
