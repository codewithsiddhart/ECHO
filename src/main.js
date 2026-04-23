// ============================================================
// main.js — entry point, wires everything together
// ============================================================

import { resetState, beatLoop, handleClick, gameStarted } from "./game.js";
import { generateFakePlayers, updateLeaderboard } from "./players.js";
import { updateHUD } from "./ui.js";
import { initAudio } from "./audio.js";

console.log("ECHO :: JS LOADED");

const audioOverlay = document.getElementById("audio-overlay");
const retryBtn     = document.getElementById("retry-btn");
const overlayBest  = document.getElementById("overlay-best"); // new

// --- Show all-time best on start screen ---
function showStoredBest() {
    const stored = localStorage.getItem("echo_best");
    if (overlayBest && stored && parseInt(stored) > 0) {
        overlayBest.innerText = "best: " + stored;
    }
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("ECHO :: INIT");
    showStoredBest();

    if (audioOverlay) {
        audioOverlay.style.display = "flex";

        audioOverlay.addEventListener("click", (e) => {
            e.stopPropagation();
            if (gameStarted) return;
            initAudio(); // unlock audio context on first tap
            audioOverlay.style.display = "none";
            startGame();
        });
    } else {
        startGame();
    }
});

// --- Start ---
function startGame() {
    console.log("ECHO :: START");
    resetState();
    updateHUD({ streak: 0, best: 0, totalClicks: 0, correctClicks: 0 });
    generateFakePlayers();
    updateLeaderboard(0);
    beatLoop();
}

// --- Global click/touch → game ---
function handleInput(e) {
    if (e.target.closest("#retry-btn"))     return;
    if (e.target.closest("#audio-overlay")) return;
    if (e.target.closest("#end-screen"))    return;
    handleClick();
}

document.addEventListener("click",      handleInput);
document.addEventListener("touchstart", handleInput, { passive: true });

// --- Retry ---
retryBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    location.reload();
});

retryBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    location.reload();
}, { passive: true });