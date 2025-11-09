# 𐂃 Horse Jump — URL Bar Runner

This is a tiny runner game inspired by (URL Snake)[https://demian.ferrei.ro/snake] by (Demian Ferreiro)[https://demian.ferrei.ro/] that renders directly into the URL hash using Braille characters. 

Jump across holes, spikes, gators, ride platforms, and avoid ceilings while the scene streams in your address bar.

## Play
- Open https://diego.horse/jump

Desktop
- Press SPACE to start.
- Press SPACE to jump.
- Press R to restart (auto-starts immediately).

Mobile
- Tap to start.
- Tap to jump.
- Tap after Game Over to restart (auto-starts).

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

## Scoring
- Score increases each tick you survive.
- High score persists in your browser via localStorage and is shown below the score.
- The "Share Score" button shares your current high score.

## URL Bar / Mobile UI
- On desktop, the game renders into your URL bar (window.location.hash).
- On mobile, because the URL bar is not always visible, the page shows a mirror panel of the scene and uses a hidden input to trigger the soft keyboard when needed.
s
## Dev Notes
- Code split:
  - `index.html` — shell page and container
  - `game.js` — all game logic and rendering
- Start flow: game waits for first SPACE/ArrowUp to begin; `R` restarts and auto-starts.
- To change glyphs, probabilities, gaps, or speeds, see the constants in `game.js`.

## Local Development
- No build needed. Just open `index.html`.


## Credits
Built by [Diego Dotta](https://diego.horse) with [Windsurf](https://windsurf.com/refer?referral_code=oy0hdqpvkz4b88ng)

Soundtrack by [Buttlee](https://onlinesequencer.net/1813336)

Sound Effects by [Dragon Studio](https://pixabay.com/users/dragon-studio-38165424/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=390297) and [Pixabay](https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=103633)

## License
This is free and unencumbered software released into the public domain.
