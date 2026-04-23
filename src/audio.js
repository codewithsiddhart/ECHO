// ============================================================
// audio.js — Web Audio API sounds, zero external files needed
// ============================================================

let ctx = null;

// Call once on first user interaction to unlock audio context
export function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
}

// --- Internal helpers ---

function masterGain(value = 0.5) {
    const g = ctx.createGain();
    g.gain.value = value;
    g.connect(ctx.destination);
    return g;
}

function osc(type, freq, start, duration, gainVal, pitchEnd = null) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);

    o.type      = type;
    o.frequency.setValueAtTime(freq, start);
    if (pitchEnd !== null) o.frequency.linearRampToValueAtTime(pitchEnd, start + duration);

    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);

    o.start(start);
    o.stop(start + duration);
}

// --- Public sounds ---

// Deep thud on every beat pulse
export function playBeat() {
    if (!ctx) return;
    const t = ctx.currentTime;

    // sub bass thud
    osc("sine", 80, t, 0.25, 0.6, 40);

    // click transient
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 8);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.3;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(t);
}

// Bright crisp ping on perfect hit
export function playPerfect() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sine",     880, t,       0.3,  0.5, 1100);
    osc("triangle", 440, t,       0.25, 0.4);
    osc("sine",    1760, t + 0.03, 0.18, 0.2);
}

// Softer blue tone on good hit
export function playGood() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sine",     440, t, 0.3, 0.35, 520);
    osc("triangle", 220, t, 0.2, 0.25);
}

// Harsh buzzy miss sound
export function playMiss() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sawtooth", 120, t,       0.2,  0.4, 60);
    osc("square",   180, t + 0.05, 0.15, 0.15);
}

// Win fanfare
export function playWin() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        osc("sine", freq, t + i * 0.12, 0.4, 0.4);
    });
}

// Glitch burst — digital noise
export function playGlitch() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc("sawtooth", 200 + Math.random() * 400, t, 0.08, 0.2);
    osc("square",   100 + Math.random() * 200, t + 0.04, 0.06, 0.15);
}