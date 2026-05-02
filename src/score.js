// score.js — combo score system with multiplier
// 1x → 2x → 4x → 8x based on consecutive perfects

let _score      = 0;
let _multiplier = 1;
let _combo      = 0; // consecutive perfects only

const TIERS = [
    { combo: 0,  mult: 1 },
    { combo: 3,  mult: 2 },
    { combo: 7,  mult: 4 },
    { combo: 14, mult: 8 },
];

export function scoreReset() { _score = 0; _multiplier = 1; _combo = 0; }

export function scoreHit(type) {
    // Only perfects grow the combo multiplier
    if (type === "perfect") {
        _combo++;
        _multiplier = TIERS.filter(t => _combo >= t.combo).at(-1).mult;
        _score += 100 * _multiplier;
    } else if (type === "good") {
        // Good hits score at current mult but don't grow it
        _score += 50 * _multiplier;
    }
    return { score: _score, multiplier: _multiplier, combo: _combo };
}

export function scoreMiss() {
    _combo      = 0;
    _multiplier = 1;
    return { score: _score, multiplier: 1, combo: 0 };
}

export function getScore()      { return _score; }
export function getMultiplier() { return _multiplier; }
export function getCombo()      { return _combo; }
