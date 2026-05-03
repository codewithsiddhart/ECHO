// leaderboard.js — Supabase online leaderboard
// Requires SUPABASE_URL and SUPABASE_ANON_KEY in config.js

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const TABLE = "echo_scores";
const QUEUE_KEY = "echo_lb_queue";

function _enqueue(payload) {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        q.push(payload);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20))); // max 20
    } catch {}
}

async function _flushQueue() {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        if (!q.length) return;
        const remaining = [];
        for (const payload of q) {
            const res = await _query(TABLE, { method:"POST", prefer:"return=minimal", body:JSON.stringify(payload) });
            if (!res.ok) remaining.push(payload);
        }
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch {}
}

// Flush on load if online
if (typeof window !== "undefined") {
    window.addEventListener("online", _flushQueue);
    setTimeout(_flushQueue, 3000);
}


let _cachedTop = [];

// ── Supabase REST helper (no SDK needed) ─────────────────────
// Returns { ok: true, data } on success, { ok: false } on failure.
// For POST with return=minimal Supabase sends 201 with no body — that is
// a success, NOT a failure. Previous code treated null body as an error.
async function _query(path, options = {}) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false };
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
            headers: {
                "apikey":        SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + SUPABASE_ANON_KEY,
                "Content-Type":  "application/json",
                "Prefer":        options.prefer || "",
            },
            ...options,
        });
        if (!res.ok) return { ok: false };
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("json") ? await res.json() : null;
        return { ok: true, data };
    } catch { return { ok: false }; }
}

// ── Submit a score ────────────────────────────────────────────
export async function submitScore({ name, streak, score, accuracy, mode, daily = false }) {
    if (!name?.trim()) return false;
    const payload = {
        name:      name.trim().slice(0, 24),
        streak, score, accuracy, mode, daily,
        played_at: new Date().toISOString(),
    };
    const res = await _query(TABLE, { method:"POST", prefer:"return=minimal", body:JSON.stringify(payload) });
    if (!res.ok) {
        // Queue for retry when back online
        _enqueue(payload);
        return false;
    }
    return true;
}

// ── Fetch top N scores ────────────────────────────────────────
export async function fetchTopScores({ mode = null, limit = 10, daily = false } = {}) {
    const params = new URLSearchParams({
        select: "name,streak,score,accuracy,mode,played_at",
        order:  "score.desc",
        limit:  String(limit),
    });
    if (mode)  params.append("mode",  `eq.${mode}`);
    if (daily) params.append("daily", "eq.true");

    const res = await _query(`${TABLE}?${params.toString()}`, { method: "GET" });
    console.log("[leaderboard] fetchTopScores result:", res);
    _cachedTop = res.ok && res.data ? res.data : [];
    return _cachedTop;
}
// ── Render leaderboard into an element ───────────────────────
export function renderOnlineBoard(container, scores, currentName = "") {
    if (!container) return;
    if (!scores || scores.length === 0) {
        container.innerHTML = `<div class="lb-empty">no scores yet — be first</div>`;
        return;
    }

    const rows = scores.map((s, i) => {
        const isYou  = s.name === currentName;
        const medal  = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        const modeColor = { easy:"#00ffe0", medium:"#00ccff", hard:"#ff8800", impossible:"#ff2d78" }[s.mode] || "#fff";
        return `
        <div class="lb-row ${isYou ? "lb-row-you" : ""}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${_esc(s.name)}${isYou ? " ◀" : ""}</span>
            <span class="lb-mode" style="color:${modeColor}">${(s.mode || "?").toUpperCase()}</span>
            <span class="lb-score">${Number(s.score).toLocaleString()}</span>
            <span class="lb-streak">×${s.streak}</span>
        </div>`;
    }).join("");

    container.innerHTML = `<div class="lb-list">${rows}</div>`;
}

function _esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Cached top for in-game fake board replacement ─────────────
export function getCachedTop() { return _cachedTop; }
