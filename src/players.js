// players.js — fake leaderboard with alive random drops
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
    fakePlayers.forEach(p => {
        if (p.score < 75) {
            p.score = Math.min(p.score + Math.random() * 1.2, 75);
        } else {
            // 30% chance to drop 1-3 points — leaderboard feels alive
            if (Math.random() < 0.30) p.score = Math.max(0, p.score - (1 + Math.random() * 2));
            // also random small climbs even at top
            else if (Math.random() < 0.4) p.score = Math.min(90, p.score + Math.random() * 0.5);
        }
    });
    currentBeat++;
}

export function updateLeaderboard(playerStreak) {
    if (!leaderboardBox) return;
    const players = [...fakePlayers, { name: "YOU", score: playerStreak }];
    if (hasGhost()) players.push({ name: "GHOST", score: ghostScoreAt(currentBeat), isGhost: true });
    players.sort((a, b) => b.score - a.score);

    leaderboardBox.innerHTML = players.slice(0, 6).map((p, i) => {
        let tag;
        if (p.name === "YOU")       tag = `<span style="color:var(--accent)">YOU</span>`;
        else if (p.isGhost)         tag = `<span style="color:rgba(180,180,255,0.55);font-style:italic">GHOST</span>`;
        else                        tag = p.name;
        return `${i+1}. ${tag} <span style="color:var(--mid);font-size:0.62rem">${Math.floor(p.score)}</span>`;
    }).join("<br>");
}
