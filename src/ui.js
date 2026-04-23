// ============================================================
// ui.js — HUD, flow bar, chat, messages, glitch, difficulty label
// ============================================================

import {
    FLOW,
    CHAT_CHANCE, MESSAGE_CHANCE,
    GLITCH_CHANCE, DISTORT_CHANCE,
    CHAT_LINES, IDLE_MESSAGES,
    GLITCH_DURATION, DISTORT_DURATION,
} from "./constants.js";

// --- Elements ---
const streakEl    = document.getElementById("streak");
const accuracyEl  = document.getElementById("accuracy");
const bestEl      = document.getElementById("best");
const message     = document.getElementById("message");
const chatBox     = document.getElementById("chat");
const flowFill    = document.getElementById("flow-fill");
const diffLabel   = document.getElementById("diff-label"); // new element

// --- HUD ---
export function updateHUD({ streak, best, totalClicks, correctClicks }) {
    const accuracy = totalClicks === 0
        ? "–"
        : Math.floor((correctClicks / totalClicks) * 100) + "%";

    streakEl.innerText   = streak;
    bestEl.innerText     = best;
    accuracyEl.innerText = accuracy;
}

// --- Difficulty Label ---
let lastShownLabel = "";

export function showDifficultyLabel(label) {
    if (!diffLabel || label === lastShownLabel) return;
    lastShownLabel = label;

    diffLabel.innerText = label;
    diffLabel.classList.remove("diff-pop");
    // force reflow to restart animation
    void diffLabel.offsetWidth;
    diffLabel.classList.add("diff-pop");
}

// --- Flow Bar ---
export function updateFlowBar(flowState) {
    const pct = Math.min((flowState / FLOW.MAX) * 100, 100);
    flowFill.style.width = pct + "%";

    if (flowState > FLOW.HIGH_THRESHOLD) {
        flowFill.style.background = "linear-gradient(90deg, #ff2d78, #ff8800)";
        flowFill.style.boxShadow  = "0 0 8px rgba(255,45,120,0.7)";
    } else {
        flowFill.style.background = "linear-gradient(90deg, #00ffe0, #00ccff)";
        flowFill.style.boxShadow  = "0 0 8px rgba(0,255,224,0.6)";
    }
}

// --- Chat ---
export function maybeSendChat() {
    if (Math.random() >= CHAT_CHANCE) return;

    const div = document.createElement("div");
    div.innerText = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    chatBox.appendChild(div);

    while (chatBox.children.length > 6) {
        chatBox.removeChild(chatBox.firstChild);
    }
}

// --- Messages ---
export function maybeSendMessage({ flowState, streak, totalClicks }) {
    if (Math.random() >= MESSAGE_CHANCE) return;

    if (flowState > FLOW.HIGH_THRESHOLD) {
        message.innerText = "you're in it.";
    } else if (flowState > 20) {
        message.innerText = "don't stop...";
    } else if (streak === 0 && totalClicks > 5) {
        message.innerText = "focus.";
    } else {
        message.innerText = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
    }
}

// --- Glitch — returns true if glitch fired (so audio can react) ---
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