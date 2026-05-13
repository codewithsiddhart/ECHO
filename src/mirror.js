// mirror.js — the game reflects what just happened back at you
// Reads run shape and returns a message that speaks to that specific run.

export function getMirrorMessage({ result, best, totalClicks, correctClicks,
                                    flowState, mode, prevBest, replayData }) {
    const accuracy    = totalClicks > 0 ? correctClicks / totalClicks : 0;
    const accPct      = Math.round(accuracy * 100);
    const isNewBest   = best > prevBest && best > 0;
    const modeLabel   = mode?.id ?? "feel";

    const { avgDiff, bias, shape } = _analyzeRun(replayData);

    // ── WIN ──────────────────────────────────────────────────
    if (result === "master") {
        if (shape === "late_lock") return {
            title: "you found it late.",
            sub:   "but you found it. that's not luck — that's you learning mid-run."
        };
        if (shape === "wire_to_wire" && accPct >= 90) return {
            title: "never let up.",
            sub:   "you had it from the first tap and didn't once give it back. that's rare."
        };
        if (shape === "crescendo") return {
            title: "you accelerated.",
            sub:   "each tap got cleaner. by the end you weren't thinking anymore."
        };
        if (isNewBest) return {
            title: "further than before.",
            sub:   "×" + best + ". the version of you who started this game couldn't have done that."
        };
        if (accPct === 100) return {
            title: "perfect.",
            sub:   "every single one. you weren't reacting anymore. you were the beat."
        };
        if (modeLabel === "impossible") return { title: "impossible.", sub: "and yet." };
        if (modeLabel === "impossible") return {
            title: "you dissolved.",
            sub:   "38ms windows. you didn't guess — you knew."
        };
        return {
            title: "you felt it.",
            sub:   "the moment your hands moved before your brain caught up — that's the whole game."
        };
    }

    // ── DRIFT ────────────────────────────────────────────────
    if (result === "drift") {
        if (shape === "peak_drop" && best >= 10) return {
            title: "you had it.",
            sub:   "×" + best + " in a row. you know you had it. what broke the thread?"
        };
        if (best >= 12) return {
            title: "×" + best + ". that close.",
            sub:   "you were right there. the beat didn't leave — you did."
        };
        if (bias === "early") return {
            title: "you were early.",
            sub:   "the beat was already there. you kept arriving ahead of it."
        };
        if (best <= 2) return {
            title: "you weren't in it yet.",
            sub:   "the beat takes a few cycles to settle. give it more time next run."
        };
        return {
            title: "you felt it, then lost it.",
            sub:   "×" + best + " is where you lived. now you know where to aim."
        };
    }

    // ── FAIL ─────────────────────────────────────────────────
    if (result === "fail") {
        if (bias === "early" && avgDiff > 60) return {
            title: "you're anticipating.",
            sub:   "~" + Math.round(avgDiff) + "ms early on average. you're predicting the beat, not feeling it. that's fixable."
        };
        if (bias === "late" && avgDiff > 60) return {
            title: "you're reacting.",
            sub:   "~" + Math.round(avgDiff) + "ms late on average. you're waiting to see it. try the LISTEN mode."
        };
        if (shape === "peak_drop" && best >= 8) return {
            title: "×" + best + " then nothing.",
            sub:   "you found the pocket. then you thought about it. stop thinking."
        };
        if (best >= 6 && accPct < 40) return {
            title: "hot start, cold end.",
            sub:   "×" + best + " then the wheels came off. whatever changed between those two states — that's what to chase."
        };
        if (accPct >= 65 && best <= 3) return {
            title: "close but scattered.",
            sub:   "your accuracy is there. your consistency isn't. you're feeling individual beats, not the pattern."
        };
        if (totalClicks <= 5) return {
            title: "you barely started.",
            sub:   "five taps isn't a run. give the beat more time."
        };
        if (modeLabel === "impossible") return {
            title: "38ms is not forgiving.",
            sub:   "nobody wins DISSOLVE on the first try. you tried. that already matters."
        };
        if (modeLabel === "forget") return {
            title: "you were thinking.",
            sub:   "the second you think about the next tap, it's already wrong. stop thinking."
        };
        if (modeLabel === "impossible" && best >= 5) return {
            title: "×" + best + " in impossible.",
            sub:   "that's not nothing. most people don't get past two."
        };
        if (best >= 8) return {
            title: "×" + best + ".",
            sub:   "you found the pocket. you just couldn't stay in it. you will."
        };
        if (best === 0) return {
            title: "nothing landed.",
            sub:   "that's fine. the beat is patient. it'll wait."
        };
        return {
            title: "not yet.",
            sub:   "the beat is still there. you won't always need to see the ring."
        };
    }

    // ── PRACTICE ─────────────────────────────────────────────
    if (result === "practice") {
        if (bias === "early") return {
            title: "you anticipate.",
            sub:   "you tap early. that means you feel the beat coming — now learn to wait for it to arrive."
        };
        if (bias === "late") return {
            title: "you react.",
            sub:   "you tap late. you're waiting to confirm the beat. try closing your eyes next run."
        };
        if (accPct >= 80) return {
            title: "you're ready.",
            sub:   "your timing is solid. now try FEEL mode without the hints."
        };
        return {
            title: "keep listening.",
            sub:   "this mode exists so you can hear yourself. what did you notice?"
        };
    }

    return { title: "the beat goes on.", sub: "" };
}

// ── Run analysis ──────────────────────────────────────────────
function _analyzeRun(replayData) {
    if (!replayData?.events?.length) return { avgDiff: 0, bias: "none", shape: "flat" };

    const events = replayData.events;
    const hits   = events.filter(e => e.type !== "miss");
    const misses = events.filter(e => e.type === "miss");

    if (hits.length === 0) return { avgDiff: 0, bias: "none", shape: "flat" };

    const avgDiff   = hits.reduce((s, e) => s + (e.diff || 0), 0) / hits.length;
    const missRatio = misses.length / events.length;

    const bias = avgDiff < 40   ? "perfect"
               : missRatio > 0.4 ? "late"
               : avgDiff > 120   ? "early"
               : "none";

    const shape = _detectShape(events);
    return { avgDiff, bias, shape };
}

function _detectShape(events) {
    if (events.length < 6) return "flat";
    const n     = events.length;
    const third = Math.floor(n / 3);
    const score = (slice) => slice.filter(e => e.type !== "miss").length / slice.length;
    const s1    = score(events.slice(0,         third));
    const s2    = score(events.slice(third,     third * 2));
    const s3    = score(events.slice(third * 2, n));

    if (s1 < 0.45 && s3 > 0.75)                      return "late_lock";
    if (s1 > 0.7  && s2 > 0.7  && s3 > 0.7)          return "wire_to_wire";
    if (s1 > 0.65 && s2 > 0.6  && s3 < 0.4)          return "peak_drop";
    if (s3 > s2   && s2 > s1   && s3 - s1 > 0.25)    return "crescendo";
    return "flat";
}
