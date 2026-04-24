// ============================================================
// ui.js — HUD, flow bar, chat, messages, glitch, diff, combo, speed
// ============================================================

import {
    FLOW, CHAT_CHANCE, MESSAGE_CHANCE,
    GLITCH_CHANCE, DISTORT_CHANCE,
    CHAT_LINES, IDLE_MESSAGES,
    GLITCH_DURATION, DISTORT_DURATION,
} from "./constants.js";

const streakEl   = document.getElementById("streak");
const accuracyEl = document.getElementById("accuracy");
const bestEl     = document.getElementById("best");
const speedEl    = document.getElementById("click-speed");
const message    = document.getElementById("message");
const chatBox    = document.getElementById("chat");
const flowFill   = document.getElementById("flow-fill");
const diffLabel  = document.getElementById("diff-label");
const comboBurst = document.getElementById("combo-burst");

// --- HUD ---
export function updateHUD({ streak, best, totalClicks, correctClicks }) {
    const accuracy = totalClicks === 0
        ? "–"
        : Math.floor((correctClicks / totalClicks) * 100) + "%";
    streakEl.innerText   = streak;
    bestEl.innerText     = best;
    accuracyEl.innerText = accuracy;
}

// --- Click Speed ---
// clickDiff = ms between last click and beat time (raw timing offset)
export function updateClickSpeed(clickDiff) {
    if (!speedEl) return;
    speedEl.innerText = Math.round(clickDiff) + "ms";
    // colour code: green=great, blue=ok, red=off
    if      (clickDiff < 90)  speedEl.style.color = "#00ffe0";
    else if (clickDiff < 210) speedEl.style.color = "#4a9fff";
    else                      speedEl.style.color = "#ff2d78";
}

// --- Difficulty label ---
let lastLabel = "";
export function showDifficultyLabel(label) {
    if (!diffLabel || label === lastLabel) return;
    lastLabel = label;
    diffLabel.innerText = label;
    diffLabel.classList.remove("diff-pop");
    void diffLabel.offsetWidth;
    diffLabel.classList.add("diff-pop");
}

// --- Combo burst ---
export function showCombo(streak) {
    if (!comboBurst) return;
    comboBurst.innerText = `× ${streak} COMBO`;
    comboBurst.classList.remove("combo-pop");
    void comboBurst.offsetWidth;
    comboBurst.classList.add("combo-pop");
}

// --- Flow Bar (vertical — height driven) ---
export function updateFlowBar(flowState) {
    const pct    = Math.min((flowState / FLOW.MAX) * 100, 100);
    const pctEl  = document.getElementById("flow-pct");
    flowFill.style.height = pct + "%";
    if (pctEl) pctEl.innerText = Math.round(pct) + "%";
    if (flowState > FLOW.HIGH_THRESHOLD) {
        flowFill.style.background = "linear-gradient(0deg,#ff8800,#ff2d78)";
        flowFill.style.boxShadow  = "0 0 10px rgba(255,45,120,0.8)";
    } else {
        flowFill.style.background = "linear-gradient(0deg,#00ffe0,#00ccff)";
        flowFill.style.boxShadow  = "0 0 10px rgba(0,255,224,0.7)";
    }
}

// --- Chat ---
export function maybeSendChat() {
    if (Math.random() >= CHAT_CHANCE) return;
    const div = document.createElement("div");
    div.innerText = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    chatBox.appendChild(div);
    while (chatBox.children.length > 6) chatBox.removeChild(chatBox.firstChild);
}

// --- Messages ---
export function maybeSendMessage({ flowState, streak, totalClicks }) {
    if (Math.random() >= MESSAGE_CHANCE) return;
    if      (flowState > FLOW.HIGH_THRESHOLD)     message.innerText = "you're in it.";
    else if (flowState > 20)                      message.innerText = "don't stop...";
    else if (streak === 0 && totalClicks > 5)     message.innerText = "focus.";
    else message.innerText = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
}

// --- Glitch — returns true if fired ---
export function maybeGlitch(flowState, safeTimeout) {
    let fired = false;
    if (Math.random() < GLITCH_CHANCE) {
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