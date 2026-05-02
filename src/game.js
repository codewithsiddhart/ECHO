// game.js — clean integration pass
// FIX: No circular imports. onGameEnd called via registered callback.

import { TIMING, FLOW, DIFFICULTY_TIERS, SOFT_END_CLICKS, SOFT_END_CHANCE } from "./constants.js";
import { getMode } from "./modes.js";
import { haptic } from "./haptics.js";
import {
    updateHUD, updateFlowBar, maybeSendChat, maybeSendMessage,
    maybeGlitch, showDifficultyLabel, showCombo, updateClickSpeed,
    showMilestone, applyModeTheme, showScore, showMultiplierChange,
    showPracticeHint, showTauntMessage,
} from "./ui.js";
import { updateFakePlayers, updateLeaderboard } from "./players.js";
import { notifyBeat, playPerfect, playGood, playMiss, playWin,
         playGlitch, updateDrone, stopDrone, playStreakBell } from "./audio.js";
import { shake } from "./shake.js";
import { ghostReset, ghostRecord, ghostSaveIfBetter } from "./ghost.js";
import { replayReset, replayRecord, replayRender, getReplayData } from "./replay.js";
import { burstParticles, initParticles } from "./particles.js";
import { applySkin } from "./skins.js";
import { scoreReset, scoreHit, scoreMiss, getScore, getMultiplier } from "./score.js";
import { resetIdle, stopIdle, initIdle } from "./idle.js";
import { unlockCheck } from "./unlock.js";
import { triggerWinCelebration } from "./celebration.js";
import { getMirrorMessage } from "./mirror.js";
import { saveRun } from "./history.js";
import { checkRun } from "./achievements.js";
import {
    getDailyPattern, getDailyWinStreak, getDailyPerfectWindow,
    getDailyGoodWindow, getDailyFlowGains, getDailyEndMsg,
} from "./daily.js";

// ── DOM refs ──────────────────────────────────────────────────
const circle       = document.getElementById("circle");
const ring         = document.getElementById("ring");
const ringOuter    = document.getElementById("ring-outer");
const timingRing   = document.getElementById("timing-ring");
const feedback     = document.getElementById("feedback");
const endScreen    = document.getElementById("end-screen");
const endTitle     = document.getElementById("end-title");
const endSub       = document.getElementById("end-sub");
const endModeBadge = document.getElementById("end-mode-badge");

// ── FIX: callback instead of circular import ──────────────────
let _onGameEndCallback = null;
export function registerOnGameEnd(fn) { _onGameEndCallback = fn; }

// Snapshot of the run frozen at the moment it ends — used by shareCard
// so sharing after a retry doesn't pull the new run's live state.
let _endSnapshot = null;
export function getEndSnapshot() { return _endSnapshot; }

// ── State ─────────────────────────────────────────────────────
export let gameStarted = false;
export let gameEnded   = false;
let paused       = false;
let _isPractice  = false;
let _isDailyMode = false;

let streak = 0, best = 0, totalClicks = 0, correctClicks = 0, flowState = 0;
let pattern = [], patternIndex = 0, beatTime = 0;
let beatTimeout = null, timingRingAnimId = null;

// Achievements: track if player has failed this session (for comeback achievement)
let _sessionHadFail = false;

// Taunt
let _droppedBeats = 0, _lastTapBeat = 0, _beatIndex = 0;
let _tauntLevel = 0, _tauntShown = false;
const _TAUNT_THRESH = 12;

// Timeouts
const _timeouts = new Set();
export function safeTimeout(fn, ms) {
    let id;
    id = setTimeout(() => { _timeouts.delete(id); fn(); }, ms);
    _timeouts.add(id);
    return id;
}
function _clearAll() { for (const id of _timeouts) clearTimeout(id); _timeouts.clear(); }

// ── Setters ───────────────────────────────────────────────────
export function setPracticeMode(v) { _isPractice  = v; }
export function setDailyMode(v)    { _isDailyMode = v; }
export function isPracticeMode()   { return _isPractice; }
export function isGamePaused()     { return paused; }
export function isGameActive()     { return gameStarted && !gameEnded; }

export function getState() {
    return { streak, best, totalClicks, correctClicks, flowState,
             score: getScore(), multiplier: getMultiplier() };
}

// ── Pattern ───────────────────────────────────────────────────
function getTier() {
    if (_isPractice) return DIFFICULTY_TIERS[0];
    let t = DIFFICULTY_TIERS[0];
    for (const tier of DIFFICULTY_TIERS) { if (flowState >= tier.minFlow) t = tier; }
    return t;
}

function getCurrentWindows() {
    if (_isPractice)  return { perfectWindow: 180, goodWindow: 400 };
    if (_isDailyMode) return { perfectWindow: getDailyPerfectWindow(), goodWindow: getDailyGoodWindow() };
    const mode = getMode(), tier = getTier();
    return { perfectWindow: mode.perfectWindow * tier.windowMult,
             goodWindow:    mode.goodWindow    * tier.windowMult };
}

export function getPracticeWindows() { return getCurrentWindows(); }

function generatePattern() {
    pattern = [];
    const mode  = getMode();
    const tier  = getTier();
    const base  = _isPractice ? 1100 : mode.baseInterval * tier.speedMult;
    const type  = _isPractice ? "normal" : _pickType();

    if (type === "double") {
        for (let i = 0; i < 8; i++)
            pattern.push(i % 3 === 1 ? 155 : Math.max(mode.minInterval, base + Math.random() * 120));
    } else if (type === "silence") {
        for (let i = 0; i < 8; i++)
            pattern.push(i === 3 ? Math.max(mode.minInterval, base * 2.2)
                                 : Math.max(mode.minInterval, base + Math.random() * 100));
    } else if (type === "accelerando") {
        for (let i = 0; i < 8; i++)
            pattern.push(Math.max(mode.minInterval, base * (1 - i / 10) + Math.random() * 60));
    } else {
        for (let i = 0; i < 12; i++)
            pattern.push(Math.max(_isPractice ? 900 : mode.minInterval,
                         base + Math.random() * (_isPractice ? 100 : 160)));
    }
    patternIndex = 0;
}

function _pickType() {
    if (flowState < 15) return "normal";
    const r = Math.random();
    if (r < 0.55) return "normal";
    if (r < 0.72) return "double";
    if (r < 0.86) return "silence";
    return "accelerando";
}

// ── Reset ─────────────────────────────────────────────────────
export function resetState() {
    streak = best = totalClicks = correctClicks = flowState = 0;
    _droppedBeats = _lastTapBeat = _beatIndex = _tauntLevel = 0;
    _tauntShown = false;
    pattern = []; patternIndex = 0;
    gameStarted = true; gameEnded = false; paused = false;
    // Don't reset _sessionHadFail here — it persists across retries in a session
    _clearAll();
    ghostReset(); replayReset(); scoreReset();
    applyModeTheme(getMode());
    initParticles();
    applySkin(circle, ring, ringOuter);
    initIdle();
    circle?.classList.add("circle-invite");
}

// ── Pause / Resume ────────────────────────────────────────────
export function pauseGame() {
    if (!gameStarted || gameEnded || paused) return;
    paused = true;
    clearTimeout(beatTimeout);
    _clearAll();
    if (timingRingAnimId) { cancelAnimationFrame(timingRingAnimId); timingRingAnimId = null; }
    if (timingRing) timingRing.style.opacity = "0";
    stopIdle();
}

export function resumeGame() {
    if (!gameStarted || gameEnded || !paused) return;
    paused = false;
    initIdle();
    beatLoop();
}

// ── Timing ring ───────────────────────────────────────────────
function animateTimingRing(interval) {
    if (!timingRing) return;
    if (timingRingAnimId) cancelAnimationFrame(timingRingAnimId);
    const start = performance.now();
    const from = 260, to = 150, travel = interval * 0.85;
    function frame(now) {
        if (gameEnded || paused) { timingRing.style.opacity = "0"; return; }
        const p = Math.min((now - start) / travel, 1);
        const e = p * p;
        const s = (from - (from - to) * e) | 0;
        timingRing.style.width   = s + "px";
        timingRing.style.height  = s + "px";
        timingRing.style.opacity = (0.1 + e * 0.65).toFixed(2);
        if (p < 1) { timingRingAnimId = requestAnimationFrame(frame); }
        else {
            timingRing.style.opacity = "0.95";
            safeTimeout(() => { if (timingRing) timingRing.style.opacity = "0"; }, 80);
        }
    }
    timingRingAnimId = requestAnimationFrame(frame);
}

// ── Beat loop ─────────────────────────────────────────────────
export function beatLoop() {
    if (gameEnded || paused) return;

    if (_isDailyMode && pattern.length === 0) {
        pattern = getDailyPattern(); patternIndex = 0;
    } else if (!pattern.length || patternIndex >= pattern.length) {
        generatePattern();
    }

    const interval = pattern[patternIndex++];
    beatTime = performance.now();
    _beatIndex++;

    if (_lastTapBeat < _beatIndex - 1) { _droppedBeats++; _checkTaunt(); }

    pulse();
    notifyBeat(interval);   // audio engine receives exact beat interval — music IS the pattern
    animateTimingRing(interval);
    updateDrone(flowState);
    updateFakePlayers();
    updateLeaderboard(streak);
    maybeSendChat({ tierLabel: getTier().label, modeId: getMode().id });
    maybeSendMessage({ flowState, streak, totalClicks });
    if (!_isPractice && maybeGlitch(flowState, getMode().glitchChance, safeTimeout)) playGlitch();
    if (!_isPractice) maybeSoftEnd();
    updateFlowBar(flowState);
    showDifficultyLabel(_isPractice ? "PRACTICE" : getTier().label);

    beatTimeout = safeTimeout(() => { if (!gameEnded && !paused) beatLoop(); }, interval);
}

// ── Taunt ─────────────────────────────────────────────────────
const TAUNTS = [
    ["tap the circle 👆", "it's just one tap...", "whenever you're ready 😴"],
    ["bro is AFK 💀", "the beat is right there", "are you even watching?"],
    ["play fr noob\ndon't be scared 💀", "WAKE UP\nit's just a tap", "hello?? 📵\nanyone home?"],
    ["YOU ARE COOKED 🔥\ntap the circle NOW", "this is embarrassing\nngl 💀💀💀", "the beat has\ngiven up on you"],
];

function _checkTaunt() {
    if (_tauntShown || _droppedBeats < _TAUNT_THRESH) return;
    _tauntShown = true;
    const pool = TAUNTS[Math.min(_tauntLevel, 3)];
    showTauntMessage(pool[Math.floor(Math.random() * pool.length)]);
    _tauntLevel = Math.min(_tauntLevel + 1, 3);
    safeTimeout(() => { _droppedBeats = 0; _tauntShown = false; }, 2800);
}

// ── Pulse ─────────────────────────────────────────────────────
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

// ── Input ─────────────────────────────────────────────────────
let _lastPointerX = -1, _lastPointerY = -1;
export function setLastPointer(x, y) { _lastPointerX = x; _lastPointerY = y; }

function _isOnCircle() {
    if (!circle || _lastPointerX < 0) return false;
    const r   = circle.getBoundingClientRect();
    const cx  = (r.left + r.right)  / 2;
    const cy  = (r.top  + r.bottom) / 2;
    const rad = (r.width / 2) + 35;
    const dx  = _lastPointerX - cx;
    const dy  = _lastPointerY - cy;
    return dx * dx + dy * dy <= rad * rad;
}

export function handleClick(isPointer = false) {
    if (!gameStarted || gameEnded || paused) return;
    if (isPointer && !_isOnCircle()) return;

    const diff    = Math.abs(performance.now() - beatTime);
    const windows = getCurrentWindows();
    totalClicks++;
    updateClickSpeed(diff);
    resetIdle();
    _lastTapBeat  = _beatIndex;
    _droppedBeats = 0;
    circle?.classList.remove("circle-invite");

    if      (diff < windows.perfectWindow) perfectHit(diff);
    else if (diff < windows.goodWindow)    goodHit(diff);
    else                                   missHit(diff);

    updateStats();
}

// ── Hit handlers ──────────────────────────────────────────────
const MULT_COMBOS = { 2: 3, 4: 7, 8: 14 };

function _dailyFlowGains() { return _isDailyMode ? getDailyFlowGains() : null; }

function perfectHit(diff) {
    streak++; correctClicks++;
    haptic("perfect");
    const fg = _dailyFlowGains();
    flowState = Math.min(flowState + (fg ? fg.perfect : getMode().flowGain.perfect), FLOW.MAX);
    feedback.innerText = "perfect";
    flashCircle("hit-perfect");
    playPerfect();
    burstParticles("perfect");
    ghostRecord(diff, true);
    replayRecord("perfect", diff);
    const { score, multiplier, combo } = scoreHit("perfect");
    showScore(score, multiplier);
    if (multiplier > 1 && combo === MULT_COMBOS[multiplier]) showMultiplierChange(multiplier);
    if (streak > 0 && streak % 5 === 0) { showCombo(streak); playStreakBell(streak); }
    if (streak === 5 || streak === 10 || streak === 15) showMilestone(streak);
    if (_isPractice) showPracticeHint(diff, "perfect");
}

function goodHit(diff) {
    streak++; correctClicks++;
    haptic("hit");
    const fg = _dailyFlowGains();
    flowState = Math.min(flowState + (fg ? fg.good : getMode().flowGain.good), FLOW.MAX);
    feedback.innerText = "good";
    flashCircle("hit-good");
    playGood();
    burstParticles("good");
    ghostRecord(diff, true);
    replayRecord("good", diff);
    const { score, multiplier } = scoreHit("good");
    showScore(score, multiplier);
    if (_isPractice) showPracticeHint(diff, "good");
}

function missHit(diff) {
    streak = 0;
    haptic("miss");
    const fg = _dailyFlowGains();
    flowState = Math.max(0, flowState - (fg ? fg.penalty : getMode().flowPenalty));
    feedback.innerText = "miss";
    flashCircle("hit-miss");
    playMiss();
    shake(1);
    ghostRecord(diff, false);
    replayRecord("miss", diff);
    scoreMiss();
    showScore(getScore(), 1);
    if (_isPractice) showPracticeHint(diff, "miss");
}

function flashCircle(cls) {
    circle.classList.remove("hit-perfect", "hit-good", "hit-miss");
    circle.classList.add(cls);
    safeTimeout(() => circle.classList.remove(cls), TIMING.FLASH_DURATION);
}

// ── Stats + win/fail ──────────────────────────────────────────
function updateStats() {
    if (streak > best) { best = streak; unlockCheck(best); }
    updateHUD({ streak, best, totalClicks, correctClicks });
    if (!_isPractice) {
        const winTarget = _isDailyMode ? getDailyWinStreak() : getMode().winStreak;
        if (streak >= winTarget) { playWin(); triggerWinCelebration(); endGame("master"); return; }
        if (totalClicks > (getMode().id === "impossible" ? 15 : 30) && streak === 0 && flowState < 5)
            endGame("fail");
    }
}

function maybeSoftEnd() {
    if (flowState < 5 && totalClicks > SOFT_END_CLICKS && Math.random() < SOFT_END_CHANCE)
        endGame("drift");
}

// ── End game ──────────────────────────────────────────────────
export function endGame(result) {
    if (gameEnded) return;
    gameEnded = true; gameStarted = false;
    stopIdle();
    clearTimeout(beatTimeout);
    _clearAll();
    if (timingRingAnimId) { cancelAnimationFrame(timingRingAnimId); timingRingAnimId = null; }
    if (timingRing) timingRing.style.opacity = "0";
    stopDrone();
    ghostSaveIfBetter(best, getScore());
    replayRender();

    // Persist stats
    const played = parseInt(localStorage.getItem("echo_total_games") || "0");
    localStorage.setItem("echo_total_games", played + 1);

    const accuracy = totalClicks === 0 ? "–"
                   : Math.floor((correctClicks / totalClicks) * 100) + "%";
    const accuracyPct = totalClicks === 0 ? 0
                      : Math.floor((correctClicks / totalClicks) * 100);

    if (!_isPractice) {
        const modeKey = "echo_best_" + getMode().id;
        const stored  = parseInt(localStorage.getItem(modeKey) || "0");
        if (best > stored) localStorage.setItem(modeKey, best);
        localStorage.setItem("echo_last_accuracy", accuracy);
    }

    // Track session fail BEFORE checkRun so comeback fires correctly
    if (result === "fail") _sessionHadFail = true;

    // Save run to history
    saveRun({
        mode:      _isPractice ? "listen" : _isDailyMode ? "daily" : getMode().id,
        streak:    best,
        score:     getScore(),
        accuracy,
        result,
        timestamp: Date.now(),
    });

    // Check achievements — runs AFTER localStorage is updated so checks see current bests
    if (!_isPractice) {
        checkRun({
            result,
            mode:               getMode().id,
            streak:             best,
            accuracyPct,
            flowState,
            isDaily:            _isDailyMode,
            totalGames:         played + 1,
            totalClicks,
            hadFailThisSession: _sessionHadFail && result !== "fail",
        });
    }

    // End screen title / sub
    const prevBest = parseInt(localStorage.getItem("echo_best_" + getMode().id) || "0");
    if (result === "master" && _isDailyMode) {
        if (endTitle) endTitle.innerText = getDailyEndMsg();
        if (endSub)   endSub.innerText   = "daily cleared. come back tomorrow.";
    } else {
        const mirror = getMirrorMessage({
            result, best, totalClicks, correctClicks, flowState,
            mode: getMode(), prevBest, replayData: getReplayData(),
        });
        if (endTitle) endTitle.innerText = mirror.title;
        if (endSub)   endSub.innerText   = mirror.sub;
    }

    // Mode badge
    if (endModeBadge) endModeBadge.innerText = _isPractice ? "PRACTICE"
                                             : _isDailyMode ? "DAILY"
                                             : getMode().label;

    // Show end screen
    if (endScreen) endScreen.classList.remove("hidden");

    // Snapshot run state so share card shows the correct data even if the
    // player retries before tapping "share 📤"
    _endSnapshot = {
        streak: best,
        score:  getScore(),
        accuracy,
        mode:   _isPractice ? "PRACTICE" : _isDailyMode ? "DAILY" : getMode().label,
        color:  getMode()?.color ?? "#00ffe0",
    };

    // FIX: call callback instead of dynamic import
    if (_onGameEndCallback) _onGameEndCallback(result, best, accuracy, getScore());
}
