// URL Bar Runner
const SCENE_LENGTH = 40;
const PLAYER_POS = 3; // fixed player position in the scene
const GROUND_CHAR = '⠤';
const HOLE_CHAR = '_'; // Braille blank U+2800
const PLAYER_CHAR = '⠦';
const JUMP_GROUND_CHAR = '⠥';
const JUMP_HOLE_CHAR = '⠁';
const STAIR_CHAR = '⠒';
const JUMP_STAIR_CHAR = '⠓';
const PLAYER_STAIR_CHAR = '⠓';
const CEILING_CHAR = '⠥';
const PLAYER_UNDER_CEILING_CHAR = '⠧';
const SPIKE_CHAR = '⠴';
const JUMP_SPIKE_CHAR = '⠵';
const GATOR_CHAR = 'v';
const JUMP_GATOR_CHAR = 'v̇';
const TICK_MS = 120;
// Level configs (easiest -> hardest)
const LEVELS = [
    { tickMs: 160, holeProb: 0.08, minHole: 1, maxHole: 2, gapHoles: 5, gapGlobal: 2,
      stairProb: 0.05, minPlat: 2, maxPlat: 3, gapPlat: 5,
      ceilingProb: 0.04, minCeil: 2, maxCeil: 2, gapCeil: 6,
      spikeProb: 0.06, minSpike: 1, maxSpike: 1, gapSpike: 4,
      gatorProb: 0.04, minGator: 1, maxGator: 1, gapGator: 5 },
    { tickMs: 130, holeProb: 0.12, minHole: 1, maxHole: 3, gapHoles: 4, gapGlobal: 1,
      stairProb: 0.08, minPlat: 2, maxPlat: 4, gapPlat: 5,
      ceilingProb: 0.06, minCeil: 2, maxCeil: 4, gapCeil: 6,
      spikeProb: 0.10, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.06, minGator: 1, maxGator: 2, gapGator: 4 },
    { tickMs: 110, holeProb: 0.16, minHole: 1, maxHole: 3, gapHoles: 4, gapGlobal: 1,
      stairProb: 0.10, minPlat: 2, maxPlat: 5, gapPlat: 4,
      ceilingProb: 0.08, minCeil: 2, maxCeil: 4, gapCeil: 5,
      spikeProb: 0.14, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.08, minGator: 1, maxGator: 2, gapGator: 4 },
    { tickMs: 95, holeProb: 0.20, minHole: 1, maxHole: 3, gapHoles: 3, gapGlobal: 0,
      stairProb: 0.12, minPlat: 2, maxPlat: 6, gapPlat: 3,
      ceilingProb: 0.10, minCeil: 2, maxCeil: 5, gapCeil: 5,
      spikeProb: 0.18, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.10, minGator: 1, maxGator: 2, gapGator: 3 },
];
const LEVEL_THRESHOLDS = [0, 80, 180, 320];

// Dynamic variables (filled by applyLevel)
let tickMs = TICK_MS;
let holeProb, minHole, maxHole, gapHoles;
let stairProb, minPlat, maxPlat, gapPlat;
let ceilingProb, minCeil, maxCeil, gapCeil;
let spikeProb, minSpike, maxSpike, gapSpike;
let gatorProb, minGator, maxGator, gapGator;
let gapGlobal = 0;

let scene = new Array(SCENE_LENGTH).fill(GROUND_CHAR);
let lastEmittedChar = GROUND_CHAR;
let holeCountdown = 0;
let stairCountdown = 0;
let ceilingCountdown = 0;
let spikeCountdown = 0;
let gatorCountdown = 0;
let gapCountdown = 0;
let globalGapCountdown = 0;
let lastTileWasHole = false;
let stairGapCountdown = 0;
let lastTileWasStair = false;
let ceilingGapCountdown = 0;
let lastTileWasCeiling = false;
let spikeGapCountdown = 0;
let lastTileWasSpike = false;
let gatorGapCountdown = 0;
let lastTileWasGator = false;
let jumping = false;
let jumpFrames = 0; // remaining frames of jump
let onPlatform = false;
let score = 0;
let loopId = null;
let gameOver = false;
let rafId = null;
let lastFrameTime = 0;
let currentLevel = -1;
let waitingStart = true;

function resetGame() {
    scene = new Array(SCENE_LENGTH).fill(GROUND_CHAR);
    holeCountdown = 0;
    stairCountdown = 0;
    ceilingCountdown = 0;
    spikeCountdown = 0;
    gatorCountdown = 0;
    gapCountdown = 0;
    globalGapCountdown = 0;
    lastEmittedChar = GROUND_CHAR;
    lastTileWasHole = false;
    stairGapCountdown = 0;
    lastTileWasStair = false;
    ceilingGapCountdown = 0;
    lastTileWasCeiling = false;
    spikeGapCountdown = 0;
    lastTileWasSpike = false;
    gatorGapCountdown = 0;
    lastTileWasGator = false;
    jumping = false;
    jumpFrames = 0;
    onPlatform = false;
    score = 0;
    gameOver = false;
    currentLevel = -1; // force apply on first tick
    waitingStart = true;
    writeHash(renderString());
    mirror(renderString());
    if (loopId) clearInterval(loopId);
    if (rafId) cancelAnimationFrame(rafId);
}

function startGameLoop() {
    if (!waitingStart) return;
    waitingStart = false;
    lastFrameTime = performance.now();
    const frame = () => {
        if (gameOver) return;
        const now = performance.now();
        if (now - lastFrameTime >= tickMs) {
            lastFrameTime = now;
            tick();
        }
        rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
}

function applyLevelByScore() {
    let newLevel = 0;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (score >= LEVEL_THRESHOLDS[i]) newLevel = i;
    }
    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        const cfg = LEVELS[Math.min(newLevel, LEVELS.length - 1)];
        tickMs = cfg.tickMs;
        holeProb = cfg.holeProb; minHole = cfg.minHole; maxHole = cfg.maxHole; gapHoles = cfg.gapHoles;
        stairProb = cfg.stairProb; minPlat = cfg.minPlat; maxPlat = cfg.maxPlat; gapPlat = cfg.gapPlat;
        ceilingProb = cfg.ceilingProb; minCeil = cfg.minCeil; maxCeil = cfg.maxCeil; gapCeil = cfg.gapCeil;
        spikeProb = cfg.spikeProb; minSpike = cfg.minSpike; maxSpike = cfg.maxSpike; gapSpike = cfg.gapSpike;
        gatorProb = cfg.gatorProb; minGator = cfg.minGator; maxGator = cfg.maxGator; gapGator = cfg.gapGator;
        gapGlobal = cfg.gapGlobal || 0;
    }
}

function randomInt(min, max) { // inclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextTile() {
    // Continue existing sequences
    if (holeCountdown > 0) {
        holeCountdown--;
        lastTileWasHole = true;
        lastEmittedChar = HOLE_CHAR;
        return HOLE_CHAR;
    }
    if (stairCountdown > 0) {
        stairCountdown--;
        lastTileWasStair = true;
        lastEmittedChar = STAIR_CHAR;
        return STAIR_CHAR;
    }
    if (ceilingCountdown > 0) {
        ceilingCountdown--;
        lastTileWasCeiling = true;
        lastEmittedChar = CEILING_CHAR;
        return CEILING_CHAR;
    }
    if (spikeCountdown > 0) {
        spikeCountdown--;
        lastTileWasSpike = true;
        lastEmittedChar = SPIKE_CHAR;
        return SPIKE_CHAR;
    }
    if (gatorCountdown > 0) {
        gatorCountdown--;
        lastTileWasGator = true;
        lastEmittedChar = GATOR_CHAR;
        return GATOR_CHAR;
    }

    // If we just ended a sequence, start enforcing gaps
    if (lastTileWasHole) {
        gapCountdown = gapHoles;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasHole = false;
    }
    if (lastTileWasStair) {
        stairGapCountdown = gapPlat;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasStair = false;
    }
    if (lastTileWasCeiling) {
        ceilingGapCountdown = gapCeil;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasCeiling = false;
    }
    if (lastTileWasSpike) {
        spikeGapCountdown = gapSpike;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasSpike = false;
    }
    if (lastTileWasGator) {
        gatorGapCountdown = gapGator;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasGator = false;
    }

    // Enforce gaps
    if (gapCountdown > 0) {
        gapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (globalGapCountdown > 0) {
        globalGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (stairGapCountdown > 0) {
        stairGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (ceilingGapCountdown > 0) {
        ceilingGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (spikeGapCountdown > 0) {
        spikeGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (gatorGapCountdown > 0) {
        gatorGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }

    // Spawn new sequences
    if (Math.random() < holeProb) {
        holeCountdown = randomInt(minHole, maxHole) - 1;
        lastEmittedChar = HOLE_CHAR;
        return HOLE_CHAR;
    }
    if (Math.random() < stairProb) {
        stairCountdown = randomInt(minPlat, maxPlat) - 1;
        lastEmittedChar = STAIR_CHAR;
        return STAIR_CHAR;
    }
    // Spawn ceiling only if previous tile was ground (no obstacle directly before)
    if (Math.random() < ceilingProb && lastEmittedChar === GROUND_CHAR) {
        ceilingCountdown = randomInt(minCeil, maxCeil) - 1;
        lastEmittedChar = CEILING_CHAR;
        return CEILING_CHAR;
    }
    if (Math.random() < spikeProb) {
        spikeCountdown = randomInt(minSpike, maxSpike) - 1;
        lastEmittedChar = SPIKE_CHAR;
        return SPIKE_CHAR;
    }
    if (Math.random() < gatorProb) {
        gatorCountdown = randomInt(minGator, maxGator) - 1;
        lastEmittedChar = GATOR_CHAR;
        return GATOR_CHAR;
    }

    lastEmittedChar = GROUND_CHAR;
    return GROUND_CHAR;
}

function playerChar() {
    const under = scene[PLAYER_POS];
    if (onPlatform && !jumping) return PLAYER_STAIR_CHAR;
    if (!jumping) {
        if (under === CEILING_CHAR) return PLAYER_UNDER_CEILING_CHAR;
        return PLAYER_CHAR;
    }
    if (under === SPIKE_CHAR) return JUMP_SPIKE_CHAR;
    if (under === GATOR_CHAR) return JUMP_GATOR_CHAR;
    if (under === STAIR_CHAR) return JUMP_STAIR_CHAR;
    return under === HOLE_CHAR ? JUMP_HOLE_CHAR : JUMP_GROUND_CHAR;
}

function renderString() {
    let s = '';
    for (let i = 0; i < SCENE_LENGTH; i++) {
        if (i === PLAYER_POS) {
            s += gameOver ? scene[i] : playerChar();
        } else {
            s += scene[i];
        }
    }
    return s;
}

function writeHash(s) {
    // Use replace so we don't spam history
    const newHash = encodeURIComponent(s);
    if (window.location.hash.substring(1) !== newHash) {
        const urlNoHash = window.location.href.split('#')[0];
        history.replaceState(null, '', urlNoHash + '#' + newHash);
    }
}

function mirror(s) {
    const el = document.getElementById('game-container');
    if (!el) return;
    const lines = [];
    if (waitingStart) lines.push('Press SPACE to start\n\n');
    if (gameOver) lines.push('Game Over - Press R to restart\n\n');
    if (!gameOver && !waitingStart) lines.push('Press SPACE to jump. Avoid obstacles.\n\n');
    lines.push(s);
    lines.push(`Score: ${score}  Level: ${Math.min(currentLevel+1, LEVELS.length)}`);

    el.textContent = lines.join('\n');
}

function tick() {
    if (gameOver) return;

    // Scroll scene left and append next tile
    scene.shift();
    scene.push(nextTile());

    // Update jump state
    if (jumping) {
        jumpFrames--;
        if (jumpFrames <= 0) jumping = false;
    }

    // Collision: if under player is a hole and not jumping
    const underPlayer = scene[PLAYER_POS];
    // Update platform state when moving off obstacles
    if (onPlatform && underPlayer !== STAIR_CHAR && !jumping) {
        onPlatform = false;
    }

    // Collide with hole when not jumping and not on platform
    if (underPlayer === HOLE_CHAR && !jumping && !onPlatform) {
        endGame();
        return;
    }

    // Obstacle rules: must jump to get on top
    if (underPlayer === STAIR_CHAR) {
        if (jumping) {
            onPlatform = true;
        } else if (!onPlatform) {
            endGame();
            return;
        }
    }

    // Ceiling rules: jumping under ceiling collides
    if (underPlayer === CEILING_CHAR && jumping) {
        endGame();
        return;
    }

    // Spike rules: spikes kill unless jumping or on platform
    if (underPlayer === SPIKE_CHAR && !jumping && !onPlatform) {
        endGame();
        return;
    }

    // Alligator rules: like spikes — kill unless jumping or on platform
    if (underPlayer === GATOR_CHAR && !jumping && !onPlatform) {
        endGame();
        return;
    }

    // Score for each successful tick advanced
    score++;
    applyLevelByScore();

    const s = renderString();
    writeHash(s);
    mirror(s);
}

function endGame() {
    gameOver = true;
    if (loopId) clearInterval(loopId);
    if (rafId) cancelAnimationFrame(rafId);
    // Mark crash position
    scene[PLAYER_POS] = '†';
    const s = renderString();
    // Append [GAME_OVER] to URL only
    writeHash(s + 'GAME_OVER');
    // Mirror shows the board and prompt
    mirror(s);
}

function startJump() {
    if (gameOver) return;
    if (jumping) return;
    jumping = true;
    jumpFrames = 5; // frames airborne
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (waitingStart) {
            startGameLoop();
            return;
        }
        startJump();
    }
    if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetGame();
        startGameLoop();
    }
});

window.onload = () => {
    resetGame();
};
