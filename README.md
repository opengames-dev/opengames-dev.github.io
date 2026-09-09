# OpenGames.dev

**No ads. No accounts. No tracking. Just games.**

Four small browser games, made with HTML, CSS, vanilla JavaScript, and original
geometric artwork. The games are and will remain free, open source, ad-free,
and playable without an account.

[Source repository](https://github.com/opengames-dev/opengames-dev.github.io) · [Report an issue](https://github.com/opengames-dev/opengames-dev.github.io/issues)

## Development documentation

Start with [AGENTS.md](AGENTS.md) for coding-agent guidance.
[Adding and maintaining games](docs/GAME_DEVELOPMENT.md) covers shared APIs,
layout, branding tokens, the integration checklist, and evaluation.
[Decisions and rationale](docs/DECISIONS.md) records the current product,
design, technical, and distribution choices, including updates to the original
[plan](PLAN.md). [TESTING.md](TESTING.md) records actual verification and gaps.
Update these documents alongside changes so future contributors inherit the
current decisions rather than reconstructing them from code.

## Play locally

Open `index.html` in a modern browser. No install, package manager, build step,
server, or network connection is required for the local files.

For an HTTP preview, run from this directory:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8080>.

| Game | Controls | Difficulty |
| --- | --- | --- |
| Labyrinth | Arrows / WASD, swipe, on-screen arrows, gamepad | 7×7, 11×11, 17×17 mazes |
| Snake | Arrows / WASD, swipe, on-screen arrows, gamepad | Three starting speeds; faster as you grow |
| Memory | Tap/click; arrows to select, Enter/Space to flip | 2, 8, or 10 pairs; large touch targets |
| Whac-A-Mole | Tap/click; keys 1–9; arrows to select and Space to hit | Three reaction windows; 30-second rounds |

All games have immediate restart, difficulty selection, optional synthesized
sound, and fullscreen. Escape closes settings or exits fullscreen first; during
normal play it pauses. R restarts.
Labyrinth and Snake support a standard gamepad's D-pad or left stick, A for
start/resume/replay, and Start for pause. Press a gamepad button to let the
browser detect it. Memory's Home/End keys select the first/last card.

Games pause when the tab becomes hidden or an active game loses window focus.
Resume explicitly to avoid losing a round on return. Sound starts off by default
and can be enabled in the settings menu. Audio is never necessary to play.

Only sound preference, selected difficulty, and per-difficulty best scores are
stored locally. Storage and audio failures do not prevent play. There are no
cookies, analytics, external fonts, CDN assets, APIs, or runtime dependencies.

## Deploy to GitHub Pages

The repository is a ready-to-serve static site. Game navigation and asset paths
are relative, so it works both at a domain root and under a repository subpath. `.nojekyll` keeps
these files served directly. No deployment workflow or build is required.

1. Put this directory in your public GitHub repository and push a branch.
2. In the repository's **Settings → Pages**, select **Deploy from a branch**.
3. Select that branch and its **/(root)** folder, then save.
4. Open the URL GitHub provides once publication finishes.

These steps follow [GitHub’s branch publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Only configure `CNAME` after choosing and configuring a domain you control.

The first release deliberately does not install a service worker. Downloaded
local files work offline; offline revisits to a hosted copy are not guaranteed.

## Game layout

The board is the main content. Game pages have a small title/back link, scores,
and compact play controls. Difficulty, sound, and input instructions are in the
settings menu. Opening settings pauses active play; closing them restores the
previous state. Choosing a difficulty starts a new game.

Desktop and portrait tablet layouts put scores and controls alongside the board
and size it to the available viewport. Phones use a compact stacked layout.
Fullscreen hides navigation and places controls on the game surface, outside
playable cells. It uses top/bottom controls in portrait and a compact side area
in landscape, with room for device safe areas. The same focused view works
without the native Fullscreen API on browsers that do not support it. The exit
button is always available.

## Project layout

```text
index.html, style.css     Homepage and project styles
source.html              Readable source-file index
shared/                  Common UI, input, audio, styles, favicon
labyrinth/               Canvas game and pure maze logic
snake/                   Canvas game and pure Snake logic
memory/                  DOM cards and original SVG symbols
whac-a-mole/             DOM holes and original SVG moles
tests/                   Logic and optional browser checks
AGENTS.md                Coding-agent entry point and working conventions
docs/GAME_DEVELOPMENT.md  New-game implementation and evaluation guide
docs/DECISIONS.md         Current choices, rationale, and plan supersessions
TESTING.md               Verification evidence and outstanding checks
PLAN.md                  Original product brief and quality standards
```

Scripts use ordinary deferred script tags instead of JavaScript modules so that
opening files directly works. Only the two canvas games have separate pure
logic files. Shared utilities handle actual cross-game behavior; there is no
game engine. Maze generation uses randomized depth-first search. Snake uses a
fixed simulation step, buffers up to two valid turns, and permits entering the
cell vacated by its tail. Card resolution and mole timing stop while paused.

## Verification

The deterministic logic suite uses only Node's built-in test runner (Node 18+):

```sh
node --test tests/logic.test.cjs
```

It checks connectivity, reciprocal walls, boundary walls, and tree structure for
120 generated mazes, plus Snake's input queue, reversals, growth, food placement,
wall/body collisions, tail movement, and full-board victory.

Browser checks are optional development tools, not app dependencies. With Node
20+ and Playwright available outside the repository, start the preview server
and run:

```sh
npm install --prefix /tmp/opengames-browser playwright
/tmp/opengames-browser/node_modules/.bin/playwright install chromium firefox
NODE_PATH=/tmp/opengames-browser/node_modules node tests/browser.cjs
NODE_PATH=/tmp/opengames-browser/node_modules node tests/input-browser.cjs
NODE_PATH=/tmp/opengames-browser/node_modules node tests/focus-browser.cjs
```

Use `CHROME_PATH=/path/to/chrome` to test an existing Chrome installation,
`TEST_URL=http://127.0.0.1:8080/` to change the origin, or `SKIP_FIREFOX=1` to run
Chromium only. The suite covers desktop and mobile viewport layouts, touch,
keyboard, start-to-finish play, rapid input, pause/resume, difficulty changes,
local scores, and direct `file://` playback. See `TESTING.md` for the recorded
verification and outstanding device checks.

## Contributing

Fixes, accessibility improvements, playtesting, and new games are welcome.
Follow the [development guide](docs/GAME_DEVELOPMENT.md) and
[decision record](docs/DECISIONS.md); preserve the quality of existing games
when expanding the collection. Keep source readable and use no external runtime
dependencies. Share a patch, or open a [pull request](https://github.com/opengames-dev/opengames-dev.github.io/pulls).
Explain the player-visible change and how it was tested. Original or compatibly licensed assets only, with attribution when needed.

Code, original SVG artwork, and synthesized sound definitions are MIT licensed.
See `LICENSE`.
