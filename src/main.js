// ============================================================
// main.js — entry point
// ============================================================

import { resetState, beatLoop, handleClick, gameStarted } from "./game.js";
import { generateFakePlayers, updateLeaderboard } from "./players.js";
import { updateHUD } from "./ui.js";
import { initAudio } from "./audio.js";
import { fetchFact } from "./facts.js";

console.log("ECHO :: JS LOADED");

const audioOverlay = document.getElementById("audio-overlay");
const retryBtn     = document.getElementById("retry-btn");
const overlayBest  = document.getElementById("overlay-best");
const factText     = document.getElementById("fact-text");
const factBtn      = document.getElementById("fact-btn");

// --- Panels ---
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

// --- Facts ---
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

// --- Stored best ---
function showStoredBest() {
    const stored = localStorage.getItem("echo_best");
    if (overlayBest && stored && parseInt(stored) > 0)
        overlayBest.innerText = "all-time best: " + stored;
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("ECHO :: INIT");
    showStoredBest();
    initPanels();
    loadFact();

    if (factBtn) {
        factBtn.addEventListener("click",     (e) => { e.stopPropagation(); loadFact(); });
        factBtn.addEventListener("touchstart",(e) => { e.stopPropagation(); loadFact(); }, { passive: true });
    }

    if (audioOverlay) {
        audioOverlay.style.display = "flex";
        audioOverlay.addEventListener("click", (e) => {
            e.stopPropagation();
            if (gameStarted) return;
            initAudio();
            audioOverlay.style.display = "none";
            startGame();
        });
    } else {
        startGame();
    }
});

function startGame() {
    console.log("ECHO :: START");
    resetState();
    updateHUD({ streak: 0, best: 0, totalClicks: 0, correctClicks: 0 });
    generateFakePlayers();
    updateLeaderboard(0);
    beatLoop();
}

// --- Input guard ---
function handleInput(e) {
    if (isPanelOpen())                      return;
    if (e.target.closest("#retry-btn"))     return;
    if (e.target.closest("#audio-overlay")) return;
    if (e.target.closest("#end-screen"))    return;
    if (e.target.closest("#bottom-nav"))    return;
    if (e.target.closest("#fact-strip"))    return;
    if (e.target.closest("#panel-wrap"))    return;
    handleClick();
}

document.addEventListener("click",      handleInput);
document.addEventListener("touchstart", handleInput, { passive: true });

retryBtn.addEventListener("click",     (e) => { e.stopPropagation(); location.reload(); });
retryBtn.addEventListener("touchstart",(e) => { e.stopPropagation(); location.reload(); }, { passive: true });

let keyHeld = false;

window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !keyHeld) {
        keyHeld = true;
        e.preventDefault();
        handleClick();
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
        keyHeld = false;
    }
});