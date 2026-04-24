// ============================================================
// audio.js — Web Audio API, zero external files
// ============================================================

let ctx = null;

export function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
}

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