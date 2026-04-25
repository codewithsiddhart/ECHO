// ============================================================
// players.js — fake players + leaderboard with ghost support
// ============================================================

import { PLAYER_NAMES } from "./constants.js";
import { hasGhost, ghostScoreAt } from "./ghost.js";

const leaderboardBox = document.getElementById("leaderboard");
let fakePlayers = [];
let currentBeat = 0;

export function generateFakePlayers() {
    fakePlayers = PLAYER_NAMES.map(name => ({ name, score: Math.random() * 8 }));
    currentBeat = 0;
}

export function updateFakePlayers() {
    fakePlayers.forEach(p => { p.score = Math.min(p.score + Math.random() * 1.2, 75); });
    currentBeat++;
}

export function updateLeaderboard(playerStreak) {
    const players = [...fakePlayers, { name: "YOU", score: playerStreak }];

    // Add ghost if exists
    if (hasGhost()) {
        players.push({ name: "GHOST", score: ghostScoreAt(currentBeat), isGhost: true });
    }

    players.sort((a, b) => b.score - a.score);

    leaderboardBox.innerHTML = players.slice(0, 6).map((p, i) => {
        let tag;
        if (p.name === "YOU") {
            tag = `<span style="color:var(--accent);text-shadow:var(--glow-cyan)">YOU</span>`;
        } else if (p.isGhost) {
            tag = `<span style="color:rgba(180,180,255,0.6);font-style:italic">GHOST</span>`;
        } else {
            tag = p.name;
        }
        return `${i + 1}. ${tag} <span style="color:var(--mid);font-size:0.65rem">${Math.floor(p.score)}</span>`;
    }).join("<br>");
}