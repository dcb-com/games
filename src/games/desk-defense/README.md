# Desk Defense

A lane defense game in the spirit of Plants vs. Zombies. Bugs crawl across
the desk from the right. The player sets office helpers in their path. A
round lasts one to two minutes.

It opens in the support console's detail pane and under the payroll wait.

## How to play

- **Arrow keys** move the cursor. **1 to 6** pick a helper. **Enter** or
  **Space** sets it down. **X** picks Remove, and **Delete** takes a helper
  off at once. **Esc** goes back to the menu, and Esc on the menu leaves the
  game. The mouse works too.
- Helpers cost energy. Energy drips in by itself, and coffee makers brew
  more.
- A shredder waits at the left end of each row. It saves the row once. The
  second bug through ends the round.

## Levels

There are 36. Level 1 is guided: Dot, the desk robot, explains one step at
a time and waits while the player reads. Each level after that sends more
bugs with a little more health. New helpers and new bugs arrive along the
way. Levels 10, 20, 30 and 36 end with a boss, Ransomware. Each level is
built from a fixed seed, so a level is the same for everyone.

| Helper       | From level | Bug        | From level     |
| ------------ | ---------- | ---------- | -------------- |
| Coffee maker | 1          | Bug        | 1              |
| Stapler      | 1          | Spam       | 4              |
| Firewall     | 3          | Virus      | 7              |
| Desk fan     | 6          | Phish      | 12             |
| Printer      | 10         | Trojan     | 17             |
| Big eraser   | 14         | Ransomware | 10, 20, 30, 36 |

## Coins, upgrades and the leaderboard

Every bug stopped pays coins, and a cleared level pays more. Replaying a
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
- The game makes no sound. With `prefers-reduced-motion`, nothing wiggles
  or floats.
- Losing focus pauses the round.

## Should playing count as activity?

The real console takes an agent out of live after five minutes with no
clicks or typing. We think play should count. An agent who is playing is at
the desk and will see a call ring. If play did not count, an agent in the
middle of a round would be taken out of live and miss the next call, which
is worse for everyone.

## Files

| File               | What it holds                                           |
| ------------------ | ------------------------------------------------------- |
| `units.ts`         | Every helper and bug, and the numbers that balance them |
| `levels.ts`        | How the 36 levels are built                             |
| `round.ts`         | The rules of a round, with no drawing                   |
| `draw.ts`          | Draws a round on the canvas, in the theme's colors      |
| `guide.ts`         | What Dot says on level 1                                |
| `upgrades.ts`      | What coins buy                                          |
| `progress.ts`      | Saved progress and the leaderboard                      |
| `menus.tsx`        | The screens around a round                              |
| `desk-defense.tsx` | The game's box, its loop and its keys                   |
