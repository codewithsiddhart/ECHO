// ============================================================
// ghost.js — FIX #2: peak streak O(1), accurate ghost score
// ============================================================

import { getMode } from "./modes.js";

let currentRun  = [];
let ghostRun    = [];
let beatIndex   = 0;
let _curStreak  = 0;
let ghostPeakStreak = 0;

export function ghostReset() {
    currentRun  = [];
    beatIndex   = 0;
    _curStreak  = 0;
    ghostRun    = loadGhost();
    ghostPeakStreak = computePeakStreak(ghostRun);
}

export function ghostRecord(diff, hit) {
    currentRun.push({ beatIndex: beatIndex++, diff, hit });
    if (hit) { _curStreak++; }
    else { _curStreak = 0; }
}

export function ghostSaveIfBetter(streak, score = 0) {
    const key        = "echo_ghost_" + getMode().id;
    const storedBest = parseInt(localStorage.getItem("echo_best_" + getMode().id) || "0");
    const storedScore= parseInt(localStorage.getItem("echo_best_score_" + getMode().id) || "0");
    // Save if new streak best OR same streak with higher score
    if (streak > storedBest || (streak === storedBest && score > storedScore)) {
        localStorage.setItem("echo_best_" + getMode().id, streak);
        localStorage.setItem("echo_best_score_" + getMode().id, score);
        localStorage.setItem(key, JSON.stringify(currentRun));
    }
}

function loadGhost() {
    try {
        const raw = localStorage.getItem("echo_ghost_" + getMode().id);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function computePeakStreak(run) {
    let peak = 0, cur = 0;
    for (const ev of run) {
        if (ev?.hit) { cur++; if (cur > peak) peak = cur; }
        else cur = 0;
    }
    return peak;
}

export function ghostHitAt(index) {
    const ev = ghostRun[index];
    return ev ? ev.hit : null;
}

// O(1) — returns pre-computed peak streak, matching real scoring
export function ghostScoreAt(_upToBeat) {
    return ghostPeakStreak;
}

export function hasGhost() { return ghostRun.length > 0; }
export function getGhostRun() { return ghostRun; }
