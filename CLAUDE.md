Responses and documentation should not be jargony. The style should be a mix of Wikipedia and Ernest Hemingway style English.

Here are some examples of jargon: gated, foot-gun, load bearing, blast radius, seam, fold in.

## Setup (for Claude)

From the repo folder, in order. No account, key, `.env` or private registry is needed.

```sh
nvm install && nvm use   # Node from .nvmrc; with fnm: fnm install && fnm use
corepack enable          # pnpm at the version in package.json
pnpm i
pnpm dev                 # then open the printed address, http://localhost:5180
```

If it fails:

- Wrong Node ("Unsupported engine"): `node -v` must be 22.21 or newer in the 22 line. Run `nvm install` here.
- `corepack: command not found`: `npm i -g corepack && corepack enable`, or use `npx pnpm@11.27.0` in place of `pnpm`.
- "Failed to switch pnpm to v11.27.0", or pnpm older than 11: run `corepack enable` and open a new terminal, or use `npx pnpm@11.27.0`.
- Port 5180 in use: `pnpm dev --port 5181`, or stop the other server (`lsof -i :5180`).
- Blank or stale page: stop the server, `rm -rf node_modules/.vite`, start again.

Run `pnpm check` (typecheck, lint, format, test, build) before every commit. It must pass.

## Commits

A commit message is one short line, all lower case, ten words or fewer. It has no body. It never names a co-author or a tool: no `Co-Authored-By` line and no "generated with" line, in commits or in pull requests.

## What this repo is

A copy of two DCB screens, the support console (`/console`) and the payroll dashboard (`/payroll`), on made-up data, with an empty box in each where a game would open. It exists so games can be designed in their real place. The README says what the assignment is and which moments a game is for.

The repo is public. Never add real customer data, real names, secrets, keys, tokens or internal addresses. Made-up data uses `example.com` addresses and 555-01xx phone numbers. There is no server; `src/mock/store.ts` is the whole world.

Copied files keep the real apps' shape and names, so code can move between this repo and the real apps unchanged. `@dcb/ui`, `@dcb/money` and `@dcb/phone` point into `src` (see `tsconfig.json` and `vite.config.ts`). Inside `src`, `~/` is the `src` folder.

Any library is fine: a game engine, canvas or WebGL, physics, audio, anything. Add it with `pnpm add`. Bundle size and hosting come later, once the game and the experience are good.

## Games

These rules are about how a game behaves inside a host screen. The host screen's moment comes from `consoleMoment` or `payrollMoment` in `src/games/moments.ts`: `free`, `pause` or `closed`.

- **Work wins, at once.** When the moment turns to `pause` (a call rings, an item lands in New, wrap-up starts, a payroll run finishes), the game stops in the same frame: no "are you sure", no last animation, no sound. Timers, loops and audio stop. The game keeps its state, so it can carry on later.
- **The host never moves.** A game draws inside the box it is given and keeps that box's size. It never shifts, covers or resizes the host screen, never draws over the call bar, never locks the page's scroll and never opens a window of its own over the app. Starting, pausing and closing a game move nothing around it.
- **Quiet by default.** No sound until the player turns it on, and sound stops the moment work arrives. Respect `prefers-reduced-motion`.
- **Keyboard first.** A game can be played with the keyboard alone, shows the focus ring (`focusRing` from `@dcb/ui`) and leaves with Escape. It takes keys only while it has focus, so the console's own keys (J, K, P, Shift P, Mod K, ?) keep working.
- **Short.** A round fits in a minute or two, and leaving in the middle feels fine.

## Dashboard styling

These apply to everything in `src`.

Every color, radius, shadow and font comes from `src/theme.css`. A raw palette class (`bg-amber-50`), a hex value in a class (`text-[#047b71]`) or a hex literal in a component is a bug. Add a token first, then use the token. oxlint fails on the first two.

- Tokens are named for the job they do (`primary`, `warning`, `muted-foreground`), never for the shade. Each token is a CSS variable on `:root` with a light value and a dark value, mapped to a utility in the `@theme inline` block. `src/theme.test.ts` fails when a token is missing on either side.
- A status is a triple: `bg-warning` for a boxed notice, `text-warning-foreground` for its text, a lone icon or a line of text in that state, and `border-warning-border` for its edge. The same shape exists for `success` and `destructive-soft`. `destructive` on its own is the solid red for a button or a ring.
- Text uses one of the roles in theme.css: `type-page-title`, `type-label`, `type-body`, `type-secondary`, `type-caption`. A margin or a one-off tweak sits next to the role (`type-caption mt-1`); the role never carries layout. Money and counts get `tabular-nums`.
- Conditional classes go through `cn` from `@dcb/ui`. There are no style files and no `style={{}}` except for a value computed at runtime, such as a width in percent. A game's own canvas or engine may draw however it needs to inside its box, but colors it shows in the UI around it still come from the theme.
- Primitives come from `@dcb/ui` by subpath (`@dcb/ui/button`). The app wraps them in feature folders; it never copies one. A new primitive goes in `src/ui` (from shadcn), then its icons and colors are brought onto the theme.
- Icons are `lucide-react` everywhere, sized with a `size-*` class.
- Charts take their colors from `src/dashboard/components/dashboard/chart-theme.tsx`, which passes the theme's CSS variables to Recharts. No hex in a chart.
- Dark mode is built and parked. The theme has a full dark palette, and app code never uses a `dark:` utility because the tokens carry the dark value. `src/index.css` says how it is kept off.

## Code

oxlint (`oxlint.config.ts`, with DCB's plugins in `tooling/oxlint`) checks most of these.

- Every value has a defined type: no `unknown`, no `any`. Where one must stay, the line above says why: `// oxlint-disable-next-line dcb/no-unknown -- the reason`. Every disable comment gives a reason.
- Money is converted only by `Money` in `src/money/money.ts`. `x * 100`, `x / 100`, `toFixed` and `parseFloat` are refused elsewhere. Something that is not money, such as a percent, says so on the line: `// oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent`.
- Phone numbers are shown with `formatPhone` from `@dcb/phone/phone`.
- The React hooks rules are on, including the React Compiler's: no state set during an effect, no refs read during render.
- Comments say why, in plain sentences, like the copied code around them.
