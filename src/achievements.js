// ============================================================
// achievements.js — cross-mode meta-progression
//
// DESIGN:
//   Every achievement has a unique id, a tier, a condition function,
//   and a human label + description. Conditions read from localStorage
//   so they work across runs without any extra state plumbing.
//
//   Tiers:     bronze → silver → gold → platinum
//   Storage:   echo_ach_<id>  = "1" when earned
//              echo_ach_seen_<id> = "1" once the card has been shown
//
//   checkRun({ result, mode, streak, accuracy, flowState, isDaily, totalGames })
//     — call this at the end of every run (game.js → endGame callback)
//   checkRhythm({ success, pct })
//     — call this when a Rhythm Challenge finishes
//   getAll()         — returns all defs with earned/seen flags
//   countEarned()    — number earned so far
// ============================================================

// ── Tier colours ─────────────────────────────────────────────
export const TIER_COLOR = {
    bronze:   "#cd7f32",
    silver:   "#c0c0c0",
    gold:     "#ffd700",
    platinum: "#00ffe0",
};

// ── Achievement definitions ──────────────────────────────────
// condition({result, mode, streak, accuracy, flowState, isDaily, totalGames})
// Returns true the FIRST time it should fire.
// They are checked after localStorage is already updated for this run,
// so echo_best_* and echo_total_games are current.

export const ACHIEVEMENTS = [

    // ── FIRST STEPS ─────────────────────────────────────────
    {
        id:    "first_tap",
        tier:  "bronze",
        icon:  "◌",
        label: "first tap",
        desc:  "play your first game",
        check: ({ totalGames }) => totalGames >= 1,
    },
    {
        id:    "first_win",
        tier:  "bronze",
        icon:  "✦",
        label: "synced",
        desc:  "win any game",
        check: ({ result }) => result === "master",
    },

    // ── EASY ────────────────────────────────────────────────
    {
        id:    "easy_win",
        tier:  "bronze",
        icon:  "◌",
        label: "feel it",
        desc:  "clear easy mode",
        check: ({ result, mode }) => result === "master" && mode === "easy",
    },
    {
        id:    "easy_perfect",
        tier:  "silver",
        icon:  "◌",
        label: "clean hands",
        desc:  "clear easy with 100% accuracy",
        check: ({ result, mode, accuracy }) => result === "master" && mode === "easy" && accuracy === 100,
    },

    // ── MEDIUM ───────────────────────────────────────────────
    {
        id:    "medium_win",
        tier:  "bronze",
        icon:  "◎",
        label: "on edge",
        desc:  "clear medium mode",
        check: ({ result, mode }) => result === "master" && mode === "medium",
    },
    {
        id:    "medium_perfect",
        tier:  "gold",
        icon:  "◎",
        label: "no margin",
        desc:  "clear medium with 100% accuracy",
        check: ({ result, mode, accuracy }) => result === "master" && mode === "medium" && accuracy === 100,
    },

    // ── HARD ─────────────────────────────────────────────────
    {
        id:    "hard_win",
        tier:  "silver",
        icon:  "◈",
        label: "broken through",
        desc:  "clear hard mode",
        check: ({ result, mode }) => result === "master" && mode === "hard",
    },
    {
        id:    "hard_perfect",
        tier:  "gold",
        icon:  "◈",
        label: "machine",
        desc:  "clear hard with 100% accuracy",
        check: ({ result, mode, accuracy }) => result === "master" && mode === "hard" && accuracy === 100,
    },

    // ── IMPOSSIBLE ───────────────────────────────────────────
    {
        id:    "impossible_win",
        tier:  "gold",
        icon:  "◆",
        label: "and yet",
        desc:  "clear impossible mode",
        check: ({ result, mode }) => result === "master" && mode === "impossible",
    },
    {
        id:    "impossible_perfect",
        tier:  "platinum",
        icon:  "◆",
        label: "inhuman",
        desc:  "clear impossible with 100% accuracy",
        check: ({ result, mode, accuracy }) => result === "master" && mode === "impossible" && accuracy === 100,
    },

    // ── ALL MODES ────────────────────────────────────────────
    {
        id:    "all_modes_won",
        tier:  "gold",
        icon:  "✦",
        label: "complete",
        desc:  "win every mode at least once",
        check: () => ["easy","medium","hard","impossible"].every(m =>
            parseInt(localStorage.getItem("echo_best_" + m) || "0") >=
            ({ easy:15, medium:20, hard:25, impossible:30 })[m]
        ),
    },

    // ── FLOW / OVERLOAD ──────────────────────────────────────
    {
        id:    "overload",
        tier:  "silver",
        icon:  "⬡",
        label: "overloaded",
        desc:  "reach OVERLOAD (max flow) in a run",
        check: ({ flowState }) => flowState >= 58,
    },
    {
        id:    "overload_win",
        tier:  "gold",
        icon:  "⬡",
        label: "controlled burn",
        desc:  "win while at OVERLOAD flow",
        check: ({ result, flowState }) => result === "master" && flowState >= 58,
    },

    // ── STREAKS ──────────────────────────────────────────────
    {
        id:    "streak_10",
        tier:  "bronze",
        icon:  "→",
        label: "in the pocket",
        desc:  "reach a ×10 streak",
        check: ({ streak }) => streak >= 10,
    },
    {
        id:    "streak_20",
        tier:  "silver",
        icon:  "→",
        label: "locked in",
        desc:  "reach a ×20 streak",
        check: ({ streak }) => streak >= 20,
    },
    {
        id:    "streak_30",
        tier:  "gold",
        icon:  "→",
        label: "untouchable",
        desc:  "reach a ×30 streak",
        check: ({ streak }) => streak >= 30,
    },

    // ── GRIND ────────────────────────────────────────────────
    {
        id:    "games_10",
        tier:  "bronze",
        icon:  "○",
        label: "showing up",
        desc:  "play 10 games",
        check: ({ totalGames }) => totalGames >= 10,
    },
    {
        id:    "games_50",
        tier:  "silver",
        icon:  "○",
        label: "obsessed",
        desc:  "play 50 games",
        check: ({ totalGames }) => totalGames >= 50,
    },
    {
        id:    "games_100",
        tier:  "gold",
        icon:  "○",
        label: "the long game",
        desc:  "play 100 games",
        check: ({ totalGames }) => totalGames >= 100,
    },

    // ── DAILY ────────────────────────────────────────────────
    {
        id:    "daily_first",
        tier:  "bronze",
        icon:  "◈",
        label: "day one",
        desc:  "complete a daily challenge",
        check: ({ isDaily, result }) => isDaily && result === "master",
    },
    {
        id:    "daily_7",
        tier:  "gold",
        icon:  "◈",
        label: "week streak",
        desc:  "clear 7 daily challenges",
        check: () => {
            const count = parseInt(localStorage.getItem("echo_daily_wins") || "0");
            return count >= 7;
        },
    },

    // ── RHYTHM CHALLENGE ────────────────────────────────────
    {
        id:    "rhythm_first",
        tier:  "bronze",
        icon:  "♩",
        label: "keeper of the beat",
        desc:  "clear a rhythm challenge",
        check: ({ rhythmSuccess }) => rhythmSuccess === true,
    },
    {
        id:    "rhythm_perfect",
        tier:  "silver",
        icon:  "♩",
        label: "zero misses",
        desc:  "clear a rhythm challenge with 100% accuracy",
        check: ({ rhythmSuccess, rhythmPct }) => rhythmSuccess === true && rhythmPct === 100,
    },
    {
        id:    "rhythm_3",
        tier:  "gold",
        icon:  "♩",
        label: "pattern master",
        desc:  "clear 3 rhythm challenges",
        check: () => parseInt(localStorage.getItem("echo_rhythm_wins") || "0") >= 3,
    },

    // ── COMEBACK ─────────────────────────────────────────────
    {
        id:    "comeback",
        tier:  "silver",
        icon:  "↑",
        label: "comeback",
        desc:  "win after a 0-streak fail in the same session",
        check: ({ result, hadFailThisSession }) => result === "master" && hadFailThisSession,
    },

    // ── PERFECTIONIST ────────────────────────────────────────
    {
        id:    "perfect_run_any",
        tier:  "silver",
        icon:  "◎",
        label: "not one miss",
        desc:  "finish any game with 100% accuracy",
        check: ({ accuracy, totalClicks }) => accuracy === 100 && totalClicks >= 10,
    },

    // ── PLATINUM: THE WITNESS ────────────────────────────────
    {
        id:    "witness",
        tier:  "platinum",
        icon:  "✦",
        label: "the witness",
        desc:  "earn every other achievement",
        check: () => {
            const all   = ACHIEVEMENTS.filter(a => a.id !== "witness");
            const count = all.filter(a => localStorage.getItem("echo_ach_" + a.id) === "1").length;
            return count >= all.length;
        },
    },
];

// ── Storage helpers ──────────────────────────────────────────
function _earned(id)   { return localStorage.getItem("echo_ach_" + id) === "1"; }
function _earn(id)     { localStorage.setItem("echo_ach_" + id, "1"); }
function _markSeen(id) { localStorage.setItem("echo_ach_seen_" + id, "1"); }
function _seen(id)     { return localStorage.getItem("echo_ach_seen_" + id) === "1"; }

export function getAll() {
    return ACHIEVEMENTS.map(a => ({
        ...a,
        earned: _earned(a.id),
        seen:   _seen(a.id),
    }));
}

export function countEarned() {
    return ACHIEVEMENTS.filter(a => _earned(a.id)).length;
}

// ── checkRun — call from endGame ─────────────────────────────
// context: { result, mode, streak, accuracyPct, flowState, isDaily, totalGames, totalClicks, hadFailThisSession }
export function checkRun(ctx) {
    // Increment daily wins counter if applicable
    if (ctx.isDaily && ctx.result === "master") {
        const dw = parseInt(localStorage.getItem("echo_daily_wins") || "0");
        localStorage.setItem("echo_daily_wins", dw + 1);
    }

    const newlyEarned = [];
    for (const ach of ACHIEVEMENTS) {
        if (_earned(ach.id)) continue; // already got it
        try {
            const passed = ach.check({
                result:             ctx.result,
                mode:               ctx.mode,
                streak:             ctx.streak,
                accuracy:           ctx.accuracyPct,
                flowState:          ctx.flowState,
                isDaily:            ctx.isDaily,
                totalGames:         ctx.totalGames,
                totalClicks:        ctx.totalClicks,
                hadFailThisSession: ctx.hadFailThisSession,
            });
            if (passed) { _earn(ach.id); newlyEarned.push(ach); }
        } catch {}
    }
    if (newlyEarned.length > 0) _showQueue(newlyEarned);
    return newlyEarned;
}

// ── checkRhythm — call when rhythm challenge ends ────────────
export function checkRhythm({ success, pct }) {
    if (success) {
        const rw = parseInt(localStorage.getItem("echo_rhythm_wins") || "0");
        localStorage.setItem("echo_rhythm_wins", rw + 1);
    }
    const newlyEarned = [];
    for (const ach of ACHIEVEMENTS) {
        if (_earned(ach.id)) continue;
        try {
            const passed = ach.check({ rhythmSuccess: success, rhythmPct: pct });
            if (passed) { _earn(ach.id); newlyEarned.push(ach); }
        } catch {}
    }
    if (newlyEarned.length > 0) _showQueue(newlyEarned);
    return newlyEarned;
}

// ── Display queue ─────────────────────────────────────────────
// Shows one card at a time, 3s each, sequenced with a short gap.
let _queue   = [];
let _showing = false;

function _showQueue(list) {
    _queue = _queue.concat(list);
    if (!_showing) _drainQueue();
}

function _drainQueue() {
    if (_queue.length === 0) { _showing = false; return; }
    _showing = true;
    const ach = _queue.shift();
    _showCard(ach, () => {
        setTimeout(_drainQueue, 200);
    });
}

function _showCard(ach, onDone) {
    _markSeen(ach.id);

    // Build card element
    let card = document.getElementById("ach-card");
    if (!card) {
        card = document.createElement("div");
        card.id = "ach-card";
        document.body.appendChild(card);
    }

    const col = TIER_COLOR[ach.tier] || "#fff";
    card.innerHTML = `
        <div class="ach-card-inner">
            <div class="ach-card-eyebrow">achievement unlocked</div>
            <div class="ach-card-icon" style="color:${col}">${ach.icon}</div>
            <div class="ach-card-label" style="color:${col}">${ach.label}</div>
            <div class="ach-card-desc">${ach.desc}</div>
            <div class="ach-card-tier" style="color:${col}">${ach.tier.toUpperCase()}</div>
        </div>
    `;
    card.className = "ach-card ach-card-enter";
    card.style.display = "flex";

    // Animate in → hold → animate out
    setTimeout(() => {
        card.classList.remove("ach-card-enter");
        card.classList.add("ach-card-visible");
    }, 20);

    setTimeout(() => {
        card.classList.remove("ach-card-visible");
        card.classList.add("ach-card-exit");
        setTimeout(() => {
            card.style.display = "none";
            card.className = "ach-card";
            onDone();
        }, 500);
    }, 3000);
}
