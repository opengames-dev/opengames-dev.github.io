# OpenGames.dev --- Project Plan

## 1. Project Overview

**OpenGames.dev** is a collection of small, polished, open-source
browser games.

The project exists to bring simple games back to basics:

> **No ads. No accounts. No tracking. No installs. Just games.**

Games should be clean, lightweight, immediately understandable, and fun.
They should work on phones, tablets, and PCs using the input methods
that make sense for each device.

The project is intentionally simple. Modern development tools, including
AI, make small games inexpensive to create and maintain. OpenGames.dev
uses that opportunity to create something free and useful rather than
another collection optimized around ads, engagement, or monetization.

The player experience---not monetization---is the highest priority.

------------------------------------------------------------------------

## 2. Core Principles

Every game in OpenGames.dev should follow these principles.

### Free and open

-   All games are free to play.
-   All source code is public.
-   No proprietary game assets.
-   Use an appropriate permissive open-source license for the
    repository.
-   Third-party assets, if ever used, must have compatible open licenses
    and attribution where required.

### Respect the player

-   No advertisements.
-   No accounts or login.
-   No subscriptions.
-   No tracking or analytics that identifies or profiles players.
-   No dark patterns.
-   No artificial waiting.
-   No unnecessary dialogs before playing.
-   No engagement mechanics designed merely to keep the player on the
    site.

### Simple

-   Games should be understandable within seconds.
-   Prefer familiar, timeless game concepts.
-   Avoid unnecessary menus, settings, tutorials, currencies,
    progression systems, etc.
-   A game should start as close to immediately as possible.
-   Restarting should be instant.

### Lightweight

-   Static HTML5 only.
-   No backend.
-   Prefer zero external runtime dependencies.
-   Prefer no build system.
-   Prefer no npm requirement.
-   Keep each game extremely small.
-   Target **\<500 KB per game** where practical.
-   Loading should feel instant on a normal connection.
-   Games should preferably continue working after being cached/offline.

### Universal

Games should work across:

-   Phones
-   Tablets
-   Desktop/laptop PCs

Supported input should include, where appropriate:

-   Touch
-   Mouse
-   Keyboard
-   Gamepad/joystick

Not every input method needs to make sense for every game, but touch and
desktop interaction must always be first-class experiences.

------------------------------------------------------------------------

## 3. Product Identity

The project should not primarily market itself as a collection of
"AI-generated games."

AI and modern development tools make the project practical, but they are
an implementation detail rather than the value offered to players.

The identity is:

> **Small, polished, open-source games that run anywhere.**

A possible homepage message:

> ## Games should be simple.
>
> Somewhere along the way, even the smallest games became filled with
> ads, accounts, subscriptions and tracking.
>
> OpenGames is going back to basics: small, fun, open-source games that
> run anywhere.
>
> **No ads. No accounts. No tracking. Just play.**

The About/README may explain the broader motivation:

> Modern tools have made creating software dramatically cheaper. We
> think some of that should simply become free public infrastructure.

Do not make claims such as "there are absolutely no commercial
intentions." Instead, make durable promises about the product:

> **The games are and will remain free, open source, ad-free and
> playable without an account.**

This leaves room for donations, grants, sponsorship of development, or
other ways to support the project without compromising its principles.

------------------------------------------------------------------------

## 4. Technical Direction

### Hosting

The entire project must be deployable to **GitHub Pages**.

Therefore:

-   No backend.
-   No server-side database.
-   No server-side authentication.
-   No server-side game logic.
-   No required external APIs.
-   Everything necessary to play should be static.

### Technology

Default stack:

-   HTML5
-   CSS
-   Vanilla JavaScript
-   HTML Canvas for games where appropriate
-   Standard browser Web APIs

Do **not** introduce a game engine initially.

Libraries such as Phaser or PixiJS solve problems that these games
generally do not have and introduce dependency weight and additional
abstraction.

Prefer:

> **HTML + CSS + JavaScript + Canvas**

A game that can be implemented cleanly using DOM elements instead of
Canvas may do so. Canvas is not mandatory.

### Build system

Prefer:

-   Zero npm dependencies
-   Zero bundler
-   Zero transpilation
-   Zero build step

Ideally:

1.  Clone the repository.
2.  Open `index.html`.
3.  Play.

GitHub Pages should be able to serve the repository directly.

A build system may only be introduced later if there is a concrete,
compelling need.

------------------------------------------------------------------------

## 5. Repository Structure

Initial proposed structure:

``` text
opengames/
├── index.html
├── style.css
├── README.md
├── LICENSE
│
├── shared/
│   ├── input.js
│   ├── audio.js
│   ├── ui.js
│   └── style.css
│
├── labyrinth/
│   ├── index.html
│   ├── game.js
│   └── style.css        # only if game-specific CSS is needed
│
├── snake/
│   ├── index.html
│   ├── game.js
│   └── style.css
│
├── memory/
│   ├── index.html
│   ├── game.js
│   └── style.css
│
└── whac-a-mole/
    ├── index.html
    ├── game.js
    └── style.css
```

Keep the structure boring and obvious.

Do not create abstractions before they are useful.

The `shared/` directory should contain only behavior genuinely shared by
multiple games. Do not turn it into a custom game engine.

------------------------------------------------------------------------

## 6. OpenGames Game Specification

Every game should satisfy the following baseline.

  -----------------------------------------------------------------------
  Property                            Requirement
  ----------------------------------- -----------------------------------
  Platform                            Modern web browser

  Backend                             None

  Installation                        None

  Ads                                 Never

  Tracking                            Never

  Accounts                            Never

  Graphics                            2D

  Dependencies                        Prefer none

  Assets                              Original, generated for the
                                      project, public domain, or
                                      compatible open license

  Touch                               Supported

  Keyboard/mouse                      Supported where appropriate

  Gamepad                             Supported where appropriate

  Responsive                          Phone through desktop

  Source                              Public

  Startup                             Near-instant

  Restart                             Instant

  Game size                           Target \<500 KB where practical

  Offline                             Preferably works after caching

  Audio                               Simple effects; easy mute control
  -----------------------------------------------------------------------

A game should not be merged simply because it technically works. It
should also feel finished.

------------------------------------------------------------------------

## 7. Visual Direction

The games should use a consistent, deliberately simple visual language.

### Graphics

-   2D only.
-   Simple sprites.
-   Simple geometric shapes are encouraged.
-   Pixel-art-like graphics are acceptable but not mandatory.
-   Avoid large image assets where CSS/Canvas primitives work well.
-   Use simple animations.
-   Avoid visual clutter.
-   Prioritize readability over decoration.

The project does not need elaborate artwork to feel polished.

### Animation

Animations should be:

-   Short
-   Responsive
-   Functional
-   Smooth
-   Non-blocking

Examples:

-   Card flip in Memory
-   Mole pop-up/down
-   Small success animation when leaving a labyrinth
-   Subtle Snake death effect

Avoid long transitions that delay gameplay.

### Sound

Use only small, simple sound effects.

Examples:

-   Move/click
-   Success
-   Failure
-   Card match
-   Mole hit

Prefer tiny generated or programmatically synthesized sounds where
practical.

Requirements:

-   No copyrighted/proprietary audio.
-   Sound must never be required to play.
-   Provide a clearly accessible mute toggle.
-   Remember mute preference locally if useful.

------------------------------------------------------------------------

## 8. Shared UX and Design System

Consistency across games is critical.

The project should feel like one collection rather than unrelated
generated demos.

Create a very small OpenGames design system covering:

-   Typography
-   Color palette
-   Buttons
-   Game title/header
-   Back-to-home control
-   Restart control
-   Pause behavior where relevant
-   Sound toggle
-   Fullscreen behavior
-   Game-over screen
-   Difficulty selection
-   Focus/keyboard behavior
-   Touch interaction
-   Gamepad conventions

Do not over-engineer this into a framework.

### Common game shell

Where practical, every game should have the same basic structure:

``` text
[← Games]       [Game Name]       [Sound] [Fullscreen]

                 GAME AREA

             contextual controls

               score / status
```

On small screens, this should collapse naturally.

### Starting a game

Avoid introductory modal dialogs.

If a game needs configuration such as difficulty, keep it minimal and
inline.

Prefer:

``` text
Easy   Normal   Hard

       PLAY
```

over multi-step setup screens.

For games that need no configuration, gameplay may begin immediately.

### Restart

Restart must always be obvious and fast.

No confirmation dialog.

### Game over / completion

Show a lightweight overlay or state containing:

-   Result
-   Score/time where applicable
-   Replay
-   Optional next difficulty

Do not navigate away from the game.

------------------------------------------------------------------------

## 9. Responsive Design

All games must be designed mobile-first but work equally well on
desktop.

Requirements:

-   No horizontal page scrolling.
-   Game area fits within the available viewport.
-   Respect portrait and landscape layouts.
-   Touch targets must be comfortably sized.
-   UI must remain usable on small phones.
-   Desktop game areas should not become absurdly large on wide
    monitors.
-   Canvas rendering should account for `devicePixelRatio` so graphics
    remain sharp.
-   Prevent accidental browser scrolling/zooming only inside interaction
    areas where necessary.
-   Do not globally break normal browser accessibility behavior.

Where useful, allow fullscreen mode, but never require it.

------------------------------------------------------------------------

## 10. Input Architecture

Input behavior should be normalized enough that games can support
multiple devices without duplicating game logic.

A small `shared/input.js` may provide abstractions such as:

``` text
up
down
left
right
action
pause
restart
```

These can map to:

-   Keyboard
-   Touch controls/swipes
-   Gamepad

Do not force every game into the same input model when it does not fit.

### Keyboard

Use familiar conventions:

-   Arrow keys
-   WASD where useful
-   Space/Enter for action
-   Escape for pause where applicable
-   R for restart where appropriate

### Touch

Touch must not be treated as an afterthought.

Depending on the game, use:

-   Swipe gestures
-   Tap directly on game objects
-   Large directional controls

Do not emulate a tiny desktop keyboard on screen unless necessary.

### Gamepad

Use the browser Gamepad API.

Support gamepads for games where it adds value, particularly:

-   Labyrinth
-   Snake
-   Pong
-   Breakout
-   Platformers
-   Asteroids-like games

Do not add artificial gamepad mappings to games such as Memory if direct
pointer interaction is clearly superior.

------------------------------------------------------------------------

## 11. Accessibility

Even simple games should follow basic accessibility practices.

Where practical:

-   Use semantic HTML for non-game UI.
-   Maintain sufficient contrast.
-   Do not communicate critical state using color alone.
-   Keep keyboard navigation functional.
-   Provide visible focus states.
-   Respect `prefers-reduced-motion`.
-   Allow sound to be disabled.
-   Avoid unnecessarily small text.
-   Avoid interactions requiring extremely precise tapping.

Games with inherently visual mechanics do not need to solve every
accessibility challenge initially, but normal site UI should remain
accessible.

------------------------------------------------------------------------

# 12. Initial Games

The initial release should contain **four games**.

Do not expand the catalog until these four are polished.

The objective is not "four working demos."

The objective is:

> **Four tiny games that feel surprisingly good.**

------------------------------------------------------------------------

## 12.1 Labyrinth

### Concept

Generate a maze and guide a character from the entrance to the exit.

The concept should be understandable without instructions.

### Gameplay

-   Generate a valid random maze.
-   Player starts at a clearly marked location.
-   Exit is visually obvious.
-   Move through corridors.
-   Reaching the exit completes the game.
-   Immediately offer another maze.

### Controls

Desktop:

-   Arrow keys
-   WASD
-   Gamepad D-pad / analog stick

Touch:

-   Swipe gestures and/or large directional controls

Choose whichever touch interaction feels best during implementation.

### Difficulty

Potential levels:

-   Easy --- small maze
-   Normal --- medium maze
-   Hard --- larger maze

Difficulty should primarily alter maze dimensions/complexity.

### Polish

Consider:

-   Smooth movement between cells.
-   Tiny completion animation.
-   Completion time.
-   Optional move counter.
-   Generate a fresh maze instantly.

Do not make score mechanics distract from simply solving the maze.

------------------------------------------------------------------------

## 12.2 Snake

### Concept

Classic Snake.

Move continuously, eat food, grow longer, and avoid hitting yourself or
boundaries.

### Controls

Desktop:

-   Arrow keys
-   WASD
-   Gamepad

Touch:

-   Swipe in the desired direction

Optional visible controls may be provided if testing shows swipe alone
is insufficient.

### Rules

-   Food appears on an unoccupied grid cell.
-   Eating increases score and snake length.
-   Snake gradually speeds up, within reasonable limits.
-   Collision ends the game.
-   Restart is immediate.

### Polish

-   Responsive direction changes.
-   Prevent invalid instant 180° turns.
-   Clear score.
-   High score stored using `localStorage`.
-   Subtle food animation.
-   Small death effect.
-   Fast replay.

Keep it recognizably classic Snake.

------------------------------------------------------------------------

## 12.3 Memory / Concentration

### Concept

Cards are placed face down.

Flip two cards. If they match, they remain revealed. Otherwise, they
flip back.

Find all pairs.

### Controls

-   Direct touch
-   Mouse
-   Keyboard navigation

Gamepad support is optional.

### Difficulty

For example:

-   Easy --- 2×2
-   Normal --- 4×4
-   Hard --- 6×6

Exact board sizes may be adjusted after playtesting.

### Cards

Use simple original symbols rather than external artwork.

Examples:

-   Geometric shapes
-   Simple animals drawn as minimal sprites
-   Objects/icons created specifically for the project
-   Abstract patterns

Avoid dependencies on icon packs unless there is a strong reason.

### Polish

-   Smooth card flip.
-   Short delay before unmatched cards turn back.
-   Match animation.
-   Move counter.
-   Completion time.
-   Immediate replay/new board.

The game should prevent accidental third-card input while evaluating a
pair.

------------------------------------------------------------------------

## 12.4 Whac-A-Mole

### Concept

Moles appear briefly in holes. Hit them before they disappear.

### Layout

Use a simple 3×3 grid initially.

### Controls

Touch/mouse:

-   Directly tap/click a mole.

Keyboard/gamepad:

One possible model is a movable selection/highlight across the 3×3 grid
followed by an action button.

Alternative keyboard mappings may be tested if they feel substantially
better.

### Gameplay

-   Moles appear randomly.
-   A successful hit increases score.
-   Game speed gradually increases.
-   Round has a clear duration.
-   Show final score.
-   Replay instantly.

### Polish

-   Quick mole pop animation.
-   Satisfying hit response.
-   Tiny sound effects.
-   Avoid frustratingly short reaction windows, particularly on Easy.
-   Ensure random generation feels fair.

------------------------------------------------------------------------

# 13. Future Games

Do not implement these until the initial four establish the architecture
and quality bar.

Good future candidates include:

-   Pong
-   Breakout
-   Tic-Tac-Toe
-   Connect Four
-   Minesweeper
-   2048-style sliding-number game
-   Simon
-   Lights Out
-   Sliding puzzle
-   Space Invaders-style shooter
-   Asteroids-style game
-   Simple platformer

When selecting new games, prefer games that are:

-   Immediately recognizable
-   Mechanically simple
-   Fun in short sessions
-   Technically small
-   Suitable for browser controls
-   Legally safe to recreate as generic game mechanics

Avoid copying protected artwork, names, characters, level designs,
sounds, or other proprietary expression from commercial games.

------------------------------------------------------------------------

# 14. Homepage

The root `index.html` is the OpenGames.dev homepage.

It should be extremely lightweight.

## Content

### Hero

Suggested content:

> # OpenGames
>
> **No ads. No accounts. No tracking. Just games.**
>
> Small, fun, open-source games that run anywhere.

### Game list

Display the games as simple cards.

Each card should contain:

-   Small visual preview/icon
-   Game name
-   One-line description
-   Play button or make the entire card clickable

Initial cards:

-   Labyrinth
-   Snake
-   Memory
-   Whac-A-Mole

Do not add ratings, comments, popularity metrics, advertisements,
recommendations, or engagement feeds.

### Project information

A short section near the bottom can explain:

-   Games are open source.
-   Games are lightweight.
-   Contributions are welcome.
-   Link to the source repository.

------------------------------------------------------------------------

# 15. Local State

Use `localStorage` sparingly.

Acceptable examples:

-   Sound enabled/disabled
-   Selected difficulty
-   Local high score
-   Best completion time

Do not use local storage for tracking.

No cross-device account synchronization is needed.

If local data is cleared, nothing important should be lost.

------------------------------------------------------------------------

# 16. Audio Strategy

Prefer Web Audio API and tiny generated/synthesized effects where
possible.

This provides several benefits:

-   Very small footprint
-   No licensing problems
-   No external assets
-   Easy consistency across games

A small shared audio helper may expose effects such as:

``` text
click()
success()
failure()
hit()
```

However, sounds should still fit the game rather than making every game
acoustically identical.

Browser autoplay restrictions must be respected. Initialize audio only
after user interaction where required.

------------------------------------------------------------------------

# 17. Performance

Performance should be treated as a feature.

Targets:

-   Near-instant initial load.
-   Smooth 60 FPS animation on ordinary modern phones where animation is
    used.
-   Minimal memory usage.
-   Minimal DOM complexity.
-   No unnecessary network requests.
-   No giant JavaScript bundles.
-   No loading screen unless genuinely necessary.

Use `requestAnimationFrame` for animation loops.

Game simulation should not unnecessarily depend on rendering frame rate.

Pause or reduce work when the page is hidden where appropriate.

------------------------------------------------------------------------

# 18. Offline / PWA Direction

Offline capability is desirable but should not complicate the first
implementation.

Phase 1:

-   Static games that require no runtime external services.

Later:

-   Add a small service worker.
-   Cache the homepage and game files.
-   Allow previously loaded games to work offline.

PWA installation may be added later if it remains simple.

Do not turn OpenGames.dev into an app-install funnel. Browser play
remains the primary experience.

------------------------------------------------------------------------

# 19. Code Quality

The code should optimize for readability.

These games may be useful not only for playing but also for learning and
remixing.

Prefer:

-   Straightforward JavaScript.
-   Small functions.
-   Clear game state.
-   Clear separation between input, simulation, and rendering where
    useful.
-   Descriptive variable names.
-   Comments explaining non-obvious algorithms.
-   Minimal abstraction.

Avoid:

-   Framework patterns for their own sake.
-   Dependency injection systems.
-   Excessive classes.
-   Generic entity-component systems for tiny games.
-   A custom engine unless future games demonstrate an actual need.

A teenager who knows basic JavaScript should be able to inspect a game
and roughly understand how it works.

------------------------------------------------------------------------

# 20. Testing

Every game should be manually tested on at least:

-   Desktop Chromium-based browser
-   Desktop Firefox
-   Android Chromium-based browser
-   Touchscreen device

Safari/iOS should also be tested when practical.

Test:

-   Portrait
-   Landscape
-   Small screen
-   Large screen
-   Touch
-   Keyboard
-   Mouse
-   Gamepad where supported
-   Audio muted/unmuted
-   Restart
-   Difficulty changes
-   Losing/winning
-   Rapid repeated input
-   Page visibility changes
-   Resizing/orientation changes

Automated tests are useful for deterministic game logic, but do not
introduce a large test framework just to satisfy a process requirement.

------------------------------------------------------------------------

# 21. Definition of Done for a Game

A game is ready to merge only when all applicable items are true:

-   [ ] Playable from start to finish.
-   [ ] Works without a backend.
-   [ ] Works on desktop.
-   [ ] Works on phone/tablet.
-   [ ] Touch controls feel natural.
-   [ ] Keyboard/mouse controls feel natural.
-   [ ] Gamepad works if the game claims gamepad support.
-   [ ] Responsive in portrait and landscape where practical.
-   [ ] No proprietary assets.
-   [ ] No ads.
-   [ ] No tracking.
-   [ ] No account requirement.
-   [ ] Loads quickly.
-   [ ] Restart is immediate.
-   [ ] Win/game-over state is clear.
-   [ ] Sound can be muted.
-   [ ] No major input bugs.
-   [ ] No obvious visual glitches.
-   [ ] No browser console errors during normal play.
-   [ ] Uses the shared OpenGames visual language.
-   [ ] Code is readable.
-   [ ] Game feels polished rather than merely functional.

------------------------------------------------------------------------

# 22. Implementation Phases

## Phase 1 --- Foundation

Create:

-   Repository structure.
-   Homepage.
-   Global visual style.
-   Shared game shell.
-   Basic responsive layout.
-   Shared input utilities where justified.
-   Shared audio utility.
-   Fullscreen helper if needed.
-   GitHub Pages deployment.
-   README.
-   License.

Do not build a generic game engine.

## Phase 2 --- Labyrinth

Implement Labyrinth first.

It is a useful test of:

-   Canvas rendering
-   Responsive scaling
-   Keyboard
-   Touch
-   Gamepad
-   Difficulty
-   Win state
-   Shared game shell

Polish it before moving on.

## Phase 3 --- Snake

Implement Snake.

Use it to validate:

-   Continuous game loops
-   Swipe controls
-   Scoring
-   `localStorage`
-   Game-over/restart UX

## Phase 4 --- Memory

Implement Memory.

Use it to validate:

-   DOM vs Canvas decision-making
-   Pointer interaction
-   Animations
-   Responsive board layout
-   Non-real-time games

Do not force Canvas if CSS/DOM produces a simpler implementation.

## Phase 5 --- Whac-A-Mole

Implement Whac-A-Mole.

Use it to validate:

-   Fast touch interaction
-   Timed rounds
-   Random events
-   Progressive difficulty
-   Hit feedback

## Phase 6 --- Cross-game polish

After all four exist:

-   Normalize shared UI.
-   Remove duplicated code where sharing genuinely improves clarity.
-   Verify visual consistency.
-   Tune touch behavior.
-   Tune audio.
-   Test multiple screen sizes.
-   Test browsers.
-   Check total asset sizes.
-   Improve accessibility.
-   Remove unnecessary dependencies/code.

Only after this phase should additional games be considered.

------------------------------------------------------------------------

# 23. Guidance for Coding Agents

When implementing this plan, optimize in this order:

1.  **Fun**
2.  **Responsiveness**
3.  **Simplicity**
4.  **Polish**
5.  **Portability**
6.  **Code readability**
7.  **Small size**
8.  **Architectural elegance**

Do not sacrifice the first six for clever architecture.

### Important agent rules

-   Do not introduce React, Vue, Svelte, Phaser, PixiJS, TypeScript,
    npm, Vite, Webpack, or another framework/toolchain without a
    concrete requirement that cannot reasonably be satisfied with the
    existing stack.
-   Do not add external CDN dependencies by default.
-   Do not add analytics.
-   Do not add authentication.
-   Do not add a backend.
-   Do not add advertisements.
-   Do not fetch remote assets at runtime.
-   Do not use proprietary assets.
-   Do not create elaborate abstractions before multiple games require
    them.
-   Do not automatically turn repeated code into a framework.
-   Do not prioritize adding more games over polishing existing ones.
-   Do not copy copyrighted game artwork, characters, sounds, or level
    designs.
-   Do not require instructions when the mechanic can be communicated
    through design.
-   Do not create unnecessary loading or splash screens.

When uncertain, choose the smaller and simpler implementation.

------------------------------------------------------------------------

# 24. Design Philosophy for AI-Assisted Development

AI makes it possible to generate many games quickly. That creates a
specific risk:

> **Quantity becomes cheap, but quality does not become automatic.**

OpenGames.dev should deliberately resist becoming a pile of generated
demos.

The project should use AI to reduce implementation cost while
maintaining human-level product judgment.

For every game, ask:

-   Is it actually fun?
-   Does input feel good?
-   Is the difficulty sensible?
-   Does it look intentional?
-   Does it behave correctly on a phone?
-   Can a child understand what to do?
-   Can someone replay instantly?
-   Is anything present that does not need to be there?

A catalog of 10 excellent games is more valuable than 100 mediocre
games.

------------------------------------------------------------------------

# 25. Long-Term Direction

OpenGames.dev can eventually become a curated library of classic and
original lightweight browser games.

Potential future qualities:

-   Dozens of games, each independently understandable.
-   Community contributions.
-   Very small download footprint.
-   Offline play.
-   Installable PWA while retaining ordinary browser play.
-   Educational value because source code is readable.
-   Easy for people to fork and modify.
-   Shared quality and UX standards across all games.

The project should remain intentionally boring from an infrastructure
perspective.

Its sophistication should be visible in **how good the games feel**, not
in the complexity of the technology behind them.

------------------------------------------------------------------------

# 26. Project North Star

When deciding whether to add a feature, dependency, game mechanic,
asset, or architectural abstraction, use this question:

> **Does this make OpenGames simpler, more fun, or more pleasant for the
> player?**

If not, it probably does not belong.

The desired experience is:

1.  Open OpenGames.dev.
2.  See a game.
3.  Tap it.
4.  Play immediately.
5.  Have fun.
6.  Never be asked for anything.

That is the product.
