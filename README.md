# 𐂃 Horse Jump — URL Bar Runner

A tiny runner game that renders directly into the URL hash using Braile characters. Jump across holes, spikes, gators, ride platforms, and avoid ceilings while the scene streams in your address bar. Inspired by https://urlsnake.com/.

## Play
- Open https://diego.horse/jump
- Press SPACE to start.
- Press SPACE to jump.
- Press R to restart (auto-starts the loop after reset).

## Core Rules
- Player sits at a fixed position in the scene and the world scrolls left.
- Jump duration is short and timing-focused.
- On collision, the crash tile is marked with `†`, the URL shows `...GAME_OVER`, and the board stays visible.

## Obstacles and Symbols
- Ground: `⠤`
- Hole: `_`
- Player (grounded): `⠦`
- Jump over ground: `⠥`
- Jump over hole: `⠁`
- Stairs (rideable platforms): `⠒`
  - Jump to mount; while mounted player shows `⠓`
  - While jumping over stairs: `⠓`
- Ceiling (don’t jump under): `⠥`
  - When grounded under ceiling, player shows `⠧`
  - If jumping while under a ceiling, you crash
- Spikes (must jump): `⠴`
  - Jumping over shows `⠵`
- Alligators (must jump): `v`
  - Jumping over shows `v̇`

## Fairness Constraints
- Ceilings only spawn after ground (no obstacle directly before).
- Global gaps ensure early levels avoid unfair clusters.
- Additional per-type minimum gaps avoid back-to-back segments of the same type.

## Levels (Dynamic Difficulty)
The game ramps up using level configs:
- Speed (`tickMs`)
- Spawn probabilities per hazard
- Segment lengths (min/max)
- Minimum gaps between segments and a global hazard gap

Edit `LEVELS` and `LEVEL_THRESHOLDS` in `game.js` to tune difficulty.

## URL Hash Output
- Each tick writes the visible scene to the URL hash.
- On game over: `[scene]GAME_OVER` (no score in the URL).

## Dev Notes
- Code split:
  - `index.html` — shell page and container
  - `game.js` — all game logic and rendering
- Start flow: game waits for first SPACE/ArrowUp to begin; `R` restarts and auto-starts.
- To change glyphs, probabilities, gaps, or speeds, see the constants in `game.js`.

## Local Development
- No build needed. Just open `index.html`.

## License
MIT
