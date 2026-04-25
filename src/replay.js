// ============================================================
// replay.js — record each beat event, render accuracy waveform
// ============================================================

let events = []; // { type: "perfect"|"good"|"miss", diff: ms }

export function replayReset() { events = []; }

export function replayRecord(type, diff) {
    events.push({ type, diff });
}

// Render a mini SVG bar chart into #replay-graph
export function replayRender() {
    const el = document.getElementById("replay-graph");
    if (!el || events.length === 0) return;

    const W = 260, H = 40;
    const barW  = Math.max(2, Math.floor(W / events.length) - 1);
    const gap   = Math.max(1, Math.floor(W / events.length) - barW);

    const colourMap = { perfect: "#00ffe0", good: "#4a9fff", miss: "#ff2d78" };

    let bars = "";
    events.forEach((ev, i) => {
        const x      = i * (barW + gap);
        const height = ev.type === "miss" ? H * 0.35 : ev.type === "good" ? H * 0.65 : H;
        const y      = H - height;
        const col    = colourMap[ev.type];
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${height}" fill="${col}" opacity="0.75" rx="1"/>`;
    });

    el.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
             style="width:100%;height:${H}px;display:block;">
          ${bars}
        </svg>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:4px;font-family:'Share Tech Mono',monospace;font-size:0.52rem;opacity:0.5;">
          <span style="color:#00ffe0">■ perfect</span>
          <span style="color:#4a9fff">■ good</span>
          <span style="color:#ff2d78">■ miss</span>
        </div>`;
}