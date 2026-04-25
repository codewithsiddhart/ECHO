// ============================================================
// ghost.js — record run timing, save best, show ghost on board
// ============================================================

import { getMode } from "./modes.js";

let currentRun = []; // array of { beatIndex, diff, hit }
let ghostRun   = []; // loaded from localStorage
let beatIndex  = 0;

export function ghostReset() {
    currentRun = [];
    beatIndex  = 0;
    ghostRun   = loadGhost();
}

export function ghostRecord(diff, hit) {
    currentRun.push({ beatIndex: beatIndex++, diff, hit });
}

// Call on game end — saves if better than stored
export function ghostSaveIfBetter(streak) {
    const key        = "echo_ghost_" + getMode().id;
    const storedBest = parseInt(localStorage.getItem("echo_best_" + getMode().id) || "0");
    if (streak > storedBest) {
        localStorage.setItem("echo_best_" + getMode().id, streak);
        localStorage.setItem(key, JSON.stringify(currentRun));
    }
}

function loadGhost() {
    try {
        const raw = localStorage.getItem("echo_ghost_" + getMode().id);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

// Returns ghost's hit result for a given beat index (for leaderboard display)
export function ghostHitAt(index) {
    const ev = ghostRun[index];
    return ev ? ev.hit : null;
}

// Ghost score — computed as hits in ghost run up to current beat
export function ghostScoreAt(upToBeat) {
    let s = 0;
    for (let i = 0; i < Math.min(upToBeat, ghostRun.length); i++) {
        if (ghostRun[i]?.hit) s++;
    }
    return s;
}

export function hasGhost() { return ghostRun.length > 0; }
export function getGhostRun() { return ghostRun; }