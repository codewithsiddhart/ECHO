// ============================================================
// modes.js — game mode definitions
// ============================================================

export const GAME_MODES = {
    easy: {
        id: "easy", label: "EASY", sub: "feel the rhythm",
        color: "#00ffe0", colorRgb: "0,255,224",
        baseInterval: 900, minInterval: 400,
        perfectWindow: 130, goodWindow: 300,
        winStreak: 15, flowGain: { perfect: 4, good: 2 },
        flowPenalty: 3, speedRamp: 0.92, glitchChance: 0.02, icon: "◌",
    },
    medium: {
        id: "medium", label: "MEDIUM", sub: "find the edge",
        color: "#00ccff", colorRgb: "0,200,255",
        baseInterval: 700, minInterval: 280,
        perfectWindow: 90, goodWindow: 210,
        winStreak: 20, flowGain: { perfect: 3, good: 1 },
        flowPenalty: 5, speedRamp: 0.80, glitchChance: 0.05, icon: "◎",
    },
    hard: {
        id: "hard", label: "HARD", sub: "it will break you",
        color: "#ff8800", colorRgb: "255,136,0",
        baseInterval: 550, minInterval: 210,
        perfectWindow: 60, goodWindow: 150,
        winStreak: 25, flowGain: { perfect: 2, good: 1 },
        flowPenalty: 8, speedRamp: 0.68, glitchChance: 0.09, icon: "◈",
    },
    impossible: {
        id: "impossible", label: "IMPOSSIBLE", sub: "you will not win",
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
