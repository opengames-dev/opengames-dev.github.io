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
