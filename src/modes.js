// ============================================================
// modes.js — game mode definitions
// ============================================================

export const GAME_MODES = {
    easy: {
        id: "easy", label: "EASY", sub: "find the beat",
        color: "#00ffe0", colorRgb: "0,255,224",
        baseInterval: 1100, minInterval: 700,
        perfectWindow: 200, goodWindow: 450,
        winStreak: 10, flowGain: { perfect: 2, good: 1 },
        flowPenalty: 1, speedRamp: 0.97, glitchChance: 0.0, icon: "◌",
    },
    medium: {
        id: "medium", label: "MEDIUM", sub: "trust the rhythm",
        color: "#00ccff", colorRgb: "0,200,255",
        baseInterval: 800, minInterval: 350,
        perfectWindow: 110, goodWindow: 250,
        winStreak: 20, flowGain: { perfect: 3, good: 1 },
        flowPenalty: 4, speedRamp: 0.85, glitchChance: 0.03, icon: "◎",
    },
    hard: {
        id: "hard", label: "HARD", sub: "stop thinking",
        color: "#ff8800", colorRgb: "255,136,0",
        baseInterval: 550, minInterval: 210,
        perfectWindow: 60, goodWindow: 150,
        winStreak: 25, flowGain: { perfect: 2, good: 1 },
        flowPenalty: 8, speedRamp: 0.68, glitchChance: 0.09, icon: "◈",
    },
    impossible: {
        id: "impossible", label: "IMPOSSIBLE", sub: "38ms. good luck.",
        color: "#ff2d78", colorRgb: "255,45,120",
        baseInterval: 380, minInterval: 160,
        perfectWindow: 38, goodWindow: 95,
        winStreak: 30, flowGain: { perfect: 1, good: 0 },
        flowPenalty: 12, speedRamp: 0.55, glitchChance: 0.15, icon: "◆",
    },
};

let _activeMode = GAME_MODES.medium;

export function setMode(id) { _activeMode = GAME_MODES[id] ?? GAME_MODES.medium; }
export function getMode()   { return _activeMode; }
