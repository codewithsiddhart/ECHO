// daily-seed.js — procedural daily pattern generator
// Seeds from UTC date string so every player on the same calendar day
// gets the exact same challenge, regardless of timezone.

function _hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return h;
}

// LCG seeded random
function _makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export function getTodayUTC() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}

export function generateDailyConfig(dateStr) {
    const seed = _hash("echo-daily-" + dateStr);
    const rng  = _makeRng(seed);

    // Pick a "vibe" for the day from seed
    const vibe = Math.floor(rng() * 4); // 0=easy, 1=normal, 2=hard, 3=chaos

    const configs = [
        // easy
        { winStreak: 8,  perfectWindow: 130, goodWindow: 300,
          flowPerfect: 4, flowGood: 2, flowPenalty: 3,
          baseMs: 800, spread: 120, title: "gentle day", endMsg: "smooth." },
        // normal
        { winStreak: 12, perfectWindow: 90,  goodWindow: 220,
          flowPerfect: 3, flowGood: 1, flowPenalty: 6,
          baseMs: 600, spread: 200, title: "today's challenge", endMsg: "you felt the daily." },
        // hard
        { winStreak: 18, perfectWindow: 55,  goodWindow: 140,
          flowPerfect: 2, flowGood: 1, flowPenalty: 8,
          baseMs: 440, spread: 180, title: "not easy today", endMsg: "earned it." },
        // chaos
        { winStreak: 10, perfectWindow: 70,  goodWindow: 180,
          flowPerfect: 3, flowGood: 1, flowPenalty: 6,
          baseMs: 550, spread: 400, title: "chaos day", endMsg: "you survived." },
    ];

    const cfg = configs[vibe];

    // Generate 24-beat pattern
    const pattern = [];
    for (let i = 0; i < 24; i++) {
        let ms;
        if (vibe === 3) {
            // chaos: randomly fast or slow
            ms = rng() < 0.5
                ? 280 + Math.floor(rng() * 120)
                : 600 + Math.floor(rng() * 250);
        } else {
            // smooth ramp with some wobble
            const progress = i / 23;
            const base = cfg.baseMs - progress * cfg.spread * 0.6;
            ms = Math.max(180, Math.floor(base + (rng() - 0.5) * cfg.spread * 0.4));
        }
        pattern.push(ms);
    }

    return {
        date:         dateStr,
        pattern,
        winStreak:    cfg.winStreak,
        perfectWindow:cfg.perfectWindow,
        goodWindow:   cfg.goodWindow,
        title:        cfg.title,
        endMsg:       cfg.endMsg,
        flowGainPerfect: cfg.flowPerfect,
        flowGainGood:    cfg.flowGood,
        flowPenalty:     cfg.flowPenalty,
    };
}
