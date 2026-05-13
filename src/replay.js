// replay.js — records events + renders streak line chart + accuracy bars
let events  = []; // { type, diff }
let streaks = []; // running streak value after each event

export function replayReset() { events = []; streaks = []; }

export function replayRecord(type, diff) {
    events.push({ type, diff });
    // Compute running streak
    const prev   = streaks.length ? streaks[streaks.length - 1] : 0;
    const streak = type === "miss" ? 0 : prev + 1;
    streaks.push(streak);
}

export function replayRender() {
    _renderBars();
    _renderStreakLine();
}

// ── Accuracy bar chart (existing) ────────────────────────────
function _renderBars() {
    const el = document.getElementById("replay-graph");
    if (!el || events.length === 0) return;

    const W = 280, H = 36;
    const slot = Math.max(3, Math.floor(W / events.length));
    const barW = Math.max(2, slot - 1);

    const colMap = { perfect: "#00ffe0", good: "#4a9fff", miss: "#ff2d78" };
    let bars = "";
    events.forEach((ev, i) => {
        const h   = ev.type === "miss" ? H * 0.32 : ev.type === "good" ? H * 0.65 : H;
        const col = colMap[ev.type];
        bars += `<rect x="${i*slot}" y="${H-h}" width="${barW}" height="${h}" fill="${col}" opacity="0.78" rx="1"/>`;
    });

    el.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;">${bars}</svg>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:4px;font-family:'Share Tech Mono',monospace;font-size:0.5rem;opacity:0.45;">
            <span style="color:#00ffe0">■ perfect</span>
            <span style="color:#4a9fff">■ good</span>
            <span style="color:#ff2d78">■ miss</span>
        </div>`;
}

// ── Streak line chart (new) ───────────────────────────────────
function _renderStreakLine() {
    const el = document.getElementById("streak-graph");
    if (!el || streaks.length < 2) return;

    const W   = 280, H = 60;
    const max = Math.max(...streaks, 1);
    const pts = streaks.map((s, i) => {
        const x = (i / (streaks.length - 1)) * W;
        const y = H - (s / max) * (H - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    // Area fill under the line
    const firstX = 0, lastX = W;
    const area = `0,${H} ${pts} ${lastX},${H}`;

    // Peak marker
    const peakIdx = streaks.indexOf(max);
    const px = ((peakIdx / (streaks.length - 1)) * W).toFixed(1);
    const py = (H - (max / max) * (H - 4) - 2).toFixed(1);

    el.innerHTML = `
        <div class="sg-label">STREAK CURVE</div>
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible;">
            <defs>
                <linearGradient id="sg-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <polygon points="${area}" fill="url(#sg-grad)"/>
            <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>
            <!-- Peak dot -->
            <circle cx="${px}" cy="${py}" r="4" fill="var(--accent)" opacity="0.95"/>
            <text x="${px}" y="${parseFloat(py)-8}" text-anchor="middle" fill="var(--accent)"
                  font-family="monospace" font-size="9" opacity="0.85">×${max}</text>
            <!-- Baseline -->
            <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        </svg>`;
}

// Expose raw data for share card
export function getReplayData() { return { events, streaks }; }
