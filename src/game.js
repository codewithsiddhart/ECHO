// ============================================================
// game.js — beat loop, input, hits, difficulty, timing ring, end
// ============================================================

import {
    TIMING, FLOW, DIFFICULTY_LEVELS,
    WIN_STREAK, FAIL_CLICKS, FAIL_FLOW,
    SOFT_END_CLICKS, SOFT_END_CHANCE, PATTERN_LENGTH,
} from "./constants.js";

import {
    updateHUD, updateFlowBar, maybeSendChat, maybeSendMessage,
    maybeGlitch, showDifficultyLabel, showCombo, updateClickSpeed,
} from "./ui.js";

import { updateFakePlayers, updateLeaderboard } from "./players.js";
import { playBeat, playPerfect, playGood, playMiss, playWin, playGlitch } from "./audio.js";

// --- Elements ---
const circle      = document.getElementById("circle");
const ring        = document.getElementById("ring");
const ringOuter   = document.getElementById("ring-outer");
const timingRing  = document.getElementById("timing-ring");
const feedback    = document.getElementById("feedback");
const endScreen   = document.getElementById("end-screen");
const endTitle    = document.getElementById("end-title");
const endSub      = document.getElementById("end-sub");
const endAccuracy = document.getElementById("end-accuracy");
const endBest     = document.getElementById("end-best");

// --- State ---
export let gameStarted = false;
export let gameEnded   = false;

let streak        = 0;
let best          = 0;
let totalClicks   = 0;
let correctClicks = 0;
let flowState     = 0;
let lastClickDiff = 0;

let pattern      = [];
let patternIndex = 0;
let beatTime     = 0;

let beatTimeout      = null;
let activeTimeouts   = [];
let timingRingAnimId = null;

function getDifficulty() {
    let level = DIFFICULTY_LEVELS[0];
    for (const d of DIFFICULTY_LEVELS) { if (flowState >= d.minFlow) level = d; }
    return level;
}

export function safeTimeout(fn, time) {
    const id = setTimeout(fn, time);
    activeTimeouts.push(id);
    return id;
}

export function getState() {
    return { streak, best, totalClicks, correctClicks, flowState };
}

export function resetState() {
    streak = best = totalClicks = correctClicks = flowState = lastClickDiff = 0;
    pattern = []; patternIndex = 0; activeTimeouts = [];
    gameStarted = true; gameEnded = false;
}

// --- Pattern ---
function generatePattern() {
    pattern = [];
    const diff = getDifficulty();
    for (let i = 0; i < PATTERN_LENGTH; i++) {
        const base      = TIMING.BASE_INTERVAL * diff.speedMult;
        const variation = Math.random() * 180;
        pattern.push(Math.max(TIMING.MIN_INTERVAL, base + variation));
    }
    patternIndex = 0;
}

// --- Timing Ring ---
function animateTimingRing(interval) {
    if (!timingRing) return;
    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);

    const start      = performance.now();
    const fromSize   = 260;
    const toSize     = 150;
    const travelTime = interval * 0.85;

    function frame(now) {
        if (gameEnded) { timingRing.style.opacity = "0"; return; }
        const progress = Math.min((now - start) / travelTime, 1);
        const eased    = progress * progress;
        const size     = fromSize - (fromSize - toSize) * eased;
        const alpha    = 0.1 + eased * 0.65;
        timingRing.style.width   = size + "px";
        timingRing.style.height  = size + "px";
        timingRing.style.opacity = alpha;
        if (progress < 1) {
            timingRingAnimId = requestAnimationFrame(frame);
        } else {
            timingRing.style.opacity = "0.95";
            safeTimeout(() => { if (timingRing) timingRing.style.opacity = "0"; }, 80);
        }
    }
    timingRingAnimId = requestAnimationFrame(frame);
}

// --- Beat Loop ---
export function beatLoop() {
    if (gameEnded) return;
    if (pattern.length === 0 || patternIndex >= pattern.length) generatePattern();

    const interval = pattern[patternIndex++];
    beatTime = performance.now();

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
    showDifficultyLabel(getDifficulty().label);

    beatTimeout = safeTimeout(() => { if (!gameEnded) beatLoop(); }, interval);
}

// --- Pulse ---
function pulse() {
    circle.classList.add("pulse");
    ring.classList.add("ring-pulse");
    ringOuter.style.transform = "scale(1.06)";
    ringOuter.style.opacity   = "0.45";
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
    const diff       = Math.abs(performance.now() - beatTime);
    const difficulty = getDifficulty();
    totalClicks++;
    lastClickDiff = diff;
    updateClickSpeed(diff);

    if      (diff < difficulty.perfectWindow) perfectHit();
    else if (diff < difficulty.goodWindow)    goodHit();
    else                                      missHit();

    updateStats();
}

// --- Hits ---
function perfectHit() {
    streak++; correctClicks++;
    flowState = Math.min(flowState + FLOW.PERFECT_GAIN, FLOW.MAX);
    feedback.innerText = "perfect";
    flashCircle("hit-perfect");
    playPerfect();
    if (streak > 0 && streak % 5 === 0) showCombo(streak);
}

function goodHit() {
    streak++; correctClicks++;
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

// --- Stats ---
function updateStats() {
    if (streak > best) best = streak;
    updateHUD({ streak, best, totalClicks, correctClicks });
    if (streak >= WIN_STREAK) { playWin(); endGame("master"); return; }
    if (totalClicks > FAIL_CLICKS && streak === 0 && flowState < FAIL_FLOW) endGame("fail");
}

function maybeSoftEnd() {
    if (flowState < FAIL_FLOW && totalClicks > SOFT_END_CLICKS && Math.random() < SOFT_END_CHANCE)
        endGame("drift");
}

// --- End ---
export function endGame(result) {
    if (gameEnded) return;
    console.log("ECHO :: END —", result);
    gameEnded = true; gameStarted = false;

    clearTimeout(beatTimeout);
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts = [];
    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);
    if (timingRing) timingRing.style.opacity = "0";

    if (endScreen) endScreen.classList.remove("hidden");

    const accuracy = totalClicks === 0 ? "–" : Math.floor((correctClicks / totalClicks) * 100) + "%";
    endAccuracy.innerText = "acc: " + accuracy;
    endBest.innerText     = "best: " + best;

    const storedBest = parseInt(localStorage.getItem("echo_best") || "0");
    if (best > storedBest) localStorage.setItem("echo_best", best);
    localStorage.setItem("echo_last_accuracy", accuracy);

    if      (result === "master") { endTitle.innerText = "perfect sync.";   endSub.innerText = "you broke it."; }
    else if (result === "drift")  { endTitle.innerText = "you felt it...";  endSub.innerText = "but lost the thread."; }
    else                          { endTitle.innerText = "out of sync.";    endSub.innerText = "the pattern goes on."; }
}