//leaderboard.js — Supabase online leaderboard

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const TABLE    = "echo_scores";
const QUEUE_KEY = "echo_lb_queue";

// ── Queue for offline retry ───────────────────────────────────
function _enqueue(payload) {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        q.push(payload);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20)));
    } catch {}
}

async function _flushQueue() {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        if (!q.length) return;
        const remaining = [];
        for (const payload of q) {
            const res = await _post(payload);
            if (!res.ok) remaining.push(payload);
        }
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch {}
}

if (typeof window !== "undefined") {
    window.addEventListener("online", _flushQueue);
    setTimeout(_flushQueue, 3000);
}

let _cachedTop = [];

// ── Core fetch wrapper ────────────────────────────────────────
async function _supabase(path, { method = "GET", body = null, prefer = null } = {}) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error("[lb] ❌ config.js has empty SUPABASE_URL or SUPABASE_ANON_KEY");
        return { ok: false, error: "missing_credentials" };
    }

    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    console.log(`[lb] ${method} ${url}`);

    const headers = {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    };
    if (prefer) headers["Prefer"] = prefer;

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        console.log(`[lb] response status: ${res.status}`);

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(`[lb] ❌ HTTP ${res.status}:`, text);
            return { ok: false, status: res.status, error: text };
        }

        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("json") ? await res.json() : null;
        console.log(`[lb] ✅ success, data:`, data);
        return { ok: true, data };

    } catch (err) {
        console.error("[lb] ❌ network error:", err.message);
        return { ok: false, error: err.message };
    }
}

// ── POST a score ──────────────────────────────────────────────
async function _post(payload) {
    return _supabase(TABLE, { method: "POST", body: payload, prefer: "return=minimal" });
}

// ── Submit score (called from main.js) ───────────────────────
export async function submitScore({ name, streak, score, accuracy, mode, daily = false }) {
    if (!name?.trim()) return { ok: false, error: "no_name" };
    const payload = {
        name:      name.trim().slice(0, 24),
        streak:    streak  ?? 0,
        score:     score   ?? 0,
        accuracy:  accuracy ?? "0%",
        mode:      mode    ?? "easy",
        daily:     daily,
        played_at: new Date().toISOString(),
    };
    const res = await _post(payload);
    if (!res.ok) {
        const isRLS = res.status === 403
            || (typeof res.error === "string" && res.error.includes("42501"));
        if (!isRLS) _enqueue(payload);
        return { ok: false, status: res.status, isRLS, error: res.error };
    }
    return { ok: true };
}

// ── Fetch top scores ──────────────────────────────────────────
export async function fetchTopScores({ mode = null, limit = 10, daily = false } = {}) {
    // Build query string safely
    const params = new URLSearchParams();
    params.set("select", "name,streak,score,accuracy,mode,played_at");
    params.set("order",  "score.desc");
    params.set("limit",  String(limit));
    if (mode)  params.set("mode",  `eq.${mode}`);
    if (daily) params.set("daily", "eq.true");

    const res = await _supabase(`${TABLE}?${params.toString()}`, { method: "GET" });

    if (!res.ok) {
        console.error("[lb] fetchTopScores failed:", res);
        _cachedTop = [];
        return [];
    }

    _cachedTop = Array.isArray(res.data) ? res.data : [];
    console.log(`[lb] fetched ${_cachedTop.length} scores`);
    return _cachedTop;
}

// ── Render leaderboard ────────────────────────────────────────
export function renderOnlineBoard(container, scores, currentName = "") {
    if (!container) return;

    if (!scores || scores.length === 0) {
        container.innerHTML = `<div class="lb-empty">no scores yet — be first</div>`;
        return;
    }

    const rows = scores.map((s, i) => {
        const isYou     = s.name === currentName;
        const medal     = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
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
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function getCachedTop() { return _cachedTop; }