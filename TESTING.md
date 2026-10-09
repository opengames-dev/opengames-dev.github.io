# Verification record

For future changes, use the [evaluation matrix](docs/GAME_DEVELOPMENT.md#evaluation-and-handoff)
and [decision record](docs/DECISIONS.md). The passes below describe the original
four games and the focused-layout review; they do not automatically cover future
games or changes.

## Recording future verification

Append or update evidence for each meaningful implementation change: date and
scope, commands/suites, browser versions and environment, viewports/difficulties,
manual visual/play checks, payload measurements when changed, and failures or
untested devices. Distinguish automated emulation from physical-device checks.
Preserve historical scope instead of relabeling old results as current passes.
Documentation-only edits need link and source-contract checks, not gameplay runs.

## Baseline environment

Verified on 2026-09-09 in desktop Chromium (Google Chrome) and Playwright Firefox.
The app was served with Python's static HTTP server and opened directly using
`file://`. Browser tooling was installed outside the project.

## Passed

- Five Node test groups, including 120 seeded mazes and Snake's collision,
  growth, food placement, reversal, queued turn, and full-board rules.
- Desktop 1280×900, phone 390×844, small phone 320×568, and landscape 844×390:
  all game boards fit, with no horizontal page overflow.
- Generated-maze completion through keyboard input; pause and immediate reset.
- Snake fruit collection, score persistence, collision, pause, and instant replay.
- Memory mismatch timing, blocked third-card input, paused pair evaluation,
  keyboard navigation, difficulty changes during play, completion, and reset.
- Memory's 20-card Hard board has touch targets at least 44×44 CSS pixels on
  a 320-pixel-wide phone. Its 5×4 layout is an intentional adjustment to the
  example 6×6 board in `PLAN.md`.
- Whac-A-Mole hit detection, double-hit protection, nonrepeating hole selection,
  numeric keyboard input, 30-second round completion, pause, and instant replay.
- Touch taps and a browser-injected touch swipe; 2× canvas backing resolution.
- Synthetic standard-gamepad stick, D-pad, action, and pause inputs.
- Hidden-page pause with a simulated 60-second absence; no simulation advancement.
- All four games remain playable when storage, audio, and gamepad APIs throw.
- Sound toggle, difficulty persistence, and Chromium fullscreen entry/exit.
- Direct file playback for all games in Chromium and Firefox.
- No JavaScript page errors or browser console errors in the integration suite.
- JavaScript syntax, local HTML links, fragment targets, and duplicate-ID checks.
- Visual inspection of the homepage and game layouts, including small-phone
  Memory/Labyrinth, landscape Memory, card flips, and mole pop-up rendering.

Each game is under **40 KB uncompressed**, including every shared asset. All
homepage and game runtime files together are under 90 KB. Documentation and
optional tests are separate from game payloads.

## Focused-layout review

The shared game shell removes subtitles, decorative section labels, footers,
and always-visible instructions. Fullscreen hides the title and home link.
Difficulty, sound, and optional instructions are available through settings.

The focus suite checks all four games in Chromium and Firefox at 1440×900,
768×1024, 800×600, 390×844, 320×568, 844×390, and 568×320. It checks page scroll,
board and control bounds, side-by-side tablet/desktop layouts, larger fullscreen
boards, unobstructed game cells, menu bounds, native fullscreen entry/exit,
Escape, prior pause-state preservation, and the no-Fullscreen-API fallback.

Firefox headless switches to its virtual monitor dimensions for native
fullscreen. Those checks use the actual fullscreen viewport; phone fullscreen
layouts are additionally checked in Chromium and with the API fallback.

## Flap and Blocks (2026-10-09)

Scope: two new games (Flap, Blocks) and two backward-compatible shared changes:
non-square `OG.canvasView` sizing and the `repeat` argument passed by `OGInput`.
All six games were rerun, since the shared helpers changed.

Environment: Linux; Google Chrome 154 (via `CHROME_PATH`) and Playwright
Firefox 155 (revision 1543). Only Node 18 was installed, and Playwright
requires Node 20+. So the browser suites ran under Bun 1.4 with an existing
Playwright 1.63 install outside the repository (`NODE_PATH`). The logic suite
ran under Node 18. Served by `python3 -m http.server` on port 8093
(`TEST_URL=http://127.0.0.1:8093/`; 8080 was occupied).

Passed:

- `node --test tests/logic.test.cjs`: 16 tests. New Flap tests cover hover
  start, gravity, safe ceiling, ground/post crashes, rejected input after a
  crash, one point per post, gap bounds/shift limits over 30 seeds per
  difficulty, even spacing, and an autopilot clearing 50 posts on every
  difficulty for 10 seeds. New Blocks tests cover seven-piece bags,
  rotation cycles, wall/stack blocking, wall kicks, O not rotating, level
  gravity, lock delay with reset, multi-line and split clears with collapse,
  line/drop scoring, level-up every 10 lines, and top-out.
- `tests/browser.cjs`, Chromium and Firefox: all six games at 1280×900, 390×844,
  320×568, 844×390, with no horizontal overflow, Flap square and Blocks 1:2
  boards, and DPR-sized buffers on both axes. Flap: hover until the first
  tap/click, keyboard flaps, scoring, pause freezing the bird, ground crash,
  replay with Space and R, and best score persisting across a reload. Blocks:
  Up rotates once while held, X/Z, wall stop, soft drop, hard-drop line clear,
  pause freezing gravity, Easy gravity timing, top-out with the best-score
  message, Enter replay, the on-screen Drop button, and the Next label. Direct
  `file://` playback for all six games. No console or page errors.
- `tests/input-browser.cjs` (Chromium, touch emulation, DPR 2): Flap touch tap
  and gamepad A / D-pad up flaps, gamepad pause. Blocks tap-to-rotate, drag to
  move without also rotating, gamepad A hard drop, and held D-pad up rotating
  once. All six games stay playable when storage, audio, and gamepad APIs throw.
- `tests/focus-browser.cjs`, Chromium and Firefox: all six games at all seven
  viewports, normal and native fullscreen. No scroll, no clipped board, no
  controls over the board, side panel where expected, settings reachable,
  Escape, preserved pause state, and fullscreen fallback. The first run caught
  Blocks' well shrinking in 768×1024 fullscreen; it now uses the side-panel
  focus layout there.
- JavaScript syntax, local links/assets, and duplicate-ID checks on all pages.
- Visual inspection of screenshots: Flap at 1440×900, 390×844, 844×390 (ready,
  hover, flight, game over). Blocks at 1440×900, 390×844, 320×568, 844×390,
  normal and focused. The new homepage cards.

Payload, uncompressed and including shared runtime files: Flap 40.2 KB, Blocks
48.1 KB; the other four games remain 37–39 KB. All homepage and game runtime
files total 131 KB.

Not verified: no human playtest of feel (flap strength, gap fairness, Blocks
key-repeat timing, which follows the OS), no physical phones, tablets, Safari,
or hardware gamepads, and no audible sound check. Blocks' well is small in
short landscape and on 320×568 phones (about 14px cells), though its controls
are 44px buttons and whole-board gestures; physical-device feel there is
untested.

### Blocks drawing fix and asset versioning (2026-10-09, later)

The user reported a stretched, smeared Blocks well. It was reproduced by serving
the previous `shared/ui.js` to the new Blocks page: the old helper made a square
buffer and passed no height, so the fill and clear were skipped and frames
accumulated. Fixed with versioned asset URLs (D13), and Blocks now derives its
drawing height from the width. Tiles were redesigned at the user's request
and inspected at 390×844 and 1440×900, along with the matching homepage
preview. Reran: logic suite (16 pass); `browser.cjs` in Chromium and Firefox,
now also asserting one asset token across all pages; `input-browser.cjs`; and
`focus-browser.cjs` in Chromium only (Firefox not rerun for this change, which
did not affect layout CSS). Cache behaviour itself is not automated; the token
check guards the convention.

## Device checks still needed

Touch and mobile layouts were tested through desktop browser emulation, not
physical Android/iOS devices. Physical touchscreen feel, hardware gamepads,
Safari/iOS, and audible sound quality still need hands-on checks before calling
all of `PLAN.md`'s device-specific acceptance items complete. These limitations
are not covered by the automated passing results above.

GitHub Pages deployment has not been verified as part of these checks.
The static files, relative paths, `.nojekyll`, and publishing instructions are ready; no service-worker offline cache is included
in this first release.

## Repeat the checks

See `README.md` for setup. Run the built-in logic suite, `tests/browser.cjs` for
Chromium and Firefox integration, and `tests/input-browser.cjs` for Chromium's
input and unavailable-API cases. `tests/focus-browser.cjs` covers responsive
layout, fullscreen, the settings menu, and the fullscreen fallback. For physical playtesting, use the device and
interaction checklist in section 20 of `PLAN.md`.
