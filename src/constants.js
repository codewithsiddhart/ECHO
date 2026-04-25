// ============================================================
// constants.js — base constants (mode-specific values in modes.js)
// ============================================================

export const TIMING = {
    PULSE_DURATION: 110,
    FLASH_DURATION: 300,
};

export const GLITCH_DURATION  = 180;
export const DISTORT_DURATION = 220;

export const FLOW = {
    MAX:            60,
    HIGH_THRESHOLD: 40,
    GLOW_THRESHOLD: 25,
};

// In-game difficulty tiers — speedMult and window tightening
// Applied ON TOP of the base mode values
export const DIFFICULTY_TIERS = [
    { minFlow:  0, label: "SYNC I",   speedMult: 1.00, windowMult: 1.00 },
    { minFlow: 15, label: "SYNC II",  speedMult: 0.90, windowMult: 0.88 },
    { minFlow: 30, label: "SYNC III", speedMult: 0.80, windowMult: 0.76 },
    { minFlow: 45, label: "SYNC IV",  speedMult: 0.70, windowMult: 0.62 },
    { minFlow: 58, label: "OVERLOAD", speedMult: 0.60, windowMult: 0.50 },
];

export const SOFT_END_CLICKS = 20;
export const SOFT_END_CHANCE = 0.04;
export const PATTERN_LENGTH  = 12;

export const CHAT_CHANCE    = 0.32;
export const MESSAGE_CHANCE = 0.18;
export const DISTORT_CHANCE = 0.07;

export const CHAT_LINES = [
    "he's locked in",
    "bro might actually win",
    "this is intense",
    "don't choke now",
    "he's losing it",
    "WHAT WAS THAT",
    "nah this guy is insane",
    "focus bro focus",
    "he's breaking pattern",
    "no way he keeps this up",
    "actually unreal",
    "bro forgot to breathe",
    "it's adapting to him",
    "he knows the pattern",
    "stay in it",
    "the sync is real",
    "he's at SYNC IV already??",
    "it's getting faster...",
    "the windows are closing",
    "bro is in OVERLOAD",
    "impossible mode?? respect",
    "he chose impossible lmaooo",
    "easy mode speedrun incoming",
    "hard mode energy rn",
];

export const IDLE_MESSAGES = [
    "stay steady",
    "breathe.",
    "feel it.",
    "don't rush.",
];

export const PLAYER_NAMES = ["Harshid", "Dusky", "Ocean", "POwerpuffGurl", "SPARKYGAMER"];