// ============================================================
// players.js — fake players + leaderboard
// ============================================================

import { PLAYER_NAMES } from "./constants.js";

const leaderboardBox = document.getElementById("leaderboard");
let fakePlayers = [];

export function generateFakePlayers() {
    fakePlayers = PLAYER_NAMES.map(name => ({ name, score: Math.random() * 8 }));
}

export function updateFakePlayers() {
    fakePlayers.forEach(p => { p.score = Math.min(p.score + Math.random() * 1.2, 75); });
}

export function updateLeaderboard(playerStreak) {
    const players = [...fakePlayers, { name: "YOU", score: playerStreak }];
    players.sort((a, b) => b.score - a.score);
    leaderboardBox.innerHTML = players.slice(0, 5).map((p, i) => {
        const tag = p.name === "YOU"
            ? `<span style="color:var(--accent);text-shadow:var(--glow-cyan)">${p.name}</span>`
            : p.name;
        return `${i + 1}. ${tag} <span style="color:var(--mid)">${Math.floor(p.score)}</span>`;
    }).join("<br>");
}