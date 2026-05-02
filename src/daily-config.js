// ═══════════════════════════════════════════════════════════════
// daily-config.js — YOUR daily mode control file
// Edit this every day in VS Code to set today's challenge
// ═══════════════════════════════════════════════════════════════

// ── TODAY'S DATE (update this when you change settings) ───────
export const DAILY_DATE = "2026-05-01"; // YYYY-MM-DD format

// ── BEAT PATTERN ──────────────────────────────────────────────
// Each number is the gap in milliseconds between beats.
// Lower = faster. Minimum ~180ms (human reaction limit).
// 24 beats is a good run length. Add/remove as you like.
//
// Examples:
//   800 = slow, easy to tap
//   500 = medium challenge
//   300 = fast, hard
//   200 = brutal
//
export const DAILY_PATTERN = [
    750, 720, 700, 680, 660,   // warm up — gets comfortable
    600, 580, 560, 540,        // picking up pace
    500, 480, 460, 440,        // medium difficulty
    400, 380, 380, 360,        // hard section
    500, 600, 650,             // breather (surprise slow-down)
    350, 320, 300, 280,        // final sprint — brutal finish
];

// ── WIN CONDITION ─────────────────────────────────────────────
// How many hits in a row the player needs to "win" today
export const DAILY_WIN_STREAK = 12;

// ── TIMING WINDOWS ────────────────────────────────────────────
// How tight the hit detection is (milliseconds either side of beat)
// Perfect window: tap must land within this many ms of the beat
// Good window:    wider fallback
// Tighter = harder. Recommended minimums: perfect≥30, good≥80
export const DAILY_PERFECT_WINDOW = 90;  // ms
export const DAILY_GOOD_WINDOW    = 220; // ms

// ── TITLE & FLAVOUR TEXT ──────────────────────────────────────
// What shows on the daily mode card and end screen
export const DAILY_TITLE   = "today's challenge";
export const DAILY_END_MSG = "you felt the daily."; // shown on win

// ── FLOW SETTINGS ─────────────────────────────────────────────
// How much each hit/miss affects the flow bar
// flow bar fills up → game gets faster/glitchier
export const DAILY_FLOW_GAIN_PERFECT = 3;
export const DAILY_FLOW_GAIN_GOOD    = 1;
export const DAILY_FLOW_PENALTY      = 6; // miss = flow drops by this

// ═══════════════════════════════════════════════════════════════
// CHEAT SHEET — copy-paste configs for different vibes:
//
// EASY DAY:
//   WIN_STREAK=8, PERFECT=130, GOOD=300, pattern all 700-900
//
// NORMAL DAY:
//   WIN_STREAK=12, PERFECT=90, GOOD=220, pattern 400-750
//
// HARD DAY:
//   WIN_STREAK=18, PERFECT=55, GOOD=140, pattern 280-500
//
// CHAOS DAY (random fast/slow):
//   WIN_STREAK=10, PERFECT=70, GOOD=180
//   pattern: [800,300,750,280,600,260,700,300,500,280,400,260]
// ═══════════════════════════════════════════════════════════════
