/*
 Tiny Horse, Tiny Jump! — URL Bar Runner
 Author: Diego Dotta — https://diego.horse
 Play: https://diego.horse/jump
 Controls: Desktop — SPACE to start/jump, R to restart (auto-starts). Mobile — Tap to start/jump/restart.
 Scoring: Score increments per tick; High score persists via localStorage; Share button shares high score.
 Audio: soundtrack.mp3 tempo scales with level; start.mp3 on start; jump.m4a on jump; crash.mp3 on crash.
 License: MIT
*/

const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const isSafari = typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|edg/i.test(navigator.userAgent);
let __mobileInit = false;

const SCENE_LENGTH = isMobile ? 40 : 40;
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
const BOULDER_CHAR = 'o';
const JUMP_BOULDER_CHAR = 'ȯ';
const SNAKE_CHAR = 's';
const JUMP_SNAKE_CHAR = 'ṡ';
const TICK_MS = 120;
const BLINK_GAME_OVER = 'GAME⠤OVER⠤⠤𐂃⠤';
const BLINK_RESTART = 'R⠤TO⠤RESTART⠤⠤';
const BLINK_PRESTART = 'PRESS⠤SPACE⠤TO⠤START⠤⠤';
const BLINK_TAIL_TRIM = isMobile ? 25 : 15; // number of chars to trim from base tail during blink
// Level configs (easiest -> hardest)
const LEVELS = [
    { tickMs: 160,
      holeProb: 0.08, minHole: 1, maxHole: 1, gapHoles: 5, gapGlobal: 2,
      stairProb: 0.05, minPlat: 2, maxPlat: 5, gapPlat: 5,
      ceilingProb: 0.04, minCeil: 1, maxCeil: 1, gapCeil: 6,
      spikeProb: 0.06, minSpike: 1, maxSpike: 1, gapSpike: 4,
      gatorProb: 0.00, minGator: 1, maxGator: 1, gapGator: 5,
      boulderProb: 0.05, minBoulder: 1, maxBoulder: 1, gapBoulder: 4,
      snakeProb: 0.00, minSnake: 1, maxSnake: 1, gapSnake: 4 },
    { tickMs: 130,
      holeProb: 0.12, minHole: 1, maxHole: 3, gapHoles: 4, gapGlobal: 1,
      stairProb: 0.08, minPlat: 2, maxPlat: 4, gapPlat: 5,
      ceilingProb: 0.06, minCeil: 1, maxCeil: 2, gapCeil: 6,
      spikeProb: 0.10, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.06, minGator: 1, maxGator: 2, gapGator: 4,
      boulderProb: 0.07, minBoulder: 1, maxBoulder: 2, gapBoulder: 4,
      snakeProb: 0.07, minSnake: 1, maxSnake: 2, gapSnake: 4 },
    { tickMs: 110,
      holeProb: 0.16, minHole: 1, maxHole: 3, gapHoles: 4, gapGlobal: 1,
      stairProb: 0.10, minPlat: 2, maxPlat: 5, gapPlat: 4,
      ceilingProb: 0.08, minCeil: 2, maxCeil: 4, gapCeil: 5,
      spikeProb: 0.14, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.08, minGator: 1, maxGator: 2, gapGator: 4,
      boulderProb: 0.09, minBoulder: 1, maxBoulder: 2, gapBoulder: 3,
      snakeProb: 0.09, minSnake: 1, maxSnake: 2, gapSnake: 3 },
    { tickMs: 95,
      holeProb: 0.20, minHole: 1, maxHole: 3, gapHoles: 3, gapGlobal: 0,
      stairProb: 0.12, minPlat: 3, maxPlat: 6, gapPlat: 3,
      ceilingProb: 0.10, minCeil: 2, maxCeil: 5, gapCeil: 5,
      spikeProb: 0.18, minSpike: 1, maxSpike: 2, gapSpike: 3,
      gatorProb: 0.10, minGator: 1, maxGator: 2, gapGator: 3,
      boulderProb: 0.12, minBoulder: 1, maxBoulder: 3, gapBoulder: 3,
      snakeProb: 0.12, minSnake: 1, maxSnake: 2, gapSnake: 3 },
];
const LEVEL_THRESHOLDS = [0, 100, 200, 300];
// Music tempo per level (aligned with LEVELS). Tune as desired.
const MUSIC_RATES = [0.80, 0.90, 1.0, 1.1];

// Dynamic variables (filled by applyLevel)
let tickMs = TICK_MS;
let holeProb, minHole, maxHole, gapHoles;
let stairProb, minPlat, maxPlat, gapPlat;
let ceilingProb, minCeil, maxCeil, gapCeil;
let spikeProb, minSpike, maxSpike, gapSpike;
let gatorProb, minGator, maxGator, gapGator;
let boulderProb, minBoulder, maxBoulder, gapBoulder;
let snakeProb, minSnake, maxSnake, gapSnake;
let gapGlobal = 0;

let scene = new Array(SCENE_LENGTH).fill(GROUND_CHAR);
let lastEmittedChar = GROUND_CHAR;
let holeCountdown = 0;
let stairCountdown = 0;
let ceilingCountdown = 0;
let spikeCountdown = 0;
let gatorCountdown = 0;
let boulderCountdown = 0;
let snakeCountdown = 0;
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
let boulderGapCountdown = 0;
let lastTileWasBoulder = false;
let snakeGapCountdown = 0;
let lastTileWasSnake = false;
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
let gameOverRafId = null;
// Blinking animation state
let gameOverBlinkRafId = null;
let blinkPhase = 0; // 0: GAME_OVER (3s), 1: PRESS_R_TO_RESTART
let blinkVisible = false;
let blinkPhaseStart = 0;
let lastBlinkToggle = 0;
const BLINK_PERIOD_MS = 400;
const FIRST_PHASE_MS = 3000;

let highScore = 0;

// Level-up blink state
let levelUpPause = false;
let levelUpBlinkRafId = null;
let levelUpBlinkVisible = false;
let levelUpBlinkStart = 0;
let lastLevelUpBlinkToggle = 0;
const LEVEL_BLINK_MS = 2000;
let levelUpDelayTimeoutId = null;

// Pre-start blinking
let preStartBlinkRafId = null;
let preStartBlinkVisible = false;
let lastPreStartBlinkToggle = 0;



let __bgm = null;
let __bgmReady = false;
let __sfxStart = null;
let __sfxJump = null;
let __sfxCrash = null;
let __sfxReady = false;
let __lastJumpSfxAt = 0;

function initSfx() {
    try {
        if (!__sfxStart) {
            __sfxStart = new Audio(domain + '/assets/start.mp3');
            __sfxStart.preload = 'auto';
            __sfxStart.volume = 0.9;
        }
        if (!__sfxJump) {
            __sfxJump = new Audio(domain + '/assets/jump.m4a');
            __sfxJump.preload = 'auto';
            __sfxJump.volume = 0.9;
        }
        if (!__sfxCrash) {
            __sfxCrash = new Audio(domain + '/assets/crash.mp3');
            __sfxCrash.preload = 'auto';
            __sfxCrash.volume = 1.0;
        }
        __sfxReady = true;
    } catch (e) {}
}

function playSafe(a) {
    try { if (a) { const p = a.currentTime = 0, q = a.play(); if (q && typeof q.catch === 'function') q.catch(() => {}); } } catch (e) {}
}

function startMusic() {
    try {
        if (!__bgm) {
            __bgm = new Audio(domain + '/assets/soundtrack.mp3');
            __bgm.loop = true;
            __bgm.preload = 'auto';
            __bgm.volume = 0.6;
            __bgm.addEventListener('canplay', () => { __bgmReady = true; }, { once: true });
            // prefer tempo change affecting pitch naturally
            try { if ('preservesPitch' in __bgm) __bgm.preservesPitch = false; } catch (e) {}
            try { if ('mozPreservesPitch' in __bgm) __bgm.mozPreservesPitch = false; } catch (e) {}
            try { if ('webkitPreservesPitch' in __bgm) __bgm.webkitPreservesPitch = false; } catch (e) {}
            updateMusicForLevel();
        }
        const p = __bgm.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

function stopMusic() {
    try {
        if (__bgm) {
            __bgm.pause();
            __bgm.currentTime = 0;
        }
    } catch (e) {}
}

function resetGame() {
    scene = new Array(SCENE_LENGTH).fill(GROUND_CHAR);
    holeCountdown = 0;
    stairCountdown = 0;
    ceilingCountdown = 0;
    spikeCountdown = 0;
    gatorCountdown = 0;
    boulderCountdown = 0;
    snakeCountdown = 0;
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
    boulderGapCountdown = 0;
    snakeGapCountdown = 0;
    lastTileWasGator = false;
    lastTileWasBoulder = false;
    lastTileWasSnake = false;
    jumping = false;
    jumpFrames = 0;
    onPlatform = false;
    score = 0;
    gameOver = false;
    currentLevel = -1; // force apply on first tick
    waitingStart = true;
    blinkPhase = 0;
    blinkVisible = false;
    blinkPhaseStart = 0;
    lastBlinkToggle = 0;
    try { if (levelUpDelayTimeoutId) { clearTimeout(levelUpDelayTimeoutId); levelUpDelayTimeoutId = null; } } catch (e) {}
    // Load highest score before first mirror
    try {
        const v = parseInt((localStorage && localStorage.getItem('highScore')) || '0', 10);
        if (!isNaN(v)) highScore = v;
    } catch (e) { /* ignore */ }
    writeHash(renderString());
    mirror(renderString());
    if (loopId) clearInterval(loopId);
    if (rafId) cancelAnimationFrame(rafId);
    if (gameOverBlinkRafId) cancelAnimationFrame(gameOverBlinkRafId);
    stopMusic();

    // Start pre-start blink message
    preStartBlinkVisible = false;
    lastPreStartBlinkToggle = performance.now();
    const preFrame = (now) => {
        if (!waitingStart) return; // stop when game starts
        if (now - lastPreStartBlinkToggle >= BLINK_PERIOD_MS) {
            preStartBlinkVisible = !preStartBlinkVisible;
            lastPreStartBlinkToggle = now;
        }
        const base = renderString();
        const maxTrim = Math.min(BLINK_TAIL_TRIM, Math.max(0, base.length - (PLAYER_POS + 1)));
        const baseTrim = base.slice(0, base.length - maxTrim);
        const msg = isMobile ? 'JUMP⠤TO⠤START⠤⠤' : BLINK_PRESTART;
        const composed = baseTrim + (preStartBlinkVisible ? msg : GROUND_CHAR.repeat(msg.length - 1));
        writeHash(composed);
        mirror(composed);
        preStartBlinkRafId = requestAnimationFrame(preFrame);
    };
    preStartBlinkRafId = requestAnimationFrame(preFrame);
}

function startGameLoop() {
    if (!waitingStart) return;
    waitingStart = false;
    lastFrameTime = performance.now();
    if (!__sfxReady) initSfx();
    playSafe(__sfxStart);
    startMusic();
    if (preStartBlinkRafId) cancelAnimationFrame(preStartBlinkRafId);
    const frame = () => {
        if (gameOver) return;
        const now = performance.now();
        if (!levelUpPause && now - lastFrameTime >= tickMs) {
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
        boulderProb = cfg.boulderProb; minBoulder = cfg.minBoulder; maxBoulder = cfg.maxBoulder; gapBoulder = cfg.gapBoulder;
        snakeProb = cfg.snakeProb; minSnake = cfg.minSnake; maxSnake = cfg.maxSnake; gapSnake = cfg.gapSnake;
        gapGlobal = cfg.gapGlobal || 0;

        // Start level-up blink (pause gameplay for 2s)
        const displayLevel = Math.min(currentLevel + 1, LEVELS.length);
        if (displayLevel === 1) {
            if (!levelUpDelayTimeoutId) {
                levelUpDelayTimeoutId = setTimeout(() => {
                    levelUpDelayTimeoutId = null;
                    startLevelUpBlink(displayLevel);
                }, 1000);
            }
        } else {
            startLevelUpBlink(displayLevel);
        }
        updateMusicForLevel();
    }
}

function updateMusicForLevel() {
    try {
        if (!__bgm) return;
        const idx = Math.min(Math.max(currentLevel, 0), MUSIC_RATES.length - 1);
        __bgm.playbackRate = MUSIC_RATES[idx];
    } catch (e) {}
}

function startLevelUpBlink(displayLevel) {
    try { if (levelUpBlinkRafId) cancelAnimationFrame(levelUpBlinkRafId); } catch (e) {}
    levelUpPause = true;
    levelUpBlinkVisible = false;
    levelUpBlinkStart = performance.now();
    lastLevelUpBlinkToggle = levelUpBlinkStart;
    const msg = `LEVEL⠤${displayLevel}${GROUND_CHAR.repeat(BLINK_TAIL_TRIM - 8)}`;
    const frame = (now) => {
        if (gameOver) { levelUpPause = false; return; }
        if (now - levelUpBlinkStart >= LEVEL_BLINK_MS) {
            levelUpPause = false;
            lastFrameTime = performance.now();
            return;
        }
        if (now - lastLevelUpBlinkToggle >= BLINK_PERIOD_MS) {
            levelUpBlinkVisible = !levelUpBlinkVisible;
            lastLevelUpBlinkToggle = now;
        }
        const base = renderString();
        const maxTrim = Math.min(BLINK_TAIL_TRIM, Math.max(0, base.length - (PLAYER_POS + 1)));
        const baseTrim = base.slice(0, base.length - maxTrim);
        const composed = baseTrim + (levelUpBlinkVisible ? msg : GROUND_CHAR.repeat(msg.length - 1));
        writeHash(composed);
        mirror(composed);
        levelUpBlinkRafId = requestAnimationFrame(frame);
    };
    levelUpBlinkRafId = requestAnimationFrame(frame);
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
    if (boulderCountdown > 0) {
        boulderCountdown--;
        lastTileWasBoulder = true;
        lastEmittedChar = BOULDER_CHAR;
        return BOULDER_CHAR;
    }
    if (snakeCountdown > 0) {
        snakeCountdown--;
        lastTileWasSnake = true;
        lastEmittedChar = SNAKE_CHAR;
        return SNAKE_CHAR;
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
    if (lastTileWasBoulder) {
        boulderGapCountdown = gapBoulder;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasBoulder = false;
    }
    if (lastTileWasSnake) {
        snakeGapCountdown = gapSnake;
        globalGapCountdown = Math.max(globalGapCountdown, gapGlobal);
        lastTileWasSnake = false;
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
    if (boulderGapCountdown > 0) {
        boulderGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }
    if (snakeGapCountdown > 0) {
        snakeGapCountdown--;
        lastEmittedChar = GROUND_CHAR;
        return GROUND_CHAR;
    }

    // Spawn new sequences
    if (Math.random() < holeProb) {
        holeCountdown = randomInt(minHole, maxHole) - 1;
        lastEmittedChar = HOLE_CHAR;
        lastTileWasHole = true; // ensure post-segment gap even for single-length
        return HOLE_CHAR;
    }
    if (Math.random() < stairProb) {
        stairCountdown = randomInt(minPlat, maxPlat) - 1;
        lastEmittedChar = STAIR_CHAR;
        lastTileWasStair = true; // ensure post-segment gap even for single-length
        return STAIR_CHAR;
    }
    // Spawn ceiling only if previous tile was ground (no obstacle directly before)
    if (Math.random() < ceilingProb && lastEmittedChar === GROUND_CHAR) {
        ceilingCountdown = randomInt(minCeil, maxCeil) - 1;
        lastEmittedChar = CEILING_CHAR;
        lastTileWasCeiling = true; // ensure post-segment gap even for single-length
        return CEILING_CHAR;
    }
    if (Math.random() < spikeProb) {
        spikeCountdown = randomInt(minSpike, maxSpike) - 1;
        lastEmittedChar = SPIKE_CHAR;
        lastTileWasSpike = true; // ensure post-segment gap even for single-length
        return SPIKE_CHAR;
    }
    if (Math.random() < gatorProb) {
        gatorCountdown = randomInt(minGator, maxGator) - 1;
        lastEmittedChar = GATOR_CHAR;
        lastTileWasGator = true; // ensure post-segment gap even for single-length
        return GATOR_CHAR;
    }
    if (Math.random() < boulderProb) {
        boulderCountdown = randomInt(minBoulder, maxBoulder) - 1;
        lastEmittedChar = BOULDER_CHAR;
        lastTileWasBoulder = true;
        return BOULDER_CHAR;
    }
    if (Math.random() < snakeProb) {
        snakeCountdown = randomInt(minSnake, maxSnake) - 1;
        lastEmittedChar = SNAKE_CHAR;
        lastTileWasSnake = true;
        return SNAKE_CHAR;
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
    if (under === BOULDER_CHAR) return JUMP_BOULDER_CHAR;
    if (under === SNAKE_CHAR) return JUMP_SNAKE_CHAR;
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

let __shareBound = false;
function mirror(s) {
    const elInstr = document.getElementById('instructions');
    const elUrlText = document.getElementById('url-text');
    const elScore = document.getElementById('score-text');
    const elHigh = document.getElementById('high-score-text');
    if (elInstr) {
        if (waitingStart) elInstr.textContent = isMobile ? 'Tap JUMP to start' : 'Press SPACE to start the game in your URL bar.';
        else if (gameOver) elInstr.textContent = isMobile ? 'Game Over! Tap JUMP to restart' : 'Game Over! Press R to restart';
        else elInstr.textContent = isMobile ? 'Tap JUMP to jump. Avoid obstacles.' : 'Press the SPACE to jump. Avoid the obstacles.';
    }
    if (elUrlText) {
        elUrlText.textContent = s;
    }
    if (elScore) {
        elScore.textContent = `🎯 Score: ${score}  Level: ${Math.min(currentLevel+1, LEVELS.length)}`;
    }
    if (elHigh) {
        elHigh.textContent = `🏆 High score: ${highScore}`;
    }
    if (!__shareBound) {
        const btn = document.getElementById('share-btn');
        if (btn) {
            __shareBound = true;
            btn.addEventListener('click', async () => {
                try {
                    const message = `[⠤⠤𐂃⠤⠤⠴ ⠤⠤] Try to beat my tiny horse (my score: ${highScore})! https://diego.horse/jump`;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(message);
                        const old = btn.textContent;
                        btn.textContent = '✅ Copied';
                        setTimeout(() => { btn.textContent = old; }, 1200);
                    }
                    if (navigator.share) {
                        await navigator.share({
                            text: message,
                        });
                    } 
                } catch (e) {
                    // Ignore if user cancels native share
                }
            });
        }
    }
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

    // Boulder rules: like spikes — kill unless jumping or on platform
    if (underPlayer === BOULDER_CHAR && !jumping && !onPlatform) {
        endGame();
        return;
    }

    // Snake rules: like spikes — kill unless jumping or on platform
    if (underPlayer === SNAKE_CHAR && !jumping && !onPlatform) {
        endGame();
        return;
    }

    // Score for each successful tick advanced
    score++;
    if (score > highScore) {
        highScore = score;
        try { localStorage && localStorage.setItem('highScore', String(highScore)); } catch (e) { /* ignore */ }
    }
    applyLevelByScore();

    const s = renderString();
    writeHash(s);
    mirror(s);
}

function endGame() {
  gameOver = true;
  if (loopId) clearInterval(loopId);
  if (rafId) cancelAnimationFrame(rafId);
  if (gameOverRafId) cancelAnimationFrame(gameOverRafId);
  if (gameOverBlinkRafId) cancelAnimationFrame(gameOverBlinkRafId);
  stopMusic();
  if (!__sfxReady) initSfx();
  playSafe(__sfxCrash);
  // Mark crash position and capture final scene
  scene[PLAYER_POS] = '†';
  const base = renderString();
  // Trim some tail characters (right side) to make room for blinking messages, keep crash marker intact
  const maxTrim = Math.min(BLINK_TAIL_TRIM, Math.max(0, base.length - (PLAYER_POS + 1)));
  const baseForBlink = base.slice(0, base.length - maxTrim);
  // Blink sequence: GAME_OVER for 3s, then PRESS_R_TO_RESTART indefinitely
  blinkPhase = 0;
  blinkVisible = false;
  blinkPhaseStart = performance.now();
  lastBlinkToggle = blinkPhaseStart;
  const frame = (now) => {
    if (!gameOver) return;
    // switch phase after 3 seconds
    if (blinkPhase === 0 && now - blinkPhaseStart >= FIRST_PHASE_MS) {
      blinkPhase = 1;
      blinkPhaseStart = now;
      // ensure immediate redraw on phase change
      lastBlinkToggle = now - BLINK_PERIOD_MS;
    }
    // toggle visibility
    if (now - lastBlinkToggle >= BLINK_PERIOD_MS) {
      blinkVisible = !blinkVisible;
      lastBlinkToggle = now;
    }
    const msg = blinkPhase === 0 ? BLINK_GAME_OVER : BLINK_RESTART;
    const composed = baseForBlink + (blinkVisible ? msg : GROUND_CHAR.repeat(msg.length - 1));
    writeHash(composed);
    mirror(composed);
    gameOverBlinkRafId = requestAnimationFrame(frame);
  };
  gameOverBlinkRafId = requestAnimationFrame(frame);
}

function startJump() {
    if (gameOver) return;
    if (jumping) return;
    jumping = true;
    jumpFrames = 5; // frames airborne
    // throttled jump SFX to avoid over-saturation
    const now = performance.now();
    if (!__sfxReady) initSfx();
    if (now - __lastJumpSfxAt > 120) {
        __lastJumpSfxAt = now;
        playSafe(__sfxJump);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (waitingStart) {
            startGameLoop();
            startJump();
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
    try { if (isSafari && !isMobile) { document.documentElement.classList.add('safari-desktop'); } } catch (e) {}
    resetGame();
    initMobileControls();
};

function initMobileControls() {
    if (__mobileInit) return;
    __mobileInit = true;
    const btn = document.getElementById('mobile-jump-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (gameOver) {
            resetGame();
            startGameLoop();
            return;
        }
        if (waitingStart) {
            startGameLoop();
            startJump();
            return;
        }
        startJump();
    });
}
