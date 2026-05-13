// history.js — last 10 runs stored locally
// Shows your progression over time in the records panel

const KEY      = "echo_run_history";
const MAX_RUNS = 10;

export function saveRun({ mode, streak, score, accuracy, result, timestamp }) {
    const history = getHistory();
    history.unshift({ mode, streak, score, accuracy, result, timestamp });
    localStorage.setItem(KEY, JSON.stringify(history.slice(0, MAX_RUNS)));
}

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
}

export function renderHistory(container) {
    const history = getHistory();
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `<div class="hist-empty">no runs yet.<br>your progression will appear here.</div>`;
        return;
    }

    // Keys match the real mode IDs written by saveRun() in game.js
    const modeColors = {
        easy:      "#00ffe0",
        medium:    "#00ccff",
        hard:      "#ff8800",
        impossible:"#ff2d78",
        listen:    "#a0ff80",
        practice:  "#a0ff80",
        rhythm:    "#c480ff",
        daily:     "#ffd700",
    };

    const resultIcons = {
        master: "✦", drift: "◌", fail: "×", practice: "◎"
    };

    container.innerHTML = history.map((run, i) => {
        const col  = modeColors[run.mode] || "#fff";
        const icon = resultIcons[run.result] || "×";
        const ago  = _timeAgo(run.timestamp);
        const streakBar = _miniBar(run.streak, 30);
        return `
        <div class="hist-row">
            <span class="hist-icon" style="color:${col}">${icon}</span>
            <div class="hist-main">
                <div class="hist-top">
                    <span class="hist-mode" style="color:${col}">${(run.mode || "?").toUpperCase()}</span>
                    <span class="hist-streak">×${run.streak}</span>
                    <span class="hist-acc">${run.accuracy}</span>
                </div>
                <div class="hist-bar">${streakBar}</div>
            </div>
            <span class="hist-ago">${ago}</span>
        </div>`;
    }).join("");
}

function _miniBar(streak, maxStreak) {
    const pct  = Math.min(streak / maxStreak, 1);
    const fill = Math.round(pct * 16); // 16 chars wide
    const col  = streak >= maxStreak ? "var(--accent)" : pct > 0.6 ? "#ff8800" : "rgba(255,255,255,0.25)";
    return `<div class="hist-bar-fill" style="width:${pct*100}%;background:${col}"></div>`;
}

function _timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const m    = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (m < 1)   return "just now";
    if (m < 60)  return m + "m ago";
    if (h < 24)  return h + "h ago";
    if (d < 7)   return d + "d ago";
    return new Date(ts).toLocaleDateString();
}
