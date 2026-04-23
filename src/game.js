// ============================================================
// game.js — beat loop, input, hit detection, difficulty, end
// ============================================================

import {
    TIMING, FLOW, DIFFICULTY_LEVELS,
    WIN_STREAK, FAIL_CLICKS, FAIL_FLOW,
    SOFT_END_CLICKS, SOFT_END_CHANCE,
    PATTERN_LENGTH,
} from "./constants.js";

import { updateHUD, updateFlowBar, maybeSendChat, maybeSendMessage, maybeGlitch, showDifficultyLabel } from "./ui.js";
import { updateFakePlayers, updateLeaderboard } from "./players.js";
import { playBeat, playPerfect, playGood, playMiss, playWin, playGlitch } from "./audio.js";

// --- Elements ---
const circle    = document.getElementById("circle");
const ring      = document.getElementById("ring");
const ringOuter = document.getElementById("ring-outer");
const feedback  = document.getElementById("feedback");
const endScreen = document.getElementById("end-screen");
const endTitle  = document.getElementById("end-title");
const endSub    = document.getElementById("end-sub");
const endAccuracy = document.getElementById("end-accuracy");
const endBest   = document.getElementById("end-best");

// Timing ring element (new — added in index.html)
const timingRing = document.getElementById("timing-ring");

// --- State ---
export let gameStarted = false;
export let gameEnded   = false;

let streak        = 0;
let best          = 0;
let totalClicks   = 0;
let correctClicks = 0;
let flowState     = 0;

let pattern      = [];
let patternIndex = 0;
let beatTime     = 0;
let beatInterval = 700; // current beat interval, tracked for timing ring

let beatTimeout      = null;
let activeTimeouts   = [];
let timingRingAnimId = null;

// --- Current difficulty (derived from flowState) ---
function getDifficulty() {
    let level = DIFFICULTY_LEVELS[0];
    for (const d of DIFFICULTY_LEVELS) {
        if (flowState >= d.minFlow) level = d;
    }
    return level;
}

// --- Safe Timeout ---
export function safeTimeout(fn, time) {
    const id = setTimeout(fn, time);
    activeTimeouts.push(id);
    return id;
}

export function getState() {
    return { streak, best, totalClicks, correctClicks, flowState };
}

export function resetState() {
    streak         = 0;
    best           = 0;
    totalClicks    = 0;
    correctClicks  = 0;
    flowState      = 0;
    pattern        = [];
    patternIndex   = 0;
    activeTimeouts = [];
    gameStarted    = true;
    gameEnded      = false;
}

// --- Pattern Generation ---
function generatePattern() {
    pattern = [];
    const diff = getDifficulty();

    for (let i = 0; i < PATTERN_LENGTH; i++) {
        let base = TIMING.BASE_INTERVAL * diff.speedMult;
        const variation = Math.random() * 180;
        pattern.push(Math.max(TIMING.MIN_INTERVAL, base + variation));
    }

    patternIndex = 0;
}

// --- Timing Ring Animation ---
// A shrinking ring that closes in on the circle to show when to click
function animateTimingRing(interval) {
    if (!timingRing) return;
    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);

    const start    = performance.now();
    const hitStart = 260; // ring starts at 260px (ring-outer size)
    const hitEnd   = 150; // closes to circle size (150px)
    // travel window: ring arrives at circle ~100ms before next beat
    const travelTime = interval * 0.85;

    function frame(now) {
        if (gameEnded) {
            timingRing.style.opacity = "0";
            return;
        }
        const elapsed  = now - start;
        const progress = Math.min(elapsed / travelTime, 1);

        // ease in — slow start, fast finish
        const eased = progress * progress;
        const size  = hitStart - (hitStart - hitEnd) * eased;
        const alpha = 0.15 + eased * 0.55;

        timingRing.style.width   = size + "px";
        timingRing.style.height  = size + "px";
        timingRing.style.opacity = alpha;

        if (progress < 1) {
            timingRingAnimId = requestAnimationFrame(frame);
        } else {
            // flash white at impact
            timingRing.style.opacity = "0.9";
            safeTimeout(() => { timingRing.style.opacity = "0"; }, 80);
        }
    }

    timingRingAnimId = requestAnimationFrame(frame);
}

// --- Beat Loop ---
export function beatLoop() {
    if (gameEnded) return;

    if (pattern.length === 0 || patternIndex >= pattern.length) {
        generatePattern();
    }

    const interval = pattern[patternIndex++];
    beatInterval   = interval;
    beatTime       = performance.now();

    pulse();
    playBeat();
    animateTimingRing(interval);

    updateFakePlayers();
    updateLeaderboard(streak);
    maybeSendChat();
    maybeSendMessage({ flowState, streak, totalClicks });

    if (maybeGlitch(flowState, safeTimeout)) playGlitch();

    maybeSoftEnd();
    updateFlowBar(flowState);

    // show difficulty label on level up
    const diff = getDifficulty();
    showDifficultyLabel(diff.label);

    beatTimeout = safeTimeout(() => {
        if (!gameEnded) beatLoop();
    }, interval);
}

// --- Pulse Animation ---
function pulse() {
    circle.classList.add("pulse");
    ring.classList.add("ring-pulse");
    ringOuter.style.transform = "scale(1.05)";
    ringOuter.style.opacity   = "0.4";

    safeTimeout(() => {
        circle.classList.remove("pulse");
        ring.classList.remove("ring-pulse");
        ringOuter.style.transform = "";
        ringOuter.style.opacity   = "";
    }, TIMING.PULSE_DURATION);
}

// --- Input ---
export function handleClick() {
    if (!gameStarted || gameEnded) return;

    const diff    = Math.abs(performance.now() - beatTime);
    const difficulty = getDifficulty();
    totalClicks++;

    if      (diff < difficulty.perfectWindow) perfectHit();
    else if (diff < difficulty.goodWindow)    goodHit();
    else                                      missHit();

    updateStats();
}

// --- Hits ---
function perfectHit() {
    streak++;
    correctClicks++;
    flowState = Math.min(flowState + FLOW.PERFECT_GAIN, FLOW.MAX);
    feedback.innerText = "perfect";
    flashCircle("hit-perfect");
    playPerfect();
}

function goodHit() {
    streak++;
    correctClicks++;
    flowState = Math.min(flowState + FLOW.GOOD_GAIN, FLOW.MAX);
    feedback.innerText = "good";
    flashCircle("hit-good");
    playGood();
}

function missHit() {
    streak    = 0;
    flowState = Math.max(0, flowState - FLOW.MISS_PENALTY);
    feedback.innerText = "miss";
    flashCircle("hit-miss");
    playMiss();
}

function flashCircle(cls) {
    circle.classList.remove("hit-perfect", "hit-good", "hit-miss");
    circle.classList.add(cls);
    safeTimeout(() => circle.classList.remove(cls), TIMING.FLASH_DURATION);
}

// --- Stats & Win/Fail ---
function updateStats() {
    if (streak > best) best = streak;
    updateHUD({ streak, best, totalClicks, correctClicks });

    if (streak >= WIN_STREAK) { playWin(); endGame("master"); return; }

    if (totalClicks > FAIL_CLICKS && streak === 0 && flowState < FAIL_FLOW) {
        endGame("fail");
    }
}

function maybeSoftEnd() {
    if (flowState < FAIL_FLOW && totalClicks > SOFT_END_CLICKS && Math.random() < SOFT_END_CHANCE) {
        endGame("drift");
    }
}

// --- End Game ---
export function endGame(result) {
    if (gameEnded) return;

    console.log("ECHO :: END —", result);
    gameEnded   = true;
    gameStarted = false;

    clearTimeout(beatTimeout);
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts = [];

    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);
    if (timingRing) timingRing.style.opacity = "0";

    if (endScreen) endScreen.classList.remove("hidden");

    const accuracy = totalClicks === 0
        ? "–"
        : Math.floor((correctClicks / totalClicks) * 100) + "%";

    endAccuracy.innerText = "acc: " + accuracy;
    endBest.innerText     = "best: " + best;

    // Persist high score
    const storedBest = parseInt(localStorage.getItem("echo_best") || "0");
    if (best > storedBest) localStorage.setItem("echo_best", best);
    localStorage.setItem("echo_last_accuracy", accuracy);

    if (result === "master") {
        endTitle.innerText = "perfect sync.";
        endSub.innerText   = "you broke it.";
    } else if (result === "drift") {
        endTitle.innerText = "you felt it...";
        endSub.innerText   = "but lost the thread.";
    } else {
        endTitle.innerText = "out of sync.";
        endSub.innerText   = "the pattern goes on.";
    }
}