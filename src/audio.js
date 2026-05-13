// ============================================================
// audio.js — ECHO pattern-driven music engine v2
//
// PHILOSOPHY:
//   Audio is not decoration. It IS the game.
//   The beat the player taps IS the beat the music plays.
//   Every mode has a distinct sonic identity — not just louder/faster.
//   The home screen and in-game are one continuous musical world.
//   Flow state earns richer layers, not just more volume.
//
// ARCHITECTURE:
//   setAudioMode(modeId)     — locks mode DNA before a run
//   notifyBeat(intervalMs)   — game tells audio the EXACT next beat interval
//   notifyHit(type)          — "perfect"|"good" — melodic response in key
//   notifyMiss()             — harmonic rupture
//   updateDrone(flow)        — 0–60, unlocks layers at thresholds
//   startHomeAmbience()      — plays from home screen; morphs into game music
//   startMusic()             — game start; notifyBeat() drives from here
//   stopDrone()              — cleanup
//
// MODE IDENTITIES:
//   easy       — warm, spacious, major pentatonic. Feels like you have room.
//   medium     — punchy, minor, slight tension. Things are moving.
//   hard       — industrial, flat-9 dissonance, dry stabs. Hostile.
//   impossible — microtonal drift, inverted harmony, barely a pulse.
//
// PATTERN SYNC:
//   notifyBeat(ms) is called by game.js on EVERY beat with the exact
//   interval from the pattern array. Kick, bass, hihat, arp all subdivide
//   from this interval — so the music IS the rhythm you are tapping.
// ============================================================

let ctx = null;
let masterGain = null, masterComp = null;
let reverbNode = null, reverbReturn = null;
let delayNode  = null, delayFeedback = null, delayReturn = null;

// ── State ────────────────────────────────────────────────────
let _flow    = 0;
let _modeId  = "medium";
let _musicOn = false;
let _beatMs  = 700;
let _beatPhase  = 0;
let _groovePhase = 0;
let _key     = 0;
let _homeOn  = false;

const _musicTimeouts = new Set();

// ── Mode DNA — each mode's complete sonic personality ────────
const MODE_DNA = {
    easy: {
        scale:       [0, 2, 4, 7, 9],       // C major pentatonic
        rootHz:      261.63,                 // C4
        beatTimbre:  "sine",
        beatFreq:    110, beatFreqEnd: 55, beatDecay: 0.28,
        bassTimbre:  "triangle", bassFilter: 900,
        arpTimbre:   "sine",
        padRatio:    [1, 1.25, 1.5],         // major triad
        droneRoot:   65.41, droneOct: 1.5,
        reverbWet:   0.35, delayWet: 0.18,
        hitShimmer:  880, missFreq: 180,
    },
    medium: {
        scale:       [0, 2, 3, 7, 8],        // A natural minor (subset)
        rootHz:      220,                     // A3
        beatTimbre:  "sine",
        beatFreq:    90, beatFreqEnd: 40, beatDecay: 0.22,
        bassTimbre:  "sawtooth", bassFilter: 600,
        arpTimbre:   "sawtooth",
        padRatio:    [1, 1.2, 1.498],         // minor triad
        droneRoot:   55, droneOct: 1.498,
        reverbWet:   0.22, delayWet: 0.28,
        hitShimmer:  740, missFreq: 140,
    },
    hard: {
        scale:       [0, 1, 3, 6, 8],         // D phrygian dominant flavor
        rootHz:      146.83,                   // D3
        beatTimbre:  "square",
        beatFreq:    75, beatFreqEnd: 35, beatDecay: 0.18,
        bassTimbre:  "sawtooth", bassFilter: 380,
        arpTimbre:   "square",
        padRatio:    [1, 1.189, 1.414],        // diminished cluster
        droneRoot:   73.42, droneOct: 1.189,
        reverbWet:   0.10, delayWet: 0.08,
        hitShimmer:  560, missFreq: 100,
    },
    impossible: {
        scale:       [0, 1, 2, 6, 7],          // B near-cluster
        rootHz:      123.47,                    // B2
        beatTimbre:  "sawtooth",
        beatFreq:    60, beatFreqEnd: 28, beatDecay: 0.14,
        bassTimbre:  "sawtooth", bassFilter: 260,
        arpTimbre:   "sawtooth",
        padRatio:    [1, 1.122, 1.260],         // compressed cluster
        droneRoot:   61.74, droneOct: 1.260,
        reverbWet:   0.06, delayWet: 0.04,
        hitShimmer:  420, missFreq: 80,
    },
};

function _dna() { return MODE_DNA[_modeId] ?? MODE_DNA.medium; }

// ── Drone ────────────────────────────────────────────────────
let droneOsc = null, droneOsc2 = null, droneGain = null, droneFilter = null;

// ── Internal counters for melodic progression ────────────────
const _bassWalk  = [0, 0, 4, 0, 2, 0, 3, 0];
let _bassIdx = 0;
const ARP_SHAPES = [
    [0, 2, 4, 2], [4, 2, 0, 2], [0, 4, 2, 4], [0, 1, 2, 4], [4, 3, 2, 0],
];
let _arpIdx = 0, _arpShape = 0;

// ── Init ─────────────────────────────────────────────────────
let _audioFailed = false;
export function isAudioFailed() { return _audioFailed; }

export function initAudio() {
    if (ctx) return;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        _buildMasterChain();
        _buildDrone();
        setTimeout(() => { _buildReverb(); _buildDelay(); }, 200);
        // iOS sometimes creates the context in 'suspended' state; resume it
        if (ctx.state === "suspended") {
            ctx.resume().catch(() => _setAudioFailed());
        }
    } catch (e) {
        _setAudioFailed();
    }
}

function _setAudioFailed() {
    _audioFailed = true;
    const banner = document.getElementById("audio-failed-banner");
    if (banner) banner.classList.remove("hidden");
}

function _buildMasterChain() {
    masterComp = ctx.createDynamicsCompressor();
    masterComp.threshold.value = -14; masterComp.knee.value = 8;
    masterComp.ratio.value = 4; masterComp.attack.value = 0.003; masterComp.release.value = 0.18;
    masterGain = ctx.createGain(); masterGain.gain.value = 0.88;
    masterComp.connect(masterGain); masterGain.connect(ctx.destination);
}

function _buildReverb() {
    if (!ctx) return;
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.4);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverbNode = ctx.createConvolver(); reverbNode.buffer = buf;
    reverbReturn = ctx.createGain(); reverbReturn.gain.value = 0;
    reverbNode.connect(reverbReturn); reverbReturn.connect(masterComp);
}

function _buildDelay() {
    if (!ctx) return;
    delayNode = ctx.createDelay(1.0); delayNode.delayTime.value = 0.26;
    delayFeedback = ctx.createGain(); delayFeedback.gain.value = 0.32;
    delayReturn = ctx.createGain(); delayReturn.gain.value = 0;
    delayNode.connect(delayFeedback); delayFeedback.connect(delayNode);
    delayNode.connect(delayReturn); delayReturn.connect(masterComp);
}

function _buildDrone() {
    droneOsc = ctx.createOscillator(); droneOsc2 = ctx.createOscillator();
    droneFilter = ctx.createBiquadFilter(); droneGain = ctx.createGain();
    droneOsc.type = "sine"; droneOsc.frequency.value = 55;
    droneOsc2.type = "sine"; droneOsc2.frequency.value = 82.5;
    droneFilter.type = "lowpass"; droneFilter.frequency.value = 160; droneFilter.Q.value = 1.6;
    droneGain.gain.value = 0;
    droneOsc.connect(droneFilter); droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGain); droneGain.connect(masterComp);
    droneOsc.start(); droneOsc2.start();
}

// ── Routing ──────────────────────────────────────────────────
function _toMaster(node) { node.connect(masterComp); }
function _withReverb(node, amt) {
    if (!reverbNode || amt <= 0) return;
    const g = ctx.createGain(); g.gain.value = amt;
    node.connect(g); g.connect(reverbNode);
}
function _withDelay(node, amt) {
    if (!delayNode || amt <= 0) return;
    const g = ctx.createGain(); g.gain.value = amt;
    node.connect(g); g.connect(delayNode);
}

// ── Timeout management ────────────────────────────────────────
function _mt(fn, ms) {
    const id = setTimeout(() => { _musicTimeouts.delete(id); fn(); }, ms);
    _musicTimeouts.add(id); return id;
}
function _cancelAllMusic() { for (const id of _musicTimeouts) clearTimeout(id); _musicTimeouts.clear(); }

// ── Volume ────────────────────────────────────────────────────
export function setVolume(pct) {
    if (!masterGain) return;
    masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, pct / 100)) * 0.88, ctx.currentTime, 0.05);
}
export function setMute(muted) {
    if (!masterGain) return;
    masterGain.gain.setTargetAtTime(muted ? 0 : ((_savedVol ?? 88) / 100) * 0.88, ctx.currentTime, 0.05);
}
let _savedVol = 88;
export function getSavedVolume() { return _savedVol; }
export function saveVolume(v)    { _savedVol = v; localStorage.setItem("echo_volume", v); }
export function loadVolume()     { return parseInt(localStorage.getItem("echo_volume") || "88"); }

// ── Mode setter — call before a run ──────────────────────────
export function setAudioMode(modeId) {
    _modeId = modeId ?? "medium";
    _bassIdx = 0; _arpIdx = 0; _arpShape = 0; _key = 0;
    const dna = _dna();
    if (!ctx) return;
    const t = ctx.currentTime;
    droneOsc.frequency.setTargetAtTime(dna.droneRoot, t, 1.0);
    droneOsc2.frequency.setTargetAtTime(dna.droneRoot * dna.droneOct, t, 1.0);
    if (delayNode) delayNode.delayTime.setTargetAtTime(_beatMs * 0.375 / 1000, t, 0.5);
}

// ── CORE: notifyBeat — game calls this every beat ────────────
// intervalMs = exact ms to the next beat, straight from the pattern array.
// This is the heartbeat of the entire music engine.
export function notifyBeat(intervalMs) {
    _beatMs = intervalMs;
    _beatPhase++;
    if (!ctx) return;
    // Sync delay echo to 3/8 of the actual beat
    if (delayNode) delayNode.delayTime.setTargetAtTime(intervalMs * 0.375 / 1000, ctx.currentTime, 0.04);
    _beatPulse();
    _scheduleGroove(intervalMs);
}

// ── Flow update — unlocks layers, shapes timbre ──────────────
export function updateDrone(flowState) {
    if (!ctx) return;
    _flow = flowState;
    const pct = flowState / 60;
    const dna = _dna();
    const t   = ctx.currentTime;
    droneOsc.frequency.setTargetAtTime(dna.droneRoot * (1 + pct * 0.08), t, 1.5);
    droneOsc2.frequency.setTargetAtTime(dna.droneRoot * dna.droneOct * (1 + pct * 0.04), t, 1.5);
    droneGain.gain.setTargetAtTime(0.03 + pct * 0.10, t, 1.8);
    droneFilter.frequency.setTargetAtTime(120 + pct * 700, t, 1.2);
    if (reverbReturn) {
        const rw = Math.max(0, (pct - 0.2) * dna.reverbWet * 1.8);
        reverbReturn.gain.setTargetAtTime(rw, t, 1.8);
    }
    if (delayReturn) {
        const dw = Math.max(0, (pct - 0.4) * dna.delayWet * 2.2);
        delayReturn.gain.setTargetAtTime(dw, t, 1.8);
    }
}

export function stopDrone() {
    if (!ctx) return;
    droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    _stopMusic(); _homeOn = false;
}

// ── HOME AMBIENCE ─────────────────────────────────────────────
// Plays on the mode selection screen. Same sonic world as game music.
// Uses a steady fixed interval with a structured 8-beat cycle so it
// feels musical and pattern-based, not random.
const _HOME_INTERVAL = 900;
let _homeBeat = 0;

export function startHomeAmbience() {
    if (!ctx || _homeOn) return;
    _homeOn = true; _modeId = "easy"; _flow = 2;
    _homeBeat = 0; _groovePhase = 0;
    const dna = _dna(), t = ctx.currentTime;
    droneOsc.frequency.setTargetAtTime(dna.droneRoot, t, 0.8);
    droneOsc2.frequency.setTargetAtTime(dna.droneRoot * dna.droneOct, t, 0.8);
    droneGain.gain.setTargetAtTime(0.05, t, 1.2);
    droneFilter.frequency.setTargetAtTime(220, t, 1.0);
    if (reverbReturn) reverbReturn.gain.setTargetAtTime(0.18, t, 1.5);
    _homeLoop();
}

// Home loop uses a strict 8-beat bar cycle so everything lines up
// and the background feels intentional and calm, not scattered.
function _homeLoop() {
    if (!_homeOn) return;
    _homeBeat++;
    const bar  = ((_homeBeat - 1) % 8) + 1; // 1–8 position in the bar
    const beat = _HOME_INTERVAL / 1000;

    // Kick on beats 1 and 5 (downbeats) — gives a clear pulse
    if (bar === 1 || bar === 5) _kick(beat, 0.44);

    // Soft hihat on every even beat after a warm-up
    if (_homeBeat > 4 && bar % 2 === 0) _hihat(beat * 0.5, false, 0.048);

    // Bass note on beat 1 and 3 of each bar — simple two-note pattern
    if (_homeBeat > 6 && (bar === 1 || bar === 3)) _bassNote(beat, false, 0.18);

    // Arp arrives halfway through the bar on beat 3 and 7, only after bar 2
    if (_homeBeat > 8 && (bar === 3 || bar === 7)) {
        _mt(() => _arp(0.06), _HOME_INTERVAL * 0.5);
    }

    // Pad chord lands on bar starts (every 8 beats) for harmonic grounding
    if (_homeBeat > 4 && bar === 1) _padChord(0.040);

    _mt(_homeLoop, _HOME_INTERVAL);
}

// ── startMusic — game calls this on run start ─────────────────
export function startMusic() {
    if (_musicOn) return;
    _musicOn = true; _homeOn = false;
    _groovePhase = 0; _beatPhase = 0;
    _cancelAllMusic(); // stop home loop; notifyBeat() takes over
}

function _stopMusic() { _musicOn = false; _cancelAllMusic(); }

// ── _scheduleGroove — rhythmic layers locked to beat interval ─
function _scheduleGroove(intervalMs) {
    if (!_musicOn && !_homeOn) return;
    _groovePhase++;
    const beat = intervalMs / 1000;
    const pct  = _flow / 60;

    // KICK — every beat, always
    _kick(beat);

    // SNARE — on beats 2 & 4 (every 2nd beat), enters at flow ≥ 8
    if (_flow >= 8 && _groovePhase % 2 === 0) _snare(beat);

    // HIHAT — 8th subdivisions, gets denser with flow
    if (_flow >= 6) {
        _hihat(beat * 0.5, false);
        if (_flow >= 20) _hihat(beat * 0.75, false);   // extra 16th
        if (_flow >= 40) _hihat(beat * 0.25, true);    // open hat on the "and"
    }

    // BASS — melodic walking line, enters at flow ≥ 5
    if (_flow >= 5) {
        _bassNote(beat);
        // passing tone on every 4th beat once flow is high enough
        if (_groovePhase % 4 === 0 && _flow >= 18) {
            _mt(() => _bassNote(beat, true), intervalMs * 0.5);
        }
    }

    // ARP — melodic, subdivision tightens with flow, enters at flow ≥ 14
    if (_flow >= 14) {
        const divs = _flow >= 45 ? 3 : _flow >= 28 ? 4 : 8;
        for (let i = 1; i < divs; i++) {
            const offset = (intervalMs / divs) * i;
            _mt(() => _arp(), offset);
        }
    }

    // PAD CHORD — every 8 beats at flow ≥ 22
    if (_flow >= 22 && _groovePhase % 8 === 0) {
        _padChord();
        _key = (_key + _dna().scale[2]) % 12; // slowly walk the key
    }
}

// ── BEAT PULSE — the circle's sound, mode-specific timbre ────
function _beatPulse() {
    if (!ctx) return;
    const dna = _dna(), t = ctx.currentTime, pct = _flow / 60;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = dna.beatTimbre;
    o.frequency.setValueAtTime(dna.beatFreq * (1 + pct * 0.22), t);
    o.frequency.exponentialRampToValueAtTime(dna.beatFreqEnd, t + dna.beatDecay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.54 + pct * 0.20, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dna.beatDecay + 0.02);
    o.connect(g); _toMaster(g); o.start(t); o.stop(t + dna.beatDecay + 0.04);
    // Click transient — gets sharper in harder modes
    const ck = ctx.createOscillator(), cg = ctx.createGain();
    ck.type = _modeId === "impossible" ? "sawtooth" : "square";
    ck.frequency.value = _modeId === "easy" ? 900 : _modeId === "medium" ? 1200 : _modeId === "hard" ? 1800 : 2600;
    cg.gain.setValueAtTime(0.09 + pct * 0.08, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    ck.connect(cg); _toMaster(cg); ck.start(t); ck.stop(t + 0.020);
}

// ── KICK ─────────────────────────────────────────────────────
function _kick(beat, gainMult = 1.0) {
    if (!ctx) return;
    const t = ctx.currentTime, pct = _flow / 60;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.14);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((0.82 + pct * 0.15) * gainMult, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); _toMaster(g); o.start(t); o.stop(t + 0.30);
    if (_modeId !== "easy") {
        const ck = ctx.createOscillator(), cg = ctx.createGain();
        ck.type = "square"; ck.frequency.value = 700 + pct * 400;
        cg.gain.setValueAtTime(0.13 * gainMult, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
        ck.connect(cg); _toMaster(cg); ck.start(t); ck.stop(t + 0.024);
    }
}

// ── SNARE ────────────────────────────────────────────────────
function _snare(beat) {
    if (!ctx) return;
    // snare sits on the 2 & 4 — half-beat offset
    const t = ctx.currentTime + (beat * 0.5), pct = _flow / 60;
    const dur = 0.11 + pct * 0.04;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.7);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const nf  = ctx.createBiquadFilter(); nf.type = "bandpass";
    nf.frequency.value = _modeId === "impossible" ? 5200 : _modeId === "hard" ? 3600 : 2400;
    nf.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.52 + pct * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(nf); nf.connect(ng); _toMaster(ng); _withReverb(ng, _dna().reverbWet * 0.5); src.start(t);
    const crack = ctx.createOscillator(), cg = ctx.createGain();
    crack.type = _modeId === "easy" ? "triangle" : "sawtooth";
    crack.frequency.setValueAtTime(_modeId === "easy" ? 220 : 160, t);
    crack.frequency.exponentialRampToValueAtTime(60, t + 0.05);
    cg.gain.setValueAtTime(0.18, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    crack.connect(cg); _toMaster(cg); crack.start(t); crack.stop(t + 0.07);
}

// ── HIHAT ────────────────────────────────────────────────────
function _hihat(delayS, open = false, gainMult = 1.0) {
    if (!ctx) return;
    const t = ctx.currentTime + delayS, pct = _flow / 60;
    const dur = open ? 0.18 : 0.036;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, open ? 1.0 : 3.2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hpf = ctx.createBiquadFilter(); hpf.type = "highpass";
    hpf.frequency.value = _modeId === "easy" ? 7000 : _modeId === "medium" ? 8500 : 10000;
    const g = ctx.createGain();
    g.gain.setValueAtTime((open ? 0.15 : 0.09 + pct * 0.07) * gainMult, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
    src.connect(hpf); hpf.connect(g); _toMaster(g); src.start(t);
}

// ── BASS ─────────────────────────────────────────────────────
function _bassNote(beat, passing = false, gainMult = 1.0) {
    if (!ctx) return;
    const t = ctx.currentTime, pct = _flow / 60, dna = _dna();
    const degIdx  = _bassIdx % _bassWalk.length;
    const degree  = _bassWalk[degIdx] + (passing ? 2 : 0);
    _bassIdx++;
    const scaleNote = dna.scale[degree % dna.scale.length];
    const octShift  = degree >= dna.scale.length ? 12 : 0;
    const freq = dna.rootHz * 0.5 * Math.pow(2, (scaleNote + octShift + _key) / 12);
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = dna.bassTimbre; o.frequency.value = freq;
    lp.type = "lowpass"; lp.frequency.value = dna.bassFilter + pct * 700; lp.Q.value = 3.2 + pct * 3;
    const vol = (0.28 + pct * 0.22) * gainMult;
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(vol * 0.45, t + 0.04, 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.84);
    o.connect(lp); lp.connect(g); _toMaster(g); o.start(t); o.stop(t + beat * 0.90);
}

// ── ARP ──────────────────────────────────────────────────────
function _arp(gainMult = 1.0) {
    if (!ctx) return;
    const t = ctx.currentTime, pct = _flow / 60, dna = _dna();
    if (_arpIdx % 16 === 0) _arpShape = (_arpShape + 1) % ARP_SHAPES.length;
    const shape = ARP_SHAPES[_arpShape];
    const degree = shape[_arpIdx % shape.length];
    _arpIdx++;
    const scaleNote = dna.scale[degree % dna.scale.length];
    const octave = _flow < 20 ? 1 : _flow < 40 ? 2 : 3;
    const freq = dna.rootHz * octave * Math.pow(2, (scaleNote + _key) / 12);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter(), env = ctx.createGain();
    o1.type = dna.arpTimbre; o1.frequency.value = freq;
    o2.type = dna.arpTimbre; o2.frequency.value = freq * 1.006;
    lp.type = "lowpass"; lp.frequency.value = 480 + pct * 3600; lp.Q.value = 4 + pct * 7;
    const vol = (0.07 + pct * 0.10) * gainMult;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + 0.010);
    env.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.07); env.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o1.connect(lp); o2.connect(lp); lp.connect(env);
    _toMaster(env); _withReverb(env, dna.reverbWet * 0.9 * pct); _withDelay(env, dna.delayWet * pct);
    o1.start(t); o2.start(t); o1.stop(t + 0.18); o2.stop(t + 0.18);
}

// ── PAD CHORD ────────────────────────────────────────────────
function _padChord(gainMult = 1.0) {
    if (!ctx) return;
    const t = ctx.currentTime, pct = _flow / 60, dna = _dna();
    const root = dna.rootHz * 2 * Math.pow(2, _key / 12);
    dna.padRatio.forEach((ratio, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = root * ratio + (Math.random() - 0.5) * 1.5;
        const vol = ((0.03 + pct * 0.045) / dna.padRatio.length) * gainMult;
        g.gain.setValueAtTime(0, t + i * 0.05); g.gain.linearRampToValueAtTime(vol, t + i * 0.05 + 0.35);
        g.gain.setTargetAtTime(vol * 0.55, t + 1.6, 0.45); g.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
        o.connect(g); _withReverb(g, dna.reverbWet * 1.4); _toMaster(g);
        o.start(t + i * 0.05); o.stop(t + 3.7);
    });
}

// ── HIT SFX — pitched to mode scale ─────────────────────────
export function playPerfect() {
    if (!ctx) return;
    const t = ctx.currentTime, pct = _flow / 60, dna = _dna();
    const scaleNote = dna.scale[_arpIdx % dna.scale.length];
    const freq = dna.rootHz * 4 * Math.pow(2, scaleNote / 12);
    _sfx("sine",     freq,       t,        0.20, freq * 1.25, 0.18, 0.20, 0.48 + pct * 0.15);
    _sfx("triangle", freq * 0.5, t + 0.01, 0.13, null,        0.04, 0.08, 0.27);
    _sfx("sine",     freq * 2,   t + 0.04, 0.09, null,        0.12, 0.04, 0.16);
    _noise(t, 0.05, 6500, 0.06 + pct * 0.04);
}

export function playGood() {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    const scaleNote = dna.scale[(_arpIdx + 1) % dna.scale.length];
    const freq = dna.rootHz * 3 * Math.pow(2, scaleNote / 12);
    _sfx("sine",     freq,       t,        0.14, freq * 1.05, 0.08, 0.10, 0.25);
    _sfx("triangle", freq * 0.5, t + 0.01, 0.09, null,        0.03, 0.06, 0.13);
}

export function playMiss() {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    // Dissonant clash: semitone above root = maximum harmonic tension
    const clash = dna.rootHz * Math.pow(2, 1 / 12);
    _sfx("sawtooth", clash * 0.5,    t, 0.18, clash * 0.25, 0.02, 0, 0.22);
    _sfx("sine",     dna.rootHz * 0.5, t, 0.14, null,        0,    0, 0.18);
    _noise(t, 0.09, 280, 0.18);
}

export function playWin() {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    // Win arpeggio plays the mode's full scale — feels like resolution
    dna.scale.concat([12]).forEach((semi, i) => {
        const freq = dna.rootHz * 2 * Math.pow(2, semi / 12);
        _sfx("sine",     freq,     t + i * 0.10, 0.40, freq * 1.01, 0.18, 0.26, 0.44);
        _sfx("triangle", freq * 2, t + i * 0.10, 0.18, null,        0.10, 0.10, 0.20);
    });
}

export function playGlitch() {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    // Tritone away from root = maximum instability
    const badNote = dna.rootHz * Math.pow(2, (dna.scale[1] + 6) / 12);
    _sfx("sawtooth", badNote, t, 0.08, null, 0, 0, 0.13);
    _noise(t + 0.02, 0.06, 900 + Math.random() * 1400, 0.14);
}

export function playStreakBell(n) {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    const degree = Math.min(Math.floor(n / 5) - 1, dna.scale.length - 1);
    const freq   = dna.rootHz * 4 * Math.pow(2, dna.scale[degree] / 12);
    _sfx("sine",     freq,     t,        0.45, freq * 1.01, 0.22, 0.30, 0.55);
    _sfx("triangle", freq * 2, t + 0.07, 0.30, null,        0.12, 0.18, 0.30);
    _sfx("sine",     freq * 3, t + 0.12, 0.20, null,        0.08, 0.08, 0.16);
    if (n >= 10) _noise(t + 0.06, 0.10, 5000, 0.08 + (n / 30) * 0.10);
}

// ── Mode card hover — tiny taste of each mode's identity ─────
export function playHoverTone(modeId) {
    if (!ctx) return;
    const dna = MODE_DNA[modeId] ?? MODE_DNA.medium;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = dna.arpTimbre;
    const freq = dna.rootHz * 2 * Math.pow(2, dna.scale[0] / 12);
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * Math.pow(2, dna.scale[2] / 12), t + 0.07);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(masterComp); o.start(t); o.stop(t + 0.16);
}

export function playNewBest() {
    if (!ctx) return;
    const t = ctx.currentTime, dna = _dna();
    dna.scale.forEach((semi, i) => {
        const freq = dna.rootHz * 2 * Math.pow(2, semi / 12);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.18, t + i * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.24);
        o.connect(g); g.connect(masterComp); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.26);
    });
}

// ── Helpers ───────────────────────────────────────────────────
function _sfx(type, freq, start, dur, pitchEnd, revAmt = 0, delAmt = 0, gainVal = 0.3) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    if (pitchEnd) o.frequency.linearRampToValueAtTime(pitchEnd, start + dur);
    g.gain.setValueAtTime(gainVal, start); g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); _toMaster(g); _withReverb(g, revAmt); _withDelay(g, delAmt);
    o.start(start); o.stop(start + dur + 0.01);
}

function _noise(t, dur, filterFreq, vol) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = filterFreq; f.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); _toMaster(g); src.start(t);
}

// ── playBeat — used by rhythm.js for its own beat ticks ──────
// Rhythm Challenge runs outside the main game loop so it can't
// use notifyBeat(). This is a simple click, not the full engine.
export function playBeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(100, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
    o.connect(g); _toMaster(g); o.start(t); o.stop(t + 0.22);
}
