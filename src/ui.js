// ui.js — HUD, flow bar, effects, toast, practice zones
import {
    FLOW, CHAT_CHANCE, MESSAGE_CHANCE, DISTORT_CHANCE,
    CHAT_LINES, IDLE_MESSAGES, GLITCH_DURATION, DISTORT_DURATION,
} from "./constants.js";
import { getMode } from "./modes.js";

// ── Cached element refs ──────────────────────────────────────
const streakEl       = document.getElementById("streak");
const bestEl         = document.getElementById("best");
const message        = document.getElementById("message");
const chatBox        = document.getElementById("chat");
const flowFill       = document.getElementById("flow-fill");
const diffLabel      = document.getElementById("diff-label");
const comboBurst     = document.getElementById("combo-burst");
const modeTag        = document.getElementById("mode-tag");
const milestoneEl    = document.getElementById("milestone-flash");
const scoreEl        = document.getElementById("score-display");
const multEl         = document.getElementById("mult-display");
const practiceHintEl = document.getElementById("practice-hint");
const speedEl        = document.getElementById("click-speed");
const accuracyEl     = document.getElementById("accuracy");

// ── Theme ────────────────────────────────────────────────────
export function applyModeTheme(mode) {
    const root = document.documentElement;
    root.style.setProperty("--accent",     mode.color);
    root.style.setProperty("--accent-rgb", mode.colorRgb);
    root.style.setProperty("--glow",
        `0 0 20px rgba(${mode.colorRgb},0.6), 0 0 60px rgba(${mode.colorRgb},0.25)`);
    if (modeTag) { modeTag.innerText = mode.label; modeTag.style.color = mode.color; }
    _flowHighState = false;
    _applyFlowStyle(false);
}

// ── HUD ─────────────────────────────────────────────────────
export function updateHUD({ streak, best, totalClicks, correctClicks }) {
    if (streakEl) streakEl.innerText = streak;
    if (bestEl)   bestEl.innerText   = best;
    // accuracy + speed elements may not exist in new HTML — guard silently
    if (accuracyEl) {
        accuracyEl.innerText = totalClicks === 0
            ? "–" : Math.floor((correctClicks / totalClicks) * 100) + "%";
    }
}

// ── Click speed ──────────────────────────────────────────────
export function updateClickSpeed(diff) {
    if (!speedEl) return;
    speedEl.innerText = Math.round(diff) + "ms";
    const mode = getMode();
    speedEl.style.color = diff < mode.perfectWindow ? "#00ffe0"
                        : diff < mode.goodWindow    ? "#4a9fff" : "#ff2d78";
}

// ── Difficulty label ─────────────────────────────────────────
let _lastLabel = "";
export function showDifficultyLabel(label) {
    if (!diffLabel || label === _lastLabel) return;
    _lastLabel = label;
    diffLabel.innerText = label;
    diffLabel.classList.remove("diff-pop");
    void diffLabel.offsetWidth;
    diffLabel.classList.add("diff-pop");
}

// ── Combo / Milestone ────────────────────────────────────────
export function showCombo(streak) {
    if (!comboBurst) return;
    comboBurst.innerText = `× ${streak} COMBO`;
    comboBurst.classList.remove("combo-pop");
    void comboBurst.offsetWidth;
    comboBurst.classList.add("combo-pop");
}

export function showMilestone(streak) {
    if (!milestoneEl) return;
    milestoneEl.innerText = streak;
    milestoneEl.classList.remove("milestone-pop");
    void milestoneEl.offsetWidth;
    milestoneEl.classList.add("milestone-pop");
}

// ── Flow bar — only repaints on actual change ────────────────
let _lastFlowPct   = -1;
let _flowHighState = false;

function _applyFlowStyle(isHigh) {
    if (!flowFill) return;
    const mode = getMode();
    if (isHigh) {
        flowFill.style.background = `linear-gradient(0deg,#ff8800,${mode.color})`;
        flowFill.style.boxShadow  = `0 0 10px rgba(${mode.colorRgb},0.9)`;
    } else {
        flowFill.style.background = `linear-gradient(0deg,${mode.color},#00ccff)`;
        flowFill.style.boxShadow  = `0 0 10px rgba(${mode.colorRgb},0.7)`;
    }
}

export function updateFlowBar(flowState) {
    const pct    = Math.min((flowState / FLOW.MAX) * 100, 100);
    const pctInt = pct | 0;
    if (pctInt !== _lastFlowPct) {
        _lastFlowPct = pctInt;
        if (flowFill) flowFill.style.height = pct + "%";
        const pctEl = document.getElementById("flow-pct");
        if (pctEl) pctEl.innerText = pctInt + "%";
    }
    const isHigh = flowState > (FLOW.HIGH_THRESHOLD ?? 40);
    if (isHigh !== _flowHighState) {
        _flowHighState = isHigh;
        _applyFlowStyle(isHigh);
    }
}

// ── Chat ─────────────────────────────────────────────────────
export function maybeSendChat(context = {}) {
    if (!chatBox || Math.random() >= CHAT_CHANCE) return;
    const { tierLabel, modeId } = context;
    // Pick the right bucket — fall back to SYNC II as generic
    let bucket = CHAT_LINES[tierLabel] || CHAT_LINES["SYNC II"];
    // impossible mode gets its own flavour at any tier
    if (modeId === "impossible" && Math.random() < 0.4) bucket = CHAT_LINES["impossible"];
    const div = document.createElement("div");
    div.innerText = bucket[Math.floor(Math.random() * bucket.length)];
    chatBox.appendChild(div);
    while (chatBox.children.length > 6) chatBox.removeChild(chatBox.firstChild);
}

// ── Phase messages ───────────────────────────────────────────
export function maybeSendMessage({ flowState, streak, totalClicks }) {
    if (!message || Math.random() >= MESSAGE_CHANCE) return;
    if      (flowState > (FLOW.HIGH_THRESHOLD ?? 40)) message.innerText = "you're in it.";
    else if (flowState > 20)                          message.innerText = "don't stop...";
    else if (streak === 0 && totalClicks > 5)         message.innerText = "focus.";
    else message.innerText = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
}

// ── Glitch ───────────────────────────────────────────────────
export function maybeGlitch(flowState, glitchChance, safeTimeout) {
    let fired = false;
    if (Math.random() < glitchChance) {
        document.body.classList.add("glitch");
        safeTimeout(() => document.body.classList.remove("glitch"), GLITCH_DURATION);
        fired = true;
    }
    if (flowState > (FLOW.GLOW_THRESHOLD ?? 50) && Math.random() < DISTORT_CHANCE) {
        document.body.classList.add("distort");
        safeTimeout(() => document.body.classList.remove("distort"), DISTORT_DURATION);
        fired = true;
    }
    return fired;
}

// ── Score / Multiplier ───────────────────────────────────────
export function showScore(score, multiplier) {
    if (scoreEl) scoreEl.innerText = score.toLocaleString();
    if (multEl) {
        multEl.innerText    = multiplier > 1 ? `×${multiplier}` : "";
        multEl.dataset.mult = multiplier;
    }
}

export function showMultiplierChange(_mult) {
    if (!multEl) return;
    multEl.classList.remove("mult-pop");
    void multEl.offsetWidth;
    multEl.classList.add("mult-pop");
}

// ── Practice hint ────────────────────────────────────────────
let _practiceTimer = null;
export function showPracticeHint(diff, type) {
    if (!practiceHintEl) return;
    clearTimeout(_practiceTimer);
    const text = diff < 5      ? "DEAD ON"
               : type === "miss" ? Math.round(diff) + "ms off"
               : (diff > 0 ? "+" : "") + Math.round(diff) + "ms";
    practiceHintEl.innerText    = text;
    practiceHintEl.dataset.type = type;
    practiceHintEl.classList.remove("hint-pop");
    void practiceHintEl.offsetWidth;
    practiceHintEl.classList.add("hint-pop");
    _practiceTimer = setTimeout(() => { if (practiceHintEl) practiceHintEl.innerText = ""; }, 900);
}

// ── Practice zone rings ──────────────────────────────────────
// Shows green (perfect) and yellow (good) halos around circle in practice mode
const CIRCLE_BASE_PX = 150; // px diameter of #circle

export function showPracticeZones(perfectMs, goodMs, intervalMs) {
    const zonePerfect = document.getElementById("zone-perfect");
    const zoneGood    = document.getElementById("zone-good");
    if (!zonePerfect || !zoneGood) return;

    // Scale: perfectMs and goodMs as fraction of intervalMs → visual ring radius
    // Circle radius = 75px. Zones extend outward proportionally.
    const base   = CIRCLE_BASE_PX / 2;
    const pRatio = Math.min(perfectMs / intervalMs, 0.5);
    const gRatio = Math.min(goodMs    / intervalMs, 0.5);

    const pSize  = (base + 20 + pRatio * 80) * 2;
    const gSize  = (base + 20 + gRatio * 80) * 2;

    zonePerfect.style.width  = pSize + "px";
    zonePerfect.style.height = pSize + "px";
    zoneGood.style.width     = gSize + "px";
    zoneGood.style.height    = gSize + "px";

    zonePerfect.classList.remove("hidden");
    zoneGood.classList.remove("hidden");
}

export function hidePracticeZones() {
    document.getElementById("zone-perfect")?.classList.add("hidden");
    document.getElementById("zone-good")?.classList.add("hidden");
}

// ── Taunt message ─────────────────────────────────────────────
let _tauntTimeout = null;
export function showTauntMessage(text) {
    let el = document.getElementById("taunt-overlay");
    if (!el) {
        el = document.createElement("div");
        el.id = "taunt-overlay";
        document.getElementById("app")?.appendChild(el);
    }
    clearTimeout(_tauntTimeout);
    el.innerText = text;
    el.classList.remove("taunt-in");
    void el.offsetWidth;
    el.classList.add("taunt-in");
    el.style.display = "flex";
    _tauntTimeout = setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => { el.style.display = "none"; el.style.opacity = ""; }, 600);
    }, 2500);
}

// ── Toast notifications ───────────────────────────────────────
export function toast(text, type = "info", duration = 2800) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerText = text;
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.classList.add("toast-visible"));

    setTimeout(() => {
        el.classList.remove("toast-visible");
        setTimeout(() => el.remove(), 400);
    }, duration);
}
