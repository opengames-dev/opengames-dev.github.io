# OpenGames decision record

This is the current baseline as of 2026-09-09. It records the original product
brief, implemented choices, and the user's later layout review. It is not a
claim that every quality target has been verified. See [TESTING.md](../TESTING.md)
for evidence and [GAME_DEVELOPMENT.md](GAME_DEVELOPMENT.md) for implementation.

## D01 — Product and scope

**Decision:** Small, familiar, polished 2D browser games for short sessions.
Games remain free, open source, ad-free, and available without accounts. No
analytics, tracking, artificial waiting, monetization mechanics, ratings,
popularity feeds, or unnecessary setup. Restart has no confirmation dialog.

**Reason:** The player's time and experience are the product priorities.
Fun and responsiveness outrank clever architecture. Polish existing games while
adding requested games. The original four-game milestone is not a permanent cap.
Future candidates in PLAN.md are ideas, not an instruction to build them.

## D02 — Name, promise, and voice

**Decision:** Use **OpenGames** in the interface and **OpenGames.dev** as the
project name. Game document titles follow `Game name — OpenGames`. The durable
promise is “No ads. No accounts. No tracking. Just games.” The homepage currently
uses “A little play. Zero strings.” and brief playful card descriptions.

Game screens use functional labels: “Ready”, “Play”, “Paused”, “Resume”,
“Restart”, “Game over”, and a concise result with replay. The user explicitly
removed “A little lost. A little closer…” and asked to generalize the simpler
approach to every game. Do not restore decorative game subtitles, motivational
messages, footers, or always-visible instruction blocks. Homepage warmth is
appropriate; active play should remain quiet.

AI tooling is an implementation detail, not the player-facing identity. Make
promises about the games, not speculative commercial intentions.

## D03 — Visual identity and assets

**Decision:** Warm paper background, dark ink, burnt-orange brand accents, muted
natural game colors, rounded controls, restrained borders, and original geometric
art. Use the existing four-shape brand mark and shared favicon. Use system font
stacks, with no downloaded fonts. Exact tokens and per-game colors are in the
development guide and stylesheets.

**Reason:** A coherent collection can feel polished without heavy assets. SVG,
CSS, and canvas primitives are the established approach; raster art is not a
requirement. All current code, original artwork, and synthesized sounds use the
[MIT license](../LICENSE). Record provenance and attribution for any future
compatible third-party assets. Do not copy commercial game artwork, characters,
sounds, or level designs.

## D04 — Board-first responsive shell (user review)

**Decision:** Normal game pages have a small title/back link, essential stats,
and compact actions. Difficulty, sound, and instructions live in settings.
Desktop/tablet layouts, including portrait tablets, put controls beside the
board when space allows. Phone normal mode stacks them compactly. Fit the board
and essential controls without page scrolling at the supported test sizes.

Fullscreen hides title, home navigation, and page chrome. Essential controls
float on the game surface with space reserved around playable cells. Portrait
uses top/bottom controls; landscape uses a side area. Respect safe-area insets.
Desktop/tablet have the same fullscreen option. Keep an exit button visible.
An internally scrolling settings popup is acceptable on short screens.

**Reason:** The user found the original screen overcrowded and wanted a larger,
focused game. This replaces the illustrative shell and inline difficulty layout
in PLAN.md sections 8–9. Do not interpret “overlay controls” as permission to
cover paths, cards, or targets.

## D05 — Fullscreen and settings behavior

**Decision:** Try native fullscreen after the player's action, and provide the
same CSS focus view if it is unavailable or rejected. Keep browser fullscreen
state and `.is-focused` synchronized. Native fullscreen is optional for play.

Opening settings pauses active play; closing restores its previous pause state.
Changing difficulty starts a new game. Escape closes settings first, then exits
focus, then serves as pause in normal play. Browsers may consume Escape to exit
native fullscreen directly; the fullscreenchange handler also closes settings.

**Reason:** Phone browser support varies. Fast settings toggles can coalesce
native `details` toggle events, so activation is handled synchronously. Menu
bounds are recalculated after resizing/fullscreen changes. The helper avoids a
double pause toggle when closing settings through another play control.
These are tested integration behaviors, not incidental markup to simplify away.

## D06 — Static architecture and distribution

**Decision:** HTML/CSS/vanilla JS; no build, runtime packages, game engine,
backend, API calls, CDN assets, or router. Each game has its own directory and
HTML entry. Ordinary deferred scripts support direct file playback. Share only
cross-game utilities; prefer a small amount of obvious markup duplication over
a framework. Canvas serves spatial games; DOM buttons serve cards/targets.

**Reason:** Easy inspection, remixing, offline local use, and direct static
hosting matter more than tooling uniformity. Node and Playwright are development
checks installed outside the runtime project, not a requirement to play.

The canonical [repository](https://github.com/opengames-dev/opengames-dev.github.io)
uses `main` for source links. Homepage “Open source” links there; source.html
provides GitHub file links and contribution links. Game navigation and assets
stay relative for `file://` and deployment below a path. `.nojekyll` enables
plain GitHub Pages serving. Configure a custom domain only when supplied and
configured; the brand name alone does not establish domain ownership.

## D07 — State, timing, and input

**Decision:** Each game owns rules, state, timers, rendering, and lifecycle.
Shared helpers provide UI, input mapping, audio, storage, and square canvas
sizing. Separate pure logic when it enables useful rule tests; do not require
logic.js for every small DOM game.

Use requestAnimationFrame and elapsed time; preserve timing through pauses,
reset timestamps on resume, and cancel old loops on restart. Hidden pages and
loss of window focus pause active play. Resuming the page alone does not resume
the game. Game callbacks must reject input in paused/finished states.

Touch and keyboard/mouse are first-class. Add gamepad only where appropriate
(currently Labyrinth and Snake); avoid artificial mappings for direct-target
games. The UI must remain usable without sound or optional APIs.

## D08 — Persistence, audio, and offline limits

**Decision:** Only local preferences and scores: global sound, per-game
difficulty, and per-difficulty best scores where used. No cookies or network
storage. Storage access is fallible and defaults must allow play. Audio starts
off unless previously enabled, initializes through player gestures, and uses
tiny Web Audio effects. No music or required audio cues.

Local downloaded files work offline. There is no service worker or PWA install
flow; a hosted offline revisit is not guaranteed. This intentionally defers the
future offline/PWA ideas in PLAN.md, avoiding cache invalidation complexity.

## D09 — Existing game choices worth preserving

| Game | Current choice | Reason / invariant |
| --- | --- | --- |
| Labyrinth | 7×7 / 11×11 / 17×17; randomized depth-first maze; circle start, flag exit, trail; moves and time | Connected spanning tree with reciprocal walls; endpoints readable without color alone; clock starts on a valid move. |
| Snake | 20×20; starting intervals 185 / 140 / 105 ms, 2 ms faster per fruit down to 65 ms | Fixed-step simulation; at most two queued turns; no reversals; tail cell can be entered when it vacates; filling board is a win. |
| Memory | 2×2 / 4×4 / 5×4, giving 2 / 8 / 10 pairs; 850 ms mismatch reveal | Hard replaces the plan's example 6×6 to preserve 44px targets on small phones. Block a third flip; pause mismatch resolution; symbols have names and matched checks. |
| Whac-A-Mole | 3×3 holes, 30-second rounds; 1450 / 1150 / 900 ms initial reaction windows, reduced by up to 260 ms during a round | No consecutive repeat hole, no double score on one mole, immediate replay; direct tap and numbered keys suit the mechanic. |

Labyrinth/Memory begin through interaction. Snake/Mole use an in-board Ready/Play
state to avoid starting a timed challenge before the player is ready. Only
Snake/Mole currently persist best scores. All games offer Easy/Normal/Hard;
a future game without meaningful difficulty should explicitly document and
implement the shared-shell adaptation, rather than leave misleading buttons.

## D10 — Quality targets and evidence

**Decision:** Evaluate complete play, usability, appearance, accessibility,
performance, and failures, not just whether scripts load. Target near-instant
startup, smooth animation where used, and less than 500 KB per game where
practical, including shared runtime assets. The original four games were measured
below 40 KB each; this is a baseline, not a reason to sacrifice readability.

Use deterministic rule tests and browser integration where they catch real
failures. Test shared changes across every game. Layout evaluation includes
phone, portrait tablet, desktop, short landscape, fullscreen/fallback, and open
settings. Manual play and visual inspection remain necessary; automated tests
using forced clicks cannot establish natural pointer usability.

Physical Android/iOS, hardware gamepad feel, Safari, audible sound quality, and
public deployment have not all been verified. Keep limitations visible in
TESTING.md; do not convert goals or emulation passes into claims of coverage.

## Maintaining this record

For a new decision, add a stable D-number, date, choice, reason, affected files
or contracts, and validation implications. For a changed decision, explain what
supersedes it and why; retain the rationale. Update the development guide and
verification record in the same change. Routine fixes that preserve a decision
do not need an invented architectural decision entry.
