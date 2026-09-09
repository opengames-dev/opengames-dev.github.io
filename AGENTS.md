# Working on OpenGames

Read [README.md](README.md) for setup, [the game development guide](docs/GAME_DEVELOPMENT.md)
for implementation and evaluation, and [the decision record](docs/DECISIONS.md)
for product, branding, design, and technical rationale before changing a game.
[TESTING.md](TESTING.md) records completed checks and remaining limitations.
[PLAN.md](PLAN.md) preserves the original product brief.

## Which guidance to follow

Current user instructions take precedence. The decision record documents the
accepted implementation and later user review; it supersedes the original
plan's examples where explicitly noted. The development guide describes the
current code contracts. Treat any mismatch between documentation and code as
something to investigate and reconcile, not permission to silently discard a
requirement. Do not treat future ideas or untested targets as shipped features.

## Defaults

- Keep games free, open source, ad-free, and playable without accounts, tracking,
  installs, a backend, or external runtime services.
- Use static HTML, CSS, ordinary deferred JavaScript, and local assets. Preserve
  direct `file://` play and GitHub Pages hosting. No runtime packages or build
  step without a concrete need the existing stack cannot reasonably satisfy.
- Reuse the shared shell, input, audio, and UI helpers. Keep rules and state in
  the game folder; extract shared behavior only when multiple games need it.
- Make the board dominant. Keep instructions/difficulty/sound in settings.
  Fullscreen hides page branding/navigation and keeps controls clear of targets.
- Use original geometric SVG/CSS/canvas artwork, the existing palette and fonts,
  short functional game copy, accessible controls, and optional sound.
- Preserve instant restart, pause/resume, keyboard/touch behavior, reduced motion,
  and safe handling of unavailable optional browser APIs.
- Optimize for fun, responsiveness, simplicity, polish, portability, readability,
  and small size before architectural elegance. A request to add a game is
  authorization to do so; keep the existing collection working while adding it.

## Finishing a change

Follow the new-game integration checklist and evaluation matrix in the guide.
Choose checks appropriate to the change; shared behavior/layout changes need
cross-game verification. Documentation-only edits need link/accuracy checks,
not a gameplay rerun. Never describe emulation as physical-device testing.
Update the decision record for new or changed choices, the development guide
for contract changes, and TESTING.md with actual evidence and open limitations.
Keep prior work intact; do not commit, push, or deploy merely to document a change.
