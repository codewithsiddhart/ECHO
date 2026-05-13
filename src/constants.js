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

// Tiered chat lines — keys match DIFFICULTY_TIERS labels + special modes
export const CHAT_LINES = {
    "SYNC I": [
        "he's warming up",
        "just getting started",
        "finding the rhythm",
        "easy mode energy rn",
        "take it slow bro",
        "feel it first",
        "don't rush",
    ],
    "SYNC II": [
        "he's locked in",
        "bro might actually win",
        "this is intense",
        "don't choke now",
        "he knows the pattern",
        "stay in it",
        "the sync is real",
    ],
    "SYNC III": [
        "he's breaking pattern",
        "no way he keeps this up",
        "actually unreal",
        "bro forgot to breathe",
        "it's adapting to him",
        "it's getting faster...",
        "focus bro focus",
        "he's hitting everything",
    ],
    "SYNC IV": [
        "he's at SYNC IV already??",
        "the windows are closing",
        "WHAT WAS THAT",
        "nah this guy is insane",
        "bro is in another dimension",
        "how is he keeping up??",
    ],
    "OVERLOAD": [
        "bro is in OVERLOAD",
        "impossible mode?? respect",
        "he's losing it",
        "OVERLOAD bro how",
        "the beat can't shake him",
        "he's not human",
        "actually unreal rn",
    ],
    "impossible": [
        "he chose impossible lmaooo",
        "impossible mode?? respect",
        "nah this guy is cooked",
        "38ms windows 💀",
        "bro said challenge accepted",
    ],
};

export const IDLE_MESSAGES = [
    "stay steady",
    "breathe.",
    "feel it.",
    "don't rush.",
];

export const PLAYER_NAMES = [
    // Original crew
    "Harshid", "Dusky", "Ocean", "POwerpuffGurl", "SPARKYGAMER",
    // Gamer tags
    "xNightPulse", "VoidTapper", "SyncMaster99", "BeatGhost", "QuantumTick",
    "LagFreeZone", "RhythMancer", "TempoKing", "EchoHunter", "SubZeroBeat",
    "FlowRider77", "NullPointer", "ByteBeat", "GlitchWave", "SilentStreak",
    // Casual names
    "meow_player", "justvibing", "tryhard2099", "coffeerun", "not_a_bot",
    "sleepybeats", "yeetmaster", "404found", "pixel_ghost", "couch_pro",
    // Absurd / funny
    "TapGodbless", "myhandswork", "AccidentalPro", "PleaseWork", "OneMoreRun",
    "WhyAmIHere", "BrainOffMode", "fingersMoment", "ItsAFeature", "ClockWatcher",
    // International feel
    "OniWave", "LunarSync", "StellarBeat", "CryptoRhythm", "NeonPulseX",
];