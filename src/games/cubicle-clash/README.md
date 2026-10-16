# Cubicle Clash

A base-building and raiding game in the spirit of Clash of Clans, played
between coworkers. Each player builds an office base, trains a crew of
critters with coffee, and raids coworkers' bases for coins and trophies.
Coworkers raid back while the player is away.

It shares the game box with Desk Defense. The tabs above the box switch
between them.

## How to play

**On your base**

- **Arrow keys** move the cursor, and **Enter** picks the building under it.
  The mouse works too.
- **C** collects from every coin press and coffee maker. Clicking one
  collects just that one.
- **B** opens the build menu. Pick a building with its number, move it into
  place, and press **Enter**.
- With a building picked: **U** upgrades it, **M** moves it.
- **T** trains troops, **R** finds a coworker to raid, and **L** opens the
  raid log.
- **Esc** cancels, then leaves the game.

**In a raid**

- **1 to 5** pick a troop. **Arrow keys** move the cursor. **Enter** drops a
  troop.
- Troops land anywhere on the outer edge, or on open floor that is not next
  to a building. A red tint marks where they cannot land.
- **E** ends the raid early, keeping what was won. **Esc** pauses it.
- A raid lasts 75 seconds at most.

## Stars, loot and trophies

As in the game it is modeled on, a raid wins up to three stars: one for
taking down half the base, one for the head office, and one for all of it.
Walls do not count. Loot is a share of what the coworker has lying around,
as big as the share of their base taken down. Any stars win trophies from
the coworker; none loses trophies to them. Beating someone with more
trophies wins more.

The leaderboard ranks everyone by trophies and shows the top five. When the
player is not in it, their place shows under the list.

## Buildings

| Building       | What it does                                                          | Needs head office |
| -------------- | --------------------------------------------------------------------- | ----------------- |
| Head office    | Its level caps every other building's level and count                 | –                 |
| Coin press     | Makes coins over time; collect them                                   | 1                 |
| Coffee maker   | Makes coffee over time, for training troops                           | 1                 |
| Vault          | Holds more coins, and is tough                                        | 1                 |
| Break room     | Room for troops. Each level makes troops stronger and trains new ones | 1                 |
| Stapler turret | Fires at the nearest troop                                            | 1                 |
| Desk fan       | Slows troops                                                          | 1                 |
| Printer        | Paper planes that hit every troop where they land                     | 2                 |
| Desk lamp      | Long reach and a big zap, slow to charge                              | 3                 |
| Cubicle wall   | Troops must break through. Hoppers jump it.                           | 1                 |

## Troops

The critters from Desk Defense, on the player's side this time.

| Troop    | Break room | What it does                                          |
| -------- | ---------- | ----------------------------------------------------- |
| Fuzzball | 1          | Goes for the nearest building                         |
| Zippy    | 1          | Fast. Goes for coin presses, coffee makers and vaults |
| Hopper   | 2          | Jumps cubicle walls                                   |
| Chonk    | 2          | Big and tough. Goes for defenses                      |
| Grumble  | 3          | The boss, huge and strong                             |

## The coworkers

There is no server yet, so the coworkers are made up: eight of them, in
`src/mock/game-scores.ts`, each with trophies and a head office level. Their
bases are built from a seed, so a coworker's base is the same on every
visit. Raids by coworkers while the player is away are decided the same
way: one chance every twenty minutes away, three raids at most, and the
outcome depends on the player's defenses. A reload tells the same story.

With a server, each of these would be real: real bases, real raids and a
shared leaderboard.

## How it behaves in the host screen

It keeps every rule Desk Defense keeps. When work arrives, the raid stops
in the same frame, every key goes back to the host, and the raid waits
until the player presses Carry on. The base and any raid in progress are
kept outside React, so they survive the tab switching and the payroll box
leaving the screen. There is no sound, and with `prefers-reduced-motion`
nothing wiggles or floats.

## Files

| File                | What it holds                                               |
| ------------------- | ----------------------------------------------------------- |
| `units.ts`          | Every building and troop, and the numbers that balance them |
| `base.ts`           | Building, moving, upgrading and collecting                  |
| `rivals.ts`         | The made-up coworkers' bases and loot                       |
| `raid.ts`           | The rules of a raid, with no drawing                        |
| `save.ts`           | Saved progress, raids while away and the leaderboard        |
| `art.ts`            | The buildings, the floor and rubble                         |
| `draw.ts`           | Puts a base or a raid on the canvas                         |
| `menus.tsx`         | Build, train, raid, log, top five and results               |
| `cubicle-clash.tsx` | The game's box, its loop and its keys                       |

The fur, eyes, critters, helpers and effects shared with Desk Defense are
in `src/games/art`.
