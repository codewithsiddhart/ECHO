// daily.js — daily mode runtime logic
// Pattern is now procedurally generated from the UTC date — no manual config needed.

import { getTodayUTC, generateDailyConfig } from "./daily-seed.js";

const _today  = getTodayUTC();
const _config = generateDailyConfig(_today);

// Keep legacy export names so nothing else needs to change
const DAILY_DATE          = _config.date;
const DAILY_PATTERN       = _config.pattern;
const DAILY_WIN_STREAK    = _config.winStreak;
const DAILY_PERFECT_WINDOW= _config.perfectWindow;
const DAILY_GOOD_WINDOW   = _config.goodWindow;
const DAILY_TITLE         = _config.title;
const DAILY_END_MSG       = _config.endMsg;
const DAILY_FLOW_GAIN_PERFECT = _config.flowGainPerfect;
const DAILY_FLOW_GAIN_GOOD    = _config.flowGainGood;
const DAILY_FLOW_PENALTY      = _config.flowPenalty;

// ── Key based on config date (not system date) ────────────────
// Using config date means everyone on the same config gets same key
export function getDailyKey() {
    return `echo_daily_${DAILY_DATE}`;
}

export function hasDailyAttempt() {
    return !!localStorage.getItem(getDailyKey());
}

export function saveDailyResult({ streak, score, accuracy }) {
    localStorage.setItem(getDailyKey(), JSON.stringify({
        streak, score, accuracy, date: DAILY_DATE, ts: Date.now()
    }));
}

export function getDailyResult() {
    try { return JSON.parse(localStorage.getItem(getDailyKey())); }
    catch { return null; }
}

// ── Config getters used by game.js ───────────────────────────
export function getDailyPattern()       { return [...DAILY_PATTERN]; }
export function getDailyWinStreak()     { return DAILY_WIN_STREAK; }
export function getDailyPerfectWindow() { return DAILY_PERFECT_WINDOW; }
export function getDailyGoodWindow()    { return DAILY_GOOD_WINDOW; }
export function getDailyTitle()         { return DAILY_TITLE; }
export function getDailyEndMsg()        { return DAILY_END_MSG; }
export function getDailyFlowGains()     {
    return {
        perfect: DAILY_FLOW_GAIN_PERFECT,
        good:    DAILY_FLOW_GAIN_GOOD,
        penalty: DAILY_FLOW_PENALTY,
    };
}

// ── Share string ──────────────────────────────────────────────
export function buildShareString({ streak, accuracy }) {
    const bar = streak >= DAILY_WIN_STREAK ? "🏆"
              : streak >= 15 ? "🔥"
              : streak >= 10 ? "⚡"
              : streak >= 5  ? "✨" : "🎵";
    const won = streak >= DAILY_WIN_STREAK ? "CLEARED" : `×${streak}`;
    return `ECHO daily — ${DAILY_DATE}\n${bar} ${won} streak\n${accuracy} accuracy\nplay at echo.game`;
}
