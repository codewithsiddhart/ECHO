// ============================================================
// constants.js — all magic numbers and static data in one place
// ============================================================

export const TIMING = {
    PERFECT_WINDOW: 90,   // ms — perfect hit (tightens with difficulty)
    GOOD_WINDOW:    210,  // ms — good hit    (tightens with difficulty)
    MIN_INTERVAL:   240,  // ms — fastest possible beat
    BASE_INTERVAL:  700,  // ms — default beat interval
    PULSE_DURATION: 110,  // ms — how long pulse animation lasts
    FLASH_DURATION: 300,  // ms — how long hit flash lasts
};

export const GLITCH_DURATION  = 180; // ms
export const DISTORT_DURATION = 220; // ms

export const FLOW = {
    MAX:            60,
    PERFECT_GAIN:   3,
    GOOD_GAIN:      1,
    MISS_PENALTY:   5,
    HIGH_THRESHOLD: 40,
    GLOW_THRESHOLD: 25,
};

// Difficulty levels — unlocked as flowState climbs
export const DIFFICULTY_LEVELS = [
    { minFlow: 0,  label: "SYNC I",   speedMult: 1.0,  perfectWindow: 90,  goodWindow: 210 },
    { minFlow: 15, label: "SYNC II",  speedMult: 0.88, perfectWindow: 78,  goodWindow: 185 },
    { minFlow: 30, label: "SYNC III", speedMult: 0.76, perfectWindow: 65,  goodWindow: 160 },
    { minFlow: 45, label: "SYNC IV",  speedMult: 0.62, perfectWindow: 52,  goodWindow: 130 },
    { minFlow: 58, label: "OVERLOAD", speedMult: 0.50, perfectWindow: 40,  goodWindow: 105 },
];

export const WIN_STREAK      = 20;
export const FAIL_CLICKS     = 30;
export const FAIL_FLOW       = 5;
export const SOFT_END_CLICKS = 20;
export const SOFT_END_CHANCE = 0.04;

export const PATTERN_LENGTH = 12;

export const CHAT_CHANCE    = 0.32;
export const MESSAGE_CHANCE = 0.18;
export const GLITCH_CHANCE  = 0.05;
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
    "it's getting faster",
    "the windows are closing",
    "bro is in OVERLOAD",
];

export const IDLE_MESSAGES = [
    "stay steady",
    "breathe.",
    "feel it.",
    "don't rush.",
];

export const PLAYER_NAMES = ["ZenX", "Void", "Pulse", "Echo77", "Sync"];