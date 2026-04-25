// ============================================================
// game.js — beat loop, input, all features wired
// ============================================================

import { TIMING, FLOW, DIFFICULTY_TIERS, SOFT_END_CLICKS, SOFT_END_CHANCE, PATTERN_LENGTH } from "./constants.js";
import { getMode } from "./modes.js";
import {
    updateHUD, updateFlowBar, maybeSendChat, maybeSendMessage,
    maybeGlitch, showDifficultyLabel, showCombo, updateClickSpeed,
    showMilestone, applyModeTheme,
} from "./ui.js";
import { updateFakePlayers, updateLeaderboard } from "./players.js";
import { playBeat, playPerfect, playGood, playMiss, playWin, playGlitch, updateDrone, stopDrone, playStreakBell } from "./audio.js";
import { shake } from "./shake.js";
import { ghostReset, ghostRecord, ghostSaveIfBetter, hasGhost } from "./ghost.js";
import { replayReset, replayRecord, replayRender } from "./replay.js";

// ── Elements ────────────────────────────────────────────────
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
const endMode     = document.getElementById("end-mode");

// ── State ───────────────────────────────────────────────────
export let gameStarted = false;
export let gameEnded   = false;

let streak        = 0;
let best          = 0;
let totalClicks   = 0;
let correctClicks = 0;
let flowState     = 0;
let beatCount     = 0;

let pattern      = [];
let patternIndex = 0;
let beatTime     = 0;

let beatTimeout      = null;
let activeTimeouts   = [];
let timingRingAnimId = null;

// ── Difficulty tier (flow-based, on top of mode) ────────────
function getTier() {
    let tier = DIFFICULTY_TIERS[0];
    for (const t of DIFFICULTY_TIERS) { if (flowState >= t.minFlow) tier = t; }
    return tier;
}

function getCurrentWindows() {
    const mode = getMode();
    const tier = getTier();
    return {
        perfectWindow: mode.perfectWindow * tier.windowMult,
        goodWindow:    mode.goodWindow    * tier.windowMult,
    };
}

// ── Safe timeout ────────────────────────────────────────────
export function safeTimeout(fn, time) {
    const id = setTimeout(fn, time);
    activeTimeouts.push(id);
    return id;
}

export function getState() {
    return { streak, best, totalClicks, correctClicks, flowState };
}

export function resetState() {
    streak = best = totalClicks = correctClicks = flowState = beatCount = 0;
    pattern = []; patternIndex = 0; activeTimeouts = [];
    gameStarted = true; gameEnded = false;
    ghostReset();
    replayReset();
    applyModeTheme(getMode());
}

// ── Pattern generation ───────────────────────────────────────
function generatePattern() {
    pattern = [];
    const mode = getMode();
    const tier = getTier();
    for (let i = 0; i < PATTERN_LENGTH; i++) {
        const base      = mode.baseInterval * tier.speedMult;
        const variation = Math.random() * 160;
        pattern.push(Math.max(mode.minInterval, base + variation));
    }
    patternIndex = 0;
}

// ── Timing ring animation ────────────────────────────────────
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
        timingRing.style.width   = size + "px";
        timingRing.style.height  = size + "px";
        timingRing.style.opacity = 0.1 + eased * 0.65;
        if (progress < 1) {
            timingRingAnimId = requestAnimationFrame(frame);
        } else {
            timingRing.style.opacity = "0.95";
            safeTimeout(() => { if (timingRing) timingRing.style.opacity = "0"; }, 80);
        }
    }
    timingRingAnimId = requestAnimationFrame(frame);
}

// ── Beat loop ────────────────────────────────────────────────
export function beatLoop() {
    if (gameEnded) return;
    if (pattern.length === 0 || patternIndex >= pattern.length) generatePattern();

    const interval = pattern[patternIndex++];
    beatTime = performance.now();
    beatCount++;

    pulse();
    playBeat();
    animateTimingRing(interval);
    updateDrone(flowState);
    updateFakePlayers();
    updateLeaderboard(streak);
    maybeSendChat();
    maybeSendMessage({ flowState, streak, totalClicks });
    if (maybeGlitch(flowState, getMode().glitchChance, safeTimeout)) playGlitch();
    maybeSoftEnd();
    updateFlowBar(flowState);
    showDifficultyLabel(getTier().label);

    beatTimeout = safeTimeout(() => { if (!gameEnded) beatLoop(); }, interval);
}

// ── Pulse ────────────────────────────────────────────────────
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

// ── Input handler ────────────────────────────────────────────
export function handleClick() {
    if (!gameStarted || gameEnded) return;

    const diff    = Math.abs(performance.now() - beatTime);
    const windows = getCurrentWindows();
    totalClicks++;
    updateClickSpeed(diff);

    if      (diff < windows.perfectWindow) perfectHit(diff);
    else if (diff < windows.goodWindow)    goodHit(diff);
    else                                   missHit(diff);

    updateStats();
}

// ── Hits ─────────────────────────────────────────────────────
function perfectHit(diff) {
    streak++; correctClicks++;
    const mode = getMode();
    flowState = Math.min(flowState + mode.flowGain.perfect, FLOW.MAX);
    feedback.innerText = "perfect";
    flashCircle("hit-perfect");
    playPerfect();
    ghostRecord(diff, true);
    replayRecord("perfect", diff);
    if (streak > 0 && streak % 5 === 0) {
        showCombo(streak);
        playStreakBell(streak);
    }
    if (streak === 5 || streak === 10 || streak === 15) showMilestone(streak);
}

function goodHit(diff) {
    streak++; correctClicks++;
    const mode = getMode();
    flowState = Math.min(flowState + mode.flowGain.good, FLOW.MAX);
    feedback.innerText = "good";
    flashCircle("hit-good");
    playGood();
    ghostRecord(diff, true);
    replayRecord("good", diff);
}

function missHit(diff) {
    streak    = 0;
    flowState = Math.max(0, flowState - getMode().flowPenalty);
    feedback.innerText = "miss";
    flashCircle("hit-miss");
    playMiss();
    shake(1);
    ghostRecord(diff, false);
    replayRecord("miss", diff);
}

function flashCircle(cls) {
    circle.classList.remove("hit-perfect", "hit-good", "hit-miss");
    circle.classList.add(cls);
    safeTimeout(() => circle.classList.remove(cls), TIMING.FLASH_DURATION);
}

// ── Stats & conditions ───────────────────────────────────────
function updateStats() {
    if (streak > best) best = streak;
    updateHUD({ streak, best, totalClicks, correctClicks });

    const mode = getMode();
    if (streak >= mode.winStreak) { playWin(); endGame("master"); return; }

    const failClicks = mode.id === "impossible" ? 15 : 30;
    if (totalClicks > failClicks && streak === 0 && flowState < 5) endGame("fail");
}

function maybeSoftEnd() {
    if (flowState < 5 && totalClicks > SOFT_END_CLICKS && Math.random() < SOFT_END_CHANCE)
        endGame("drift");
}

// ── End game ─────────────────────────────────────────────────
export function endGame(result) {
    if (gameEnded) return;
    console.log("ECHO :: END —", result);
    gameEnded = true; gameStarted = false;

    clearTimeout(beatTimeout);
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts = [];
    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);
    if (timingRing) timingRing.style.opacity = "0";
    stopDrone();

    ghostSaveIfBetter(best);
    replayRender();

    if (endScreen) endScreen.classList.remove("hidden");

    const accuracy = totalClicks === 0 ? "–" : Math.floor((correctClicks / totalClicks) * 100) + "%";
    endAccuracy.innerText = "acc: " + accuracy;
    endBest.innerText     = "best: " + best;
    if (endMode) endMode.innerText = getMode().label;

    const modeKey = "echo_best_" + getMode().id;
    const stored  = parseInt(localStorage.getItem(modeKey) || "0");
    if (best > stored) localStorage.setItem(modeKey, best);
    localStorage.setItem("echo_last_accuracy", accuracy);

    if      (result === "master") { endTitle.innerText = "perfect sync.";  endSub.innerText = "you broke it."; }
    else if (result === "drift")  { endTitle.innerText = "you felt it..."; endSub.innerText = "but lost the thread."; }
    else                          { endTitle.innerText = "out of sync.";   endSub.innerText = "the pattern goes on."; }
}