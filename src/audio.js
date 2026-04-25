// ============================================================
// audio.js — Web Audio API, reactive ambient drone + all hits
// ============================================================

let ctx         = null;
let droneNode   = null;
let droneGain   = null;
let droneFilter = null;

export function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    initDrone();
}

// ── Ambient drone ──────────────────────────────────────────
function initDrone() {
    if (!ctx) return;

    // Base oscillator — low rumble
    droneNode = ctx.createOscillator();
    droneNode.type = "sine";
    droneNode.frequency.value = 55; // A1

    // Filter for tonal shaping
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 200;

    droneGain = ctx.createGain();
    droneGain.gain.value = 0; // silent until game starts

    droneNode.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneNode.start();
}

// Call every beat — flowState 0-60 drives pitch and volume
export function updateDrone(flowState, modeColor) {
    if (!ctx || !droneNode) return;
    const t    = ctx.currentTime;
    const pct  = flowState / 60;

    // pitch rises from 55Hz → 110Hz as flow maxes
    droneNode.frequency.setTargetAtTime(55 + pct * 55, t, 0.8);

    // volume rises gently 0 → 0.08
    droneGain.gain.setTargetAtTime(pct * 0.08, t, 1.2);

    // filter opens up at high flow — more harmonic presence
    droneFilter.frequency.setTargetAtTime(120 + pct * 400, t, 1.0);
}

export function stopDrone() {
    if (!droneGain) return;
    droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
}

// ── Helpers ────────────────────────────────────────────────
function osc(type, freq, start, duration, gainVal, pitchEnd = null) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (pitchEnd !== null) o.frequency.linearRampToValueAtTime(pitchEnd, start + duration);
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    o.start(start);
    o.stop(start + duration);
}

// ── Beat ───────────────────────────────────────────────────
export function playBeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sine", 80, t, 0.25, 0.55, 38);
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 8);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.28;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(t);
}

// ── Hits ───────────────────────────────────────────────────
export function playPerfect() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sine",     880,  t,        0.30, 0.50, 1100);
    osc("triangle", 440,  t,        0.25, 0.35);
    osc("sine",    1760,  t + 0.03, 0.15, 0.20);
}

export function playGood() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sine",     440, t, 0.28, 0.32, 520);
    osc("triangle", 220, t, 0.18, 0.22);
}

export function playMiss() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sawtooth", 120, t,        0.20, 0.38, 58);
    osc("square",   180, t + 0.05, 0.12, 0.14);
}

export function playWin() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => osc("sine", freq, t + i * 0.12, 0.4, 0.4));
}

export function playGlitch() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sawtooth", 200 + Math.random() * 400, t,        0.08, 0.18);
    osc("square",   100 + Math.random() * 200, t + 0.04, 0.06, 0.13);
}

// ── Milestone flash sound ───────────────────────────────────
export function playMilestone(streak) {
    if (!ctx) return;
    const t    = ctx.currentTime;
    const freq = 440 + streak * 12; // higher pitch per milestone
    osc("sine", freq,       t,        0.18, 0.45);
    osc("sine", freq * 1.5, t + 0.06, 0.12, 0.30);
}

// ── Streak milestone chime ──────────────────────────────────
export function playStreakBell(n) {
    if (!ctx) return;
    const t     = ctx.currentTime;
    const notes = [523, 659, 784];
    const freq  = notes[(n / 5 - 1) % notes.length] || 523;
    osc("sine",     freq,     t,        0.5, 0.35);
    osc("triangle", freq * 2, t + 0.05, 0.3, 0.20);
}