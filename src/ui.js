// ============================================================
// ui.js — all HUD updates, effects, milestone flashes
// ============================================================

import {
    FLOW, CHAT_CHANCE, MESSAGE_CHANCE,
    DISTORT_CHANCE,
    CHAT_LINES, IDLE_MESSAGES,
    GLITCH_DURATION, DISTORT_DURATION,
} from "./constants.js";

import { getMode } from "./modes.js";

const streakEl   = document.getElementById("streak");
const accuracyEl = document.getElementById("accuracy");
const bestEl     = document.getElementById("best");
const speedEl    = document.getElementById("click-speed");
const message    = document.getElementById("message");
const chatBox    = document.getElementById("chat");
const flowFill   = document.getElementById("flow-fill");
const diffLabel  = document.getElementById("diff-label");
const comboBurst = document.getElementById("combo-burst");
const modeTag    = document.getElementById("mode-tag");
const milestoneEl= document.getElementById("milestone-flash");

// ── Apply mode colour theme to CSS variables ────────────────
export function applyModeTheme(mode) {
    const root = document.documentElement;
    root.style.setProperty("--accent",   mode.color);
    root.style.setProperty("--accent-rgb", mode.colorRgb);
    root.style.setProperty("--glow-cyan",
        `0 0 20px rgba(${mode.colorRgb},0.6), 0 0 60px rgba(${mode.colorRgb},0.25)`);

    if (modeTag) {
        modeTag.innerText  = mode.label;
        modeTag.style.color = mode.color;
    }
}

// ── HUD ────────────────────────────────────────────────────
export function updateHUD({ streak, best, totalClicks, correctClicks }) {
    const accuracy = totalClicks === 0
        ? "–"
        : Math.floor((correctClicks / totalClicks) * 100) + "%";
    streakEl.innerText   = streak;
    bestEl.innerText     = best;
    accuracyEl.innerText = accuracy;
}

// ── Click speed ────────────────────────────────────────────
export function updateClickSpeed(diff) {
    if (!speedEl) return;
    speedEl.innerText = Math.round(diff) + "ms";
    const mode = getMode();
    if      (diff < mode.perfectWindow) speedEl.style.color = "#00ffe0";
    else if (diff < mode.goodWindow)    speedEl.style.color = "#4a9fff";
    else                                speedEl.style.color = "#ff2d78";
}

// ── Difficulty label ────────────────────────────────────────
let lastLabel = "";
export function showDifficultyLabel(label) {
    if (!diffLabel || label === lastLabel) return;
    lastLabel = label;
    diffLabel.innerText = label;
    diffLabel.classList.remove("diff-pop");
    void diffLabel.offsetWidth;
    diffLabel.classList.add("diff-pop");
}

// ── Combo burst ─────────────────────────────────────────────
export function showCombo(streak) {
    if (!comboBurst) return;
    comboBurst.innerText = `× ${streak} COMBO`;
    comboBurst.classList.remove("combo-pop");
    void comboBurst.offsetWidth;
    comboBurst.classList.add("combo-pop");
}

// ── Streak milestone flash (5, 10, 15…) ────────────────────
export function showMilestone(streak) {
    if (!milestoneEl) return;
    milestoneEl.innerText = streak;
    milestoneEl.classList.remove("milestone-pop");
    void milestoneEl.offsetWidth;
    milestoneEl.classList.add("milestone-pop");
}

// ── Flow bar (vertical) ─────────────────────────────────────
export function updateFlowBar(flowState) {
    const pct   = Math.min((flowState / FLOW.MAX) * 100, 100);
    const pctEl = document.getElementById("flow-pct");
    flowFill.style.height = pct + "%";
    if (pctEl) pctEl.innerText = Math.round(pct) + "%";

    const mode = getMode();
    if (flowState > FLOW.HIGH_THRESHOLD) {
        flowFill.style.background = `linear-gradient(0deg,#ff8800,${mode.color})`;
        flowFill.style.boxShadow  = `0 0 10px rgba(${mode.colorRgb},0.9)`;
    } else {
        flowFill.style.background = `linear-gradient(0deg,${mode.color},#00ccff)`;
        flowFill.style.boxShadow  = `0 0 10px rgba(${mode.colorRgb},0.7)`;
    }
}

// ── Chat ────────────────────────────────────────────────────
export function maybeSendChat() {
    if (Math.random() >= CHAT_CHANCE) return;
    const div = document.createElement("div");
    div.innerText = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    chatBox.appendChild(div);
    while (chatBox.children.length > 6) chatBox.removeChild(chatBox.firstChild);
}

// ── Phase messages ──────────────────────────────────────────
export function maybeSendMessage({ flowState, streak, totalClicks }) {
    if (Math.random() >= MESSAGE_CHANCE) return;
    if      (flowState > FLOW.HIGH_THRESHOLD)  message.innerText = "you're in it.";
    else if (flowState > 20)                   message.innerText = "don't stop...";
    else if (streak === 0 && totalClicks > 5)  message.innerText = "focus.";
    else message.innerText = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
}

// ── Glitch ──────────────────────────────────────────────────
export function maybeGlitch(flowState, glitchChance, safeTimeout) {
    let fired = false;
    if (Math.random() < glitchChance) {
        document.body.classList.add("glitch");
        safeTimeout(() => document.body.classList.remove("glitch"), GLITCH_DURATION);
        fired = true;
    }
    if (flowState > FLOW.GLOW_THRESHOLD && Math.random() < DISTORT_CHANCE) {
        document.body.classList.add("distort");
        safeTimeout(() => document.body.classList.remove("distort"), DISTORT_DURATION);
        fired = true;
    }
    return fired;
}