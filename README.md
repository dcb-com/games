# DCB Games

Copies of two DCB screens, the support console and the payroll dashboard,
running in the browser on made-up data. Each has an empty box where a game
would open. Use it to design small games that DCB staff and customers play in
the quiet moments of their work.

## Setup (for Claude)

Run these from the repo folder, in order. Nothing else is needed: no account,
no key, no `.env` file, no private registry.

```sh
# 1. Node 22. The exact version is in .nvmrc.
nvm install && nvm use          # or, with fnm: fnm install && fnm use

# 2. pnpm, at the version package.json names (Corepack ships with Node 22).
corepack enable

# 3. Install and start.
pnpm i
pnpm dev
```

Open the address Vite prints, `http://localhost:5180`. The start page links to
both screens.

If something goes wrong:

- **Wrong Node version.** `pnpm i` stops with "Unsupported environment".
  Run
  `node -v`; it must be 22.21 or newer in the 22 line. Run `nvm install` (or
  `fnm install`) in this folder, then `nvm use`.
- **`corepack: command not found`.** Some Node installs leave it out. Run
  `npm i -g corepack`, then `corepack enable`. Or skip Corepack and put
  `npx pnpm@11.27.0` in place of `pnpm` in every command.
- **"Failed to switch pnpm to v11.27.0"**, or `pnpm -v` shows a version
  older than 11. A pnpm installed some other way comes first on the path. Run
  every command through Corepack instead: `corepack pnpm i`,
  `corepack pnpm dev`. `npx pnpm@11.27.0 i` works too.
- **Port 5180 is in use.** Run `pnpm dev --port 5181`, or find the other
  server with `lsof -i :5180` and stop it.
- **The page is blank or old.** Stop the server, run `rm -rf node_modules/.vite`,
  and start it again.

## The assignment

DCB wants a few small games for its website. Two groups of people often wait
with nothing to do:

- **Support agents**, while they are live but have no call ringing and nothing
  waiting in New.
- **Payroll admins**, while a payroll run is being worked out. That takes one
  to five minutes, twice per run.

The job is to make games that fit those moments: quick to start, quick to
leave, and never in the way of real work. This repo has no game in it. It has
the two screens, a marked place for a game in each, and controls to make work
arrive at any moment.

## The moments to design for

| Screen  | A game may run                              | It must stop at once when                                                                           |
| ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Console | Live, no call ringing, nothing in New       | A call rings, an email lands in New, the agent answers a call or is in wrap-up                      |
| Payroll | The run is calculating, or it is submitting | The run finishes: the page moves on to Review or Done by itself, and the game's box is gone with it |

Some facts about the real screens that shape a game:

- A ringing call takes the whole call bar and turns it teal. The agent has 20
  seconds to answer. If nobody answers, the console takes the agent out of
  live.
- The real console also takes an agent out of live after 5 minutes with no
  clicks or typing. Whether playing a game should count as activity is an
  open question. Say what you think.
- When a payroll run finishes, the page changes right away. A game there must
  save where it was, so a player can come back to it, or end in a way that
  feels fine to cut short.

## What is here

- `/` is the start page. `/console` is the support console on New.
  `/payroll` is a payroll run, from the timesheet to Done.
- **Mock controls**, the panel at the bottom left, change the made-up data:
  ring a call, answer it, send in an email, start a payroll run, finish it.
  It is not part of either app.
- `?state=` opens a screen in a given moment, for screenshots and for
  checking a game quickly:
  - Console: `idle`, `waiting`, `ringing`, `on-call`, `wrap-up`, `not-live`.
    For example `/console?state=ringing`.
  - Payroll: `timesheet`, `calculating`, `review`, `finalizing`, `done`.
    For example `/payroll?state=calculating`.

| Folder                   | What it holds                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/ui`                 | Every UI primitive the DCB web apps use (button, dialog, table…). Import them as `@dcb/ui/button`. |
| `src/theme.css`          | Every color, font, radius, shadow and text role.                                                   |
| `src/console`            | The support console's frame, call bar, live control and New list, copied from the real app.        |
| `src/dashboard`          | The payroll dashboard's frame, nav, run steps and shared parts (tables, lists, forms, charts).     |
| `src/games`              | The game box (`game-slot.tsx`) and the moments (`moments.ts`). Games go here.                      |
| `src/mock`               | The made-up data, the clock that moves it on, and the mock controls.                               |
| `src/money`, `src/phone` | How DCB formats money and phone numbers.                                                           |
| `tooling/oxlint`         | DCB's own lint rules.                                                                              |

## Adding a game

1. Make a folder for it: `src/games/<name>/`.
2. Show it in place of `<GameSlot>`: in `src/console/support/inbox/detail-empty.tsx`
   for the console, in `src/dashboard/pages/payroll-run.tsx` for payroll. Keep
   the box's size.
3. Read the moment from `consoleMoment` or `payrollMoment` in
   `src/games/moments.ts`. When it turns to `pause`, stop the game at once.
4. Try every moment with the mock controls before you call it done.

You may add any library you like: a game engine, a canvas or WebGL library,
physics, audio, anything. Install it with `pnpm add <name>`. Bundle size and
hosting get sorted out later, once the game and the experience are good.

## Checks

```sh
pnpm check       # all of the below, in order
pnpm typecheck   # TypeScript
pnpm lint        # oxlint, with DCB's rules
pnpm format      # oxfmt (pnpm format:fix fixes it)
pnpm test        # vitest
pnpm build       # a production build into dist/
```

The rules for code in this repo are in `CLAUDE.md`.
