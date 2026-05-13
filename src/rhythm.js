// rhythm.js — Rhythm Challenge mode
// FIX: _interval tracking was broken (_interval = null wiped the real ID)
// FIX: _cleanup now cancels both timeout slots correctly

import { haptic } from "./haptics.js";
import { playBeat, playPerfect, playMiss } from "./audio.js";
import { checkRhythm } from "./achievements.js";

const SEQUENCES = [
    // Beginner — simple alternating
    [1,0,1,0,1,0,1,0],
    [1,0,0,1,0,0,1,0],
    [1,1,0,0,1,1,0,0],
    [0,1,0,1,0,1,0,1],
    [1,0,1,0,0,1,0,1],
    [1,0,0,0,1,0,0,0],
    // Medium — syncopated
    [1,1,0,1,1,0,1,0],
    [1,0,0,1,0,1,0,1],
    [1,0,1,1,0,0,1,1],
    [1,1,1,0,1,0,0,1],
    [1,0,1,0,0,1,1,0],
    [0,1,1,0,1,0,1,1],
    [1,1,0,1,0,0,1,1],
    [1,0,1,1,1,0,0,1],
    // Hard — dense
    [1,1,1,0,0,1,1,1],
    [1,1,0,1,1,1,0,1],
    [0,1,1,1,0,1,1,0],
    [1,1,1,1,0,0,0,1],
    [1,0,1,1,0,1,1,0],
    [1,1,0,0,1,0,1,1],
    // Nasty — nearly all hits
    [1,1,1,0,1,1,0,1],
    [1,1,1,1,0,1,0,1],
    [1,0,1,1,1,1,0,1],
    [1,1,1,1,1,0,0,1],
];

let _overlay    = null;
let _onComplete = null;
let _seq        = [];
let _step       = 0;
let _strikes    = 0;
let _hits       = 0;
let _expecting  = false;
let _tapWindow  = false;
let _tapDone    = false;
let _failed     = false;

// FIX: use a Set so every scheduled timeout is cancellable
const _timeouts = new Set();

const BPM     = 108;
const BEAT_MS = 60000 / BPM;
const TAP_WIN = 340;

function _st(fn, ms) {
    const id = setTimeout(() => { _timeouts.delete(id); fn(); }, ms);
    _timeouts.add(id);
}

function _cancelAll() {
    for (const id of _timeouts) clearTimeout(id);
    _timeouts.clear();
}

// ── Procedural sequence generator ──────────────────────────
// Generates an 8-step sequence with 3–6 active beats, no 3 consecutive rests.
function _generateSequence() {
    const len = 8;
    let seq;
    let attempts = 0;
    do {
        seq = [];
        for (let i = 0; i < len; i++) seq.push(Math.random() < 0.55 ? 1 : 0);
        const active = seq.reduce((a, b) => a + b, 0);
        // Reject if too few/many active or 3+ consecutive rests
        const tooFew  = active < 3;
        const tooMany = active > 6;
        let badRest   = false;
        for (let i = 0; i < len - 2; i++) {
            if (!seq[i] && !seq[i+1] && !seq[i+2]) { badRest = true; break; }
        }
        if (!tooFew && !tooMany && !badRest) break;
        attempts++;
    } while (attempts < 40);
    return seq;
}

export function startRhythmChallenge(onComplete) {
    _onComplete = onComplete;
    // Track which sequences have been shown; once all seen, generate procedurally
    const usedKey = "echo_rhythm_seen";
    let usedSet;
    try { usedSet = new Set(JSON.parse(localStorage.getItem(usedKey) || "[]")); } catch { usedSet = new Set(); }

    let chosenIdx = -1;
    const unseenIndices = SEQUENCES.map((_,i) => i).filter(i => !usedSet.has(i));
    if (unseenIndices.length > 0) {
        chosenIdx = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
        usedSet.add(chosenIdx);
        if (usedSet.size >= SEQUENCES.length) usedSet.clear(); // reset cycle
        try { localStorage.setItem(usedKey, JSON.stringify([...usedSet])); } catch {}
        _seq = [...SEQUENCES[chosenIdx]];
    } else {
        _seq = _generateSequence();
    }
    _step = _strikes = _hits = 0;
    _failed = false;

    _overlay = document.getElementById("rhythm-challenge");
    if (!_overlay) { onComplete(); return; }
    _overlay.classList.remove("hidden");

    const res = _overlay.querySelector("#rc-result");
    if (res) res.classList.add("hidden");

    _scheduleNext();
}

function _scheduleNext() {
    if (_failed) return;
    if (_step >= _seq.length * 2) { _finish(); return; }

    const beat = _seq[_step % _seq.length];
    _step++;
    _expecting = beat === 1;
    _tapDone   = false;

    _renderBeats();
    playBeat();
    haptic("hit");

    // Open tap window — store ID before nulling anything
    _tapWindow = true;
    _st(() => {
        _tapWindow = false;
        if (_expecting && !_tapDone) _strike("missed");
        // Small gap then next beat
        if (!_failed) _st(_scheduleNext, BEAT_MS * 0.3);
    }, TAP_WIN);
}

function _renderBeats() {
    const grid = _overlay.querySelector("#rc-grid");
    if (!grid) return;

    // Reuse existing children instead of clearing innerHTML every beat
    const existing = [...grid.children];
    const needed   = _seq.length;

    while (grid.children.length < needed) {
        const b = document.createElement("div");
        b.className = "rc-beat";
        grid.appendChild(b);
    }
    while (grid.children.length > needed) grid.removeChild(grid.lastChild);

    const current = (_step - 1) % _seq.length;
    for (let i = 0; i < _seq.length; i++) {
        const b = grid.children[i];
        b.className = "rc-beat" + (_seq[i] ? " rc-active" : "") + (i === current ? " rc-current" : "");
    }

    const strikesEl = _overlay.querySelector("#rc-strikes");
    const hitsEl    = _overlay.querySelector("#rc-hits");
    if (strikesEl) strikesEl.innerText = "✕".repeat(_strikes) + "○".repeat(Math.max(0, 3 - _strikes));
    if (hitsEl)    hitsEl.innerText    = "hits: " + _hits;
}

function _strike(reason) {
    _strikes++;
    playMiss();
    haptic("miss");
    const fb = _overlay.querySelector("#rc-feedback");
    if (fb) { fb.innerText = reason === "missed" ? "miss!" : "wrong beat!"; fb.dataset.type = "miss"; }
    _overlay.classList.add("rc-shake");
    _st(() => _overlay.classList.remove("rc-shake"), 320);
    if (_strikes >= 3) { _failed = true; _st(_fail, 400); }
}

function _hit() {
    _hits++;
    playPerfect();
    haptic("perfect");
    const fb = _overlay.querySelector("#rc-feedback");
    if (fb) { fb.innerText = "✓"; fb.dataset.type = "hit"; }
}

export function rhythmTap() {
    if (!_tapWindow || _tapDone || _failed) return;
    _tapDone = true;
    if (_expecting) _hit();
    else _strike("wrong beat!");
}

function _finish() {
    _cleanup();
    const total = _seq.filter(x => x).length * 2;
    const pct   = total > 0 ? Math.round((_hits / total) * 100) : 0;
    checkRhythm({ success: true, pct });
    _showResult("CLEARED!", pct + "% accuracy", true);
}

function _fail() {
    _cleanup();
    checkRhythm({ success: false, pct: 0 });
    _showResult("FAILED", "3 strikes", false);
}

function _cleanup() {
    _cancelAll();
    _tapWindow = false;
}

function _showResult(title, sub, success) {
    const res = _overlay?.querySelector("#rc-result");
    if (!res) return;
    res.classList.remove("hidden");
    const t = res.querySelector("#rc-result-title");
    const s = res.querySelector("#rc-result-sub");
    const b = res.querySelector("#rc-result-btn");
    if (t) { t.innerText = title; t.style.color = success ? "var(--accent)" : "#ff2d78"; }
    if (s) s.innerText = sub;
    if (b) b.onclick = () => {
        _overlay.classList.add("hidden");
        if (success) _onComplete?.();
        else location.reload();
    };
}
