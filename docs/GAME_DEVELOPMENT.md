# Adding and maintaining games

Read [the decision record](DECISIONS.md) for why the collection works this way.
This guide documents the current implementation contracts and the steps for
adding a game. [README.md](../README.md) contains runnable setup commands;
[TESTING.md](../TESTING.md) records evidence rather than future requirements.

## Choose the smallest suitable starting point

| Need | Reference |
| --- | --- |
| Canvas board with discrete moves | [Labyrinth HTML](../labyrinth/index.html), [game](../labyrinth/game.js), [pure logic](../labyrinth/logic.js) |
| Continuous simulation with collision and score | [Snake game](../snake/game.js), [pure logic](../snake/logic.js) |
| Accessible DOM grid, selection, rectangular sizing | [Memory HTML](../memory/index.html), [game](../memory/game.js), [styles](../memory/style.css) |
| Timed direct targets and pointer/keyboard actions | [Whac-A-Mole game](../whac-a-mole/game.js), [styles](../whac-a-mole/style.css) |

Create a lowercase hyphenated directory with index.html and game.js. Add style.css
only for game-specific drawing/layout and logic.js when useful for rule tests.
Game scripts use an IIFE to keep state private. Pure logic files expose a named
browser binding and conditional `module.exports` for Node tests; no bundler is
needed. Keep random generation injectable in rule functions for seeded tests.
There is no automatic game registry, routing layer, or shared game-state engine.

## Page and shared-helper contract

Copy an existing entry page and adapt its game-specific content. Load
`../shared/style.css`, then optional local style.css. Deferred script order is
`audio.js`, `ui.js`, `input.js` from shared/, optional local logic.js, then game.js.
Keep viewport-fit=cover, metadata, shared favicon, skip link, and noscript text.
Use relative paths for runtime assets and navigation.

The shell has this structure (omit the D-pad when it does not fit the game):

```text
body.game-page[data-game="unique-slug"]
  .skip-link → #main
  header.game-header → back link + h1
  main#main.game-main
    .game-layout
      .play-area
        #board.board                 canvas or DOM grid
        #overlay.overlay             sibling of board, initially hidden
          #overlay-title
          #overlay-message
          button#overlay-action
      .stats                         game-specific stat IDs
      .game-toolbar
        .primary-controls → #pause, #restart
        .view-controls
          details#settings.game-settings
            summary.icon-button
            .settings-content
              [data-difficulty="easy|normal|hard"] buttons
              button#sound
              #control-hint.control-hint
          button#fullscreen.icon-button
      .dpad → [data-direction="up|down|left|right"] buttons (optional)
    #announcement.sr-only[role="status"][aria-live="polite"]
```

Preserve these IDs/classes: shared JS queries them directly and does not mount
or generate the shell. Copy the summary/fullscreen SVGs and accessible labels
from an existing page. Set the overlay's aria-labelledby and the board's
aria-label/aria-describedby. Canvas needs tabindex=0 and meaningful fallback
text. DOM targets should be real buttons with a single selected tab stop and
arrow navigation, following Memory/Mole. Decorative SVGs use aria-hidden=true.

### UI (`window.OG` in shared/ui.js)

| API | Contract |
| --- | --- |
| `OG.createUI({ restart, togglePause })` | Create once after the DOM exists. Reads the game slug and saved difficulty; binds shell controls. It does not initialize game state or run a clock. |
| `ui.difficulty` | Read-only getter: easy, normal, or hard. Invalid saved strings fall back to normal. |
| `restart(true)` callback | Shared Restart and difficulty selection request immediate play. Puzzle callbacks may ignore the argument. Cancel prior work and reset board, timers, score, selection, overlay, and pause state. Call initial `restart()` only after helpers and targets are initialized. |
| `togglePause()` callback | Game owns the paused state; ignore where inapplicable (e.g. completed game). Always synchronize changes with `ui.setPaused(paused)`. |
| `ui.showOverlay(title, message, label, callback, focus = true)` | Makes board inert, displays result/pause/start, announces it, and normally focuses its action. Pass false for initial Ready states when appropriate. |
| `ui.hideOverlay()` | Hides overlay, clears board inertness, and restores board/target focus if focus was on the overlay. |
| `ui.setPaused(value)` | Updates the helper's pause state and button text/aria-pressed. Does not pause simulation by itself. Settings restoration depends on this state being accurate. |
| `ui.announce(message)` | Updates the polite status region. Use meaningful state changes, not frame-by-frame announcements. |
| `OG.storage.get(key, fallback)` / `.set(key, value)` | Adds `opengames:` prefix. Get returns stored string or fallback; set stringifies. Handles denied storage. Validate numeric values in the game. |
| `OG.formatTime(seconds)` | Nonnegative whole minutes:seconds. Convert millisecond timers before calling. |
| `OG.canvasView(canvas, draw)` | Square canvas only. Callback receives `(context, size)` in CSS pixels. Resizes backing buffer for DPR and observes layout; returned `.draw()` requests a redraw. Guard draw before game state is initialized. |
| `OG.reducedMotion.matches` | Live media-query state for JS animation; suppress decorative interpolation/pulses when true. |

Current storage keys are `opengames:sound`, `opengames:<slug>:difficulty`, and
`opengames:<slug>:best:<difficulty>` where a best score exists. Helpers do not
save game sessions. Choose a unique slug and document any new persisted key,
default, validation, and reset behavior. Never rely on storage for core play.

Settings/fullscreen lifecycle is owned by createUI. Do not add competing
Escape/fullscreen listeners or directly toggle settings.open from game code.
The settings helper uses the pause flag and overlay visibility to decide whether
to resume. Inertness only blocks DOM interaction; game callbacks still need
state guards for global keyboard and gamepad input.

### Input (`window.OGInput` in shared/input.js)

`OGInput.bind({ surface, direction, action, pause, restart, hold = false,
swipe = true })` binds once per page. Direction receives up/down/left/right.
Action/start/replay behavior is game-owned; the helper does not know game state.

- Arrows/WASD map to direction; Space/Enter to action outside native interactive
  controls; Escape to pause after the UI's capture handler; R to restart.
- Modifier shortcuts, form editing, and settings keyboard interactions are
  excluded. Custom game keyboard handlers must also respect these contexts.
- Optional `[data-direction]` buttons support pointer capture and keyboard click.
  `hold: true` permits repeats; Labyrinth uses it, Snake uses queued turns.
- Directional swipes use a 20 CSS-pixel threshold. Use `swipe: false` for direct
  target games; those games attach pointer/keyboard handlers themselves.
- Gamepad polling is enabled when a direction callback exists. The first pad's
  D-pad/left stick maps to direction (0.45 axis threshold), A to action, Start
  to pause. Actions are edge-triggered; hold controls movement repeat. Hidden
  pages and open settings suppress gamepad actions. Optional API failure must
  not break other inputs.

For pointerdown-based actions, avoid processing the same pointer again through
click. The existing DOM games accept click when `event.detail === 0` for keyboard
activation. Keep touch-action restrictions on the board/controls, not the whole
site. Do not disable browser zoom in viewport metadata.

### Audio (`window.OGAudio` in shared/audio.js)

Use `OGAudio.play(name)` with move, flip, hit, eat, success, or failure. Unknown
names currently fall back to flip. `.enabled` and `.toggle()` are used by the
shared settings UI. Audio unlocks on player pointer/key gestures. Keep feedback
short, optional, and paired with visible state. Adding an effect belongs in the
shared helper only if it is useful; document any new audio assets and provenance.

## Lifecycle and rules

Explicitly identify ready, playing, paused, and completed states applicable to
the game. Guard actions before mutating state. Keep scoring, collisions, and
completion separate from visual interpolation. Stop loops on pause/completion
and cancel previous frame handles on restart so replay cannot multiply timers.

Use elapsed timestamps for real-time behavior and fixed simulation steps where
needed (Snake is the reference). On resume, reset the frame timestamp so absence
does not become catch-up time. Use remaining active-play time for delayed actions
such as a mismatched pair; wall-clock setTimeout must not resolve gameplay while
paused. Handle visibilitychange and window blur in the game: shared createUI
does not install the game's background-pause handlers. Require deliberate resume.

Test terminal input, rapid actions, restart while paused, difficulty changes
mid-action, and repeated replay. Initialization must leave an immediately usable
board or a single in-board Play action. No mandatory tutorial or setup sequence.

## Design implementation

[shared/style.css](../shared/style.css) owns common tokens, shell, buttons,
settings, fullscreen, and reduced motion. Root [style.css](../style.css) owns
homepage/source layouts. Keep per-game selectors scoped to a board class or
body[data-game]; do not accidentally alter another game's shell.

| Token / convention | Current value |
| --- | --- |
| Paper / ink / muted / line | #f8f7f2 / #252921 / #65685e / #dedfd4 |
| Brand orange and focus outline | #bd411c; 3px visible outline with offset |
| Default (Labyrinth) accent / tint | #416149 / #e4ecdf |
| Snake accent / tint | #3c6045 / #e3eddf |
| Memory accent / tint | #785783 / #eee3f0 |
| Whac-A-Mole accent / tint | #92542b / #f2e4ce |
| Main font stack | Trebuchet MS, Segoe UI, sans-serif |
| Small editorial labels | Courier New, monospace; homepage/source only where appropriate |
| Controls | 44px minimum target height; icon/D-pad buttons 44×44px |
| Surface treatment | Restrained 9–12px radii, thin borders, minimal shadow except popovers |

New games may add a harmonious accent/tint and readable board colors. Check
contrast, keyboard focus, selected/disabled states, and distinguish critical
states by shape, text, or symbols as well as color. Small stat labels are the
existing baseline, not proof of an accessibility audit. Keep instructional text
inside settings and only essential stats visible. Use concise status/result copy.
Animations should acknowledge actions without delaying the next one. Shared CSS
reduces transition/animation duration; canvas animations need the JS check too.

The shell switches to a 160px side panel at >=700px width or >=540px landscape.
Board size is constrained by both viewport dimensions, with a 900px normal and
1000px focused outer-size cap. Short landscape has special spacing/popover
height rules. CSS focus mode accounts for dynamic viewport height and safe-area
insets; never replace it with width-only board sizing.

For rectangular DOM boards, set both the board's aspect-ratio and
`document.body.style.setProperty('--board-ratio', width / height)`, as Memory
does. The variable must be on the body because shared sizing consumes it there.
OG.canvasView always makes a square buffer; a rectangular canvas requires an
explicit adaptation plus DPR/resize tests. A new board shape or large stat panel
requires extending layout checks rather than forcing the old square assumption.

## New-game integration checklist

1. Define the mechanic, start/end conditions, scoring, difficulty (if useful),
   controls, and renderer. Record any new decision in DECISIONS.md.
2. Build the game directory from the closest reference; update slug, title,
   description, accessible board name, stat IDs, input hint, and local scripts.
   Preserve shared shell contracts and implement the lifecycle above.
3. Add original art and any scoped styling; set board ratio and accent/tint.
   Keep targets comfortably tappable at the hardest difficulty on small phones.
4. Add a whole-card link and lightweight SVG preview to ../index.html. Update
   preview color, sequential number, collection count, and “Four”/“04” copy in
   metadata or descriptions to match the actual collection. Do not add a loader
   or runtime registry just to populate a few cards.
5. Add readable GitHub file links to ../source.html using the canonical repo's
   `blob/main/<slug>/...` paths. Update README's game/control/difficulty table,
   introduction, project map as needed, and any changed input claims.
6. Extend the explicit game lists in tests/browser.cjs, tests/focus-browser.cjs,
   and the unavailable-API loop in tests/input-browser.cjs. Update the homepage
   card-count assertion (currently 4). Inspect square-board assumptions, minimum
   board sizes, startup handling, and selectors instead of adding the slug blind.
   Add start-to-finish tests for the new mechanic and applicable input cases.
7. Run the evaluation below, inspect visuals, record actual results/limitations
   in TESTING.md, and update this guide if a shared contract changed. Existing
   games must continue to pass after shared modifications.

## Evaluation and handoff

Use README's commands for `node --test tests/logic.test.cjs` and the three external
Playwright suites. Node's rule tests need Node 18+; browser tooling is documented
for Node 20+. `CHROME_PATH` overrides Chromium's executable; `TEST_URL` overrides
the HTTP origin and should end in `/`. `SKIP_FIREFOX=1` applies to browser/focus
suites; `SKIP_CHROMIUM=1` applies only to the focus suite. The input suite is
Chromium-only. These checks are local scripts, not a configured CI workflow.

| Area | Required evaluation for a new game |
| --- | --- |
| Rules | Win/loss/draw as applicable, legal/illegal moves, boundary conditions, scoring, random-generation invariants, rapid/repeated input. Add deterministic tests when logic warrants them. |
| Lifecycle | First play, pause/resume, immediate restart, difficulty changes during play/pause/result, terminal input, repeated replay, hidden/blurred page and long absence. |
| Layout | 1440×900, 768×1024, 800×600, 390×844, 320×568, 844×390, 568×320; normal and focused mode; hardest/largest board; resize/orientation mid-play. |
| Focus/settings | No page scroll, clipped board, or controls covering targets; open popup stays reachable; preserve prior pause state; native enter/exit and browser Escape; fallback when fullscreen is missing/rejected. |
| Input/accessibility | Natural mouse clicks, taps/swipes as claimed, keyboard-only start-to-finish and visible focus, meaningful names, touch targets >=44×44px, appropriate gamepad, reduced motion, no color-only critical state. |
| Optional APIs | Denied storage, missing/failed audio and gamepad APIs, sound on/off, preference persistence and malformed saved values; play remains available. |
| Rendering/performance | DPR 2 canvas, responsive drawing, smooth animation, no accumulating loops, no console/page errors, no runtime network dependencies; record uncompressed payload including shared files. |
| Distribution | Direct file:// and static HTTP navigation/assets; source/license links; GitHub Pages path compatibility. Verify deployment separately if it is part of the task. |
| Human play | Understand goal within seconds, controls respond predictably, difficulty feels fair, feedback is clear, replay is immediate, art/copy fit the collection. Inspect screenshots and play without forced automation clicks. |

The integration suite uses a controlled clock for gameplay; the focus suite uses
real rendering and fullscreen events. It takes atomic geometry snapshots and
retries read-only checks briefly while layout settles. Do not fake rendering time
or widen tolerances to hide persistent clipping. Headless Firefox may fullscreen
to virtual-monitor dimensions; measure actual innerWidth/innerHeight and retain
separate phone/fallback checks. Existing forced-click helpers test behavior but
cannot establish that a player can reach every control unaided.

Do physical Android/touchscreen playtesting, desktop Chromium and Firefox, and
hardware gamepad testing when support is claimed. Include Safari/iOS when
practical. Record unavailable devices as untested. Layout emulation, synthetic
pads, and muted automation do not establish physical feel, full accessibility,
or audio quality. The original four-game measurements in TESTING.md are dated
historical evidence; remeasure totals when adding assets/games.

For the handoff, state what was added, any changed decision and why, tests run
with browsers/viewports, manual inspection, payload, and unresolved limitations.
Do not invent passes. For documentation-only changes, verify local links and
contracts against source; gameplay suites need not be rerun.
