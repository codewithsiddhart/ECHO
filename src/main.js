// ============================================================
// main.js — entry point, mode select, keyboard, panels, facts
// ============================================================

import { resetState, beatLoop, handleClick, gameStarted } from "./game.js";
import { generateFakePlayers, updateLeaderboard } from "./players.js";
import { updateHUD, applyModeTheme } from "./ui.js";
import { initAudio } from "./audio.js";
import { fetchFact } from "./facts.js";
import { setMode, getMode, GAME_MODES } from "./modes.js";

console.log("ECHO :: JS LOADED");

// ── Element refs ─────────────────────────────────────────────
const audioOverlay  = document.getElementById("audio-overlay");
const modeScreen    = document.getElementById("mode-screen");
const retryBtn      = document.getElementById("retry-btn");
const changeModeBtn = document.getElementById("change-mode-btn");
const overlayBest   = document.getElementById("overlay-best");
const factText      = document.getElementById("fact-text");
const factBtn       = document.getElementById("fact-btn");

// ── Panels ───────────────────────────────────────────────────
let activePanel = null;

function initPanels() {
    document.getElementById("nav-play").addEventListener("click",     () => openPanel(null));
    document.getElementById("nav-tutorial").addEventListener("click", () => openPanel("tutorial"));
    document.getElementById("nav-about").addEventListener("click",    () => openPanel("about"));
}

function openPanel(name) {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("nav-active"));
    document.getElementById("nav-" + (name ?? "play")).classList.add("nav-active");
    activePanel = name;

    const wrap  = document.getElementById("panel-wrap");
    const tut   = document.getElementById("panel-tutorial");
    const about = document.getElementById("panel-about");
    tut.classList.add("hidden");
    about.classList.add("hidden");

    if (name) {
        wrap.classList.remove("hidden");
        wrap.classList.remove("panel-animate");
        void wrap.offsetWidth;
        wrap.classList.add("panel-animate");
        if (name === "tutorial") tut.classList.remove("hidden");
        if (name === "about")    about.classList.remove("hidden");
    } else {
        wrap.classList.add("hidden");
    }
}

export function isPanelOpen() { return activePanel !== null; }

// ── Mode select screen ───────────────────────────────────────
function initModeSelect() {
    const btns = document.querySelectorAll(".mode-card");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            const modeId = btn.dataset.mode;
            setMode(modeId);
            applyModeTheme(getMode());
            showStoredBest();
            modeScreen.classList.add("hidden");
            startGame();
        });
    });
}

// ── Stored best per mode ─────────────────────────────────────
function showStoredBest() {
    const mode   = getMode();
    const stored = localStorage.getItem("echo_best_" + mode.id);
    if (overlayBest && stored && parseInt(stored) > 0) {
        overlayBest.innerText = "best on " + mode.label + ": " + stored;
    } else if (overlayBest) {
        overlayBest.innerText = "";
    }
}

// ── Facts ────────────────────────────────────────────────────
async function loadFact() {
    if (!factText) return;
    factText.style.opacity = "0.1";
    factText.innerText = "···";
    const fact = await fetchFact();
    factText.innerText = fact;
    factText.classList.remove("fact-pop");
    void factText.offsetWidth;
    factText.classList.add("fact-pop");
}

// ── Init ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    console.log("ECHO :: INIT");
    initPanels();
    initModeSelect();
    loadFact();

    if (factBtn) {
        factBtn.addEventListener("click",     (e) => { e.stopPropagation(); loadFact(); });
        factBtn.addEventListener("touchstart",(e) => { e.stopPropagation(); loadFact(); }, { passive: true });
    }

    if (changeModeBtn) {
        changeModeBtn.addEventListener("click", () => location.reload());
    }

    // First screen = audio unlock overlay
    if (audioOverlay) {
        audioOverlay.style.display = "flex";
        audioOverlay.addEventListener("click", (e) => {
            e.stopPropagation();
            initAudio();
            audioOverlay.style.display = "none";
            // show mode select next
            modeScreen.classList.remove("hidden");
        });
    }
});

// ── Start game ───────────────────────────────────────────────
function startGame() {
    console.log("ECHO :: START —", getMode().label);
    resetState();
    updateHUD({ streak: 0, best: 0, totalClicks: 0, correctClicks: 0 });
    generateFakePlayers();
    updateLeaderboard(0);
    beatLoop();
}

// ── Global input (click + touch + keyboard) ──────────────────
function handleInput(e) {
    if (isPanelOpen())                      return;
    if (e.target?.closest?.("#retry-btn"))     return;
    if (e.target?.closest?.("#audio-overlay")) return;
    if (e.target?.closest?.("#mode-screen"))   return;
    if (e.target?.closest?.("#end-screen"))    return;
    if (e.target?.closest?.("#bottom-nav"))    return;
    if (e.target?.closest?.("#fact-strip"))    return;
    if (e.target?.closest?.("#panel-wrap"))    return;
    if (e.target?.closest?.("#change-mode-btn")) return;
    handleClick();
}

document.addEventListener("click",      handleInput);
document.addEventListener("touchstart", handleInput, { passive: true });

// ── Keyboard support ─────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    if (e.repeat) return; // ignore held keys
    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!isPanelOpen() && !modeScreen?.classList.contains("hidden") === false) {
            handleClick();
        }
    }
});

// ── Retry ────────────────────────────────────────────────────
retryBtn?.addEventListener("click",     (e) => { e.stopPropagation(); location.reload(); });
retryBtn?.addEventListener("touchstart",(e) => { e.stopPropagation(); location.reload(); }, { passive: true });