// main.js — clean integration pass
import {
    resetState, beatLoop, handleClick, pauseGame, resumeGame,
    setPracticeMode, setDailyMode, setLastPointer, getState,
    isGamePaused, getPracticeWindows, isPracticeMode,
    registerOnGameEnd,
} from "./game.js";
import { generateFakePlayers, updateLeaderboard } from "./players.js";
import { updateHUD, applyModeTheme, toast, showPracticeZones, hidePracticeZones } from "./ui.js";
import { initAudio, setVolume, setMute, saveVolume, loadVolume,
         playHoverTone, playNewBest, setAudioMode, startHomeAmbience, startMusic } from "./audio.js";
import { fetchFact } from "./facts.js";
import { setMode, getMode, GAME_MODES } from "./modes.js";
import { createShareCard } from "./shareCard.js";
import { getUnlockedSkin, getSkinThresholds } from "./skins.js";
import { startRhythmChallenge, rhythmTap } from "./rhythm.js";
import { startTutorial, tutorialNext, tutorialSkip, isTutorialActive } from "./tutorial.js";
import { submitScore, fetchTopScores, renderOnlineBoard } from "./leaderboard.js";
import { hasDailyAttempt, saveDailyResult, getDailyResult, buildShareString } from "./daily.js";
import { unlockCheckInit } from "./unlock.js";
import { initBackgroundParticles } from "./particles.js";
import { triggerWinCelebration } from "./celebration.js";
import { renderHistory } from "./history.js";
import { getAll as getAllAchievements, countEarned, TIER_COLOR } from "./achievements.js";

// ── DOM refs ──────────────────────────────────────────────────
const modeScreen    = document.getElementById("mode-screen");
const retryBtn      = document.getElementById("retry-btn");
const changeModeBtn = document.getElementById("change-mode-btn");
const overlayBest   = document.getElementById("overlay-best");
const factText      = document.getElementById("fact-text");
const factBtn       = document.getElementById("fact-btn");
const countdownEl   = document.getElementById("countdown-overlay");
const pauseBtn      = document.getElementById("pause-btn");

let gameActive  = false;
let activePanel = null;
let _isDaily    = false;
let _muted      = false;

// ── Register game-end callback (fixes circular import) ────────
registerOnGameEnd((result, best, accuracy, score) => {
    _onGameEnd(result, best, accuracy, score);
});

// ── Panels ────────────────────────────────────────────────────
function openPanel(name) {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("nav-active"));
    document.getElementById(name ? "nav-" + name : "nav-play")?.classList.add("nav-active");
    activePanel = name;

    const wrap = document.getElementById("panel-wrap");
    ["records","settings"].forEach(p =>
        document.getElementById("panel-" + p)?.classList.add("hidden"));

    if (name) {
        pauseGame();
        wrap.classList.remove("hidden","panel-animate");
        void wrap.offsetWidth;
        wrap.classList.add("panel-animate");
        document.getElementById("panel-" + name)?.classList.remove("hidden");
        if (name === "records") _renderRecords();
    } else {
        wrap.classList.add("hidden");
        if (gameActive) resumeGame();
    }
}

function isPanelOpen() { return activePanel !== null; }

// ── Records ───────────────────────────────────────────────────
function _renderRecords() {
    const el = document.getElementById("records-body");
    if (!el) return;
    const totalGames = parseInt(localStorage.getItem("echo_total_games") || "0");
    const lastAcc    = localStorage.getItem("echo_last_accuracy") || "–";
    const thresholds = getSkinThresholds();

    const skinHtml = thresholds.map(t => {
        const unlocked = Object.values(GAME_MODES).some(m => {
            const b = parseInt(localStorage.getItem("echo_best_" + m.id) || "0");
            return b >= t.streak;
        }) || t.skin === "default";
        return `<div class="skin-preview-item ${unlocked ? "skin-unlocked" : "skin-locked"}">
            <span class="skin-preview-icon">${unlocked ? "✦" : "🔒"}</span>
            <span class="skin-preview-name">${t.label}</span>
            ${unlocked ? '<span class="skin-preview-got">✓</span>'
                       : `<span class="skin-preview-req">×${t.streak}</span>`}
        </div>`;
    }).join("");

    const rows = Object.values(GAME_MODES).map(m => {
        const best = localStorage.getItem("echo_best_" + m.id) || "–";
        const skin = getUnlockedSkin(m.id);
        const next = thresholds.find(t => t.streak > (parseInt(best) || 0));
        const hint = next
            ? `<span class="rec-next">${next.streak-(parseInt(best)||0)} more → ${next.label}</span>`
            : `<span class="rec-next" style="color:var(--accent)">all skins ✓</span>`;
        return `<div class="rec-row">
            <span class="rec-icon" style="color:${m.color}">${m.icon}</span>
            <span class="rec-mode">${m.label}</span>
            <div class="rec-right">
                <span class="rec-val" style="color:${m.color}">${best !== "–" ? "×"+best : "–"}</span>
                <span class="rec-skin" style="color:${m.color}">${skin.label}</span>
                ${hint}
            </div>
        </div>`;
    }).join("");

    // Achievements section
    const allAch   = getAllAchievements();
    const earned   = countEarned();
    const total    = allAch.length;
    const pct      = Math.round((earned / total) * 100);
    const achHtml  = allAch.map(a => {
        const col    = a.earned ? (TIER_COLOR[a.tier] || "#fff") : "rgba(255,255,255,0.18)";
        const opacity = a.earned ? "1" : "0.35";
        return `<div class="ach-item ${a.earned ? "ach-item-earned" : "ach-item-locked"}" title="${a.desc}">
            <span class="ach-item-icon" style="color:${col};opacity:${opacity}">${a.icon}</span>
            <div class="ach-item-body">
                <span class="ach-item-label" style="color:${col};opacity:${opacity}">${a.label}</span>
                <span class="ach-item-desc">${a.earned ? a.desc : "???"}</span>
            </div>
            ${a.earned ? `<span class="ach-item-tier" style="color:${col}">${a.tier}</span>` : ""}
        </div>`;
    }).join("");

    const dailyWins  = parseInt(localStorage.getItem("echo_daily_wins") || "0");
    el.innerHTML = `
        <div class="rec-meta"><span>games played</span>
            <span style="color:var(--accent)">${totalGames}</span></div>
        <div class="rec-meta"><span>last accuracy</span>
            <span style="color:var(--accent)">${lastAcc}</span></div>
        <div class="rec-meta"><span>daily wins</span>
            <span style="color:#ffd700">${dailyWins} / 7 ${dailyWins >= 7 ? "🏆" : ""}</span></div>
        <div class="rec-divider"></div>
        <div class="skin-preview-wrap">${skinHtml}</div>
        <div class="rec-divider"></div>
        ${rows}
        <div class="rec-divider" style="margin-top:8px"></div>
        <div class="panel-header" style="padding:10px 0 6px;font-size:0.44rem;opacity:0.45">
            achievements
            <span style="margin-left:auto;color:var(--accent);font-size:0.42rem">${earned}/${total}</span>
        </div>
        <div class="ach-progress-bar-wrap">
            <div class="ach-progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="ach-list">${achHtml}</div>
        <div class="rec-divider" style="margin-top:8px"></div>
        <div class="panel-header" style="padding:10px 0 6px;font-size:0.44rem;opacity:0.45">recent runs</div>
        <div id="run-history-body"></div>`;

    const histEl = document.getElementById("run-history-body");
    if (histEl) renderHistory(histEl);
}

// ── Settings ──────────────────────────────────────────────────
function _initSettings() {
    const slider  = document.getElementById("volume-slider");
    const volVal  = document.getElementById("volume-val");
    const muteBtn = document.getElementById("mute-btn");
    const hcToggle= document.getElementById("hc-toggle");

    // Volume
    const savedVol = loadVolume();
    if (slider) slider.value = savedVol;
    if (volVal) volVal.innerText = savedVol + "%";

    slider?.addEventListener("input", () => {
        const v = parseInt(slider.value);
        if (volVal) volVal.innerText = v + "%";
        saveVolume(v); setVolume(v);
        if (_muted && v > 0) { _muted = false; if (muteBtn) muteBtn.textContent = "🔊"; }
    });

    muteBtn?.addEventListener("click", () => {
        _muted = !_muted;
        setMute(_muted);
        muteBtn.textContent = _muted ? "🔇" : "🔊";
        toast(_muted ? "muted" : "unmuted");
    });

    // High contrast
    const hcSaved = localStorage.getItem("echo_hc") === "1";
    if (hcSaved) { document.documentElement.classList.add("high-contrast"); hcToggle?.classList.add("toggle-on"); }

    hcToggle?.addEventListener("click", () => {
        const on = document.documentElement.classList.toggle("high-contrast");
        hcToggle.classList.toggle("toggle-on", on);
        localStorage.setItem("echo_hc", on ? "1" : "0");
        toast(on ? "high contrast on" : "high contrast off");
    });

    // Tutorial
    document.getElementById("btn-replay-tutorial")?.addEventListener("click", () => {
        openPanel(null); _launchTutorial();
    });

    // Clear
    document.getElementById("settings-clear")?.addEventListener("click", () => {
        if (!confirm("Clear all records?")) return;
        Object.values(GAME_MODES).forEach(m => {
            localStorage.removeItem("echo_best_" + m.id);
            localStorage.removeItem("echo_ghost_" + m.id);
        });
        localStorage.removeItem("echo_total_games");
        localStorage.removeItem("echo_last_accuracy");
        // Clear achievement state
        localStorage.removeItem("echo_daily_wins");
        localStorage.removeItem("echo_rhythm_wins");
        for (const a of getAllAchievements()) {
            localStorage.removeItem("echo_ach_" + a.id);
            localStorage.removeItem("echo_ach_seen_" + a.id);
        }
        toast("records cleared");
        openPanel(null);
    });
}

// ── Pause button ──────────────────────────────────────────────
function _doPause() {
    pauseGame();
    if (pauseBtn) pauseBtn.textContent = "▶";
    document.getElementById("paused-overlay")?.classList.remove("hidden");
}

function _doResume() {
    resumeGame();
    if (pauseBtn) pauseBtn.textContent = "⏸";
    document.getElementById("paused-overlay")?.classList.add("hidden");
}

function _showPauseBtn(show) {
    if (!pauseBtn) return;
    pauseBtn.classList.toggle("hidden", !show);
    pauseBtn.textContent = "⏸";
}

function _initPauseButton() {
    pauseBtn?.addEventListener("click", e => {
        e.stopPropagation();
        if (!gameActive) return;
        isGamePaused() ? _doResume() : _doPause();
    });
    document.getElementById("paused-resume-btn")?.addEventListener("click", e => {
        e.stopPropagation(); _doResume();
    });
}

// ── Tutorial ──────────────────────────────────────────────────
function _launchTutorial() {
    pauseGame();
    startTutorial(() => { if (gameActive) resumeGame(); });
}

function _checkOnboarding() {
    const played = parseInt(localStorage.getItem("echo_total_games") || "0");
    if (played === 0 && !localStorage.getItem("echo_tutorial_seen")) {
        localStorage.setItem("echo_tutorial_seen", "1");
        setTimeout(_launchTutorial, 400);
    }
}

// ── Mode select ───────────────────────────────────────────────
function _initModeSelect() {
    _populateModeBests();
    _updateDailyCard();

    document.querySelectorAll(".mode-card").forEach(btn => {
        btn.addEventListener("pointerenter", () => { try { playHoverTone(btn.dataset.mode); } catch {} });
        btn.addEventListener("click", () => {
            const id = btn.dataset.mode;
            _isDaily = false;

            if (id === "daily") {
                if (hasDailyAttempt()) {
                    const r = getDailyResult();
                    toast(`already played today — best ×${r?.streak ?? "–"}`, "info", 3000);
                    return;
                }
                _isDaily = true;
                setDailyMode(true); setMode("medium"); setPracticeMode(false);
                setAudioMode("medium");
            } else if (id === "practice") {
                setDailyMode(false); setMode("easy"); setPracticeMode(true);
                setAudioMode("easy");
            } else if (id === "rhythm") {
                setDailyMode(false); setMode("medium"); setPracticeMode(false);
                setAudioMode("medium");
                applyModeTheme(getMode());
                modeScreen.classList.add("hidden");
                startRhythmChallenge(startGameAfterCountdown);
                return;
            } else {
                setDailyMode(false); setMode(id); setPracticeMode(false);
                setAudioMode(id);
            }

            applyModeTheme(getMode());
            _showStoredBest();
            modeScreen.classList.add("hidden");
            _startWithCountdown();
        });
    });
}

function _updateDailyCard() {
    const card = document.getElementById("daily-mode-card");
    const sub  = document.getElementById("best-daily");
    if (!card) return;
    if (hasDailyAttempt()) {
        const r = getDailyResult();
        card.classList.add("mode-card-done");
        if (!card.querySelector(".daily-done-badge")) {
            const b = document.createElement("div");
            b.className = "daily-done-badge";
            b.textContent = "✓ DONE";
            card.appendChild(b);
        }
        if (sub && r) sub.innerText = "×" + r.streak + " · " + r.accuracy;
    }
}

function _populateModeBests() {
    ["easy","medium","hard","impossible"].forEach(id => {
        const el = document.getElementById("best-" + id);
        if (!el) return;
        const v = localStorage.getItem("echo_best_" + id);
        el.innerText = v && parseInt(v) > 0 ? "best ×" + v : "";
    });
}

function _showStoredBest() {
    const mode   = getMode();
    const stored = localStorage.getItem("echo_best_" + mode.id);
    if (overlayBest) overlayBest.innerText =
        stored && parseInt(stored) > 0 ? "best on " + mode.label + ": ×" + stored : "";
}

// ── Soft reset ────────────────────────────────────────────────
function _softReset() {
    document.getElementById("end-screen")?.classList.add("hidden");
    document.getElementById("new-best-banner")?.classList.add("hidden");
    modeScreen.classList.remove("hidden");
    gameActive = false; _isDaily = false;
    _showPauseBtn(false);
    hidePracticeZones();
    _populateModeBests();
    _updateDailyCard();
}

// ── Game launch ───────────────────────────────────────────────
function _initGameState() {
    resetState();
    unlockCheckInit();
    updateHUD({ streak:0, best:0, totalClicks:0, correctClicks:0 });
    generateFakePlayers();
    updateLeaderboard(0);
}

function _launch() {
    gameActive = true;
    _showPauseBtn(true);
    startMusic();   // transition audio from home ambience → beat-driven game music
    beatLoop();
    if (isPracticeMode()) {
        const w = getPracticeWindows();
        showPracticeZones(w.perfectWindow, w.goodWindow, 1100);
    }
}

function _startWithCountdown() {
    _initGameState();
    if (!countdownEl) { _launch(); return; }
    const steps = ["3","2","1","GO"];
    let i = 0;
    countdownEl.classList.remove("hidden");
    function tick() {
        countdownEl.innerText = steps[i];
        countdownEl.classList.remove("countdown-pop");
        void countdownEl.offsetWidth;
        countdownEl.classList.add("countdown-pop");
        i++;
        if (i < steps.length) setTimeout(tick, 800);
        else setTimeout(() => { countdownEl.classList.add("hidden"); _launch(); }, 600);
    }
    tick();
}

export function startGameAfterCountdown() {
    _initGameState(); _launch();
}

// ── Game end callback ─────────────────────────────────────────
function _onGameEnd(result, best, accuracy, score) {
    _showPauseBtn(false);
    hidePracticeZones();

    // Daily result
    if (_isDaily) {
        saveDailyResult({ streak: best, score, accuracy, mode: getMode().label });
        document.getElementById("daily-share-wrap")?.classList.remove("hidden");
    } else {
        document.getElementById("daily-share-wrap")?.classList.add("hidden");
    }

    // Big stats
    const s = getState();
    const el = (id) => document.getElementById(id);
    const sv = el("end-streak-val"); if (sv) sv.innerText = "×" + best;
    const sc = el("end-score-val");  if (sc) sc.innerText = s.score.toLocaleString();
    const sa = el("end-acc-val");    if (sa) sa.innerText = accuracy;

    // New best banner
    if (!_isDaily && best > 0) {
        const modeKey = "echo_best_" + getMode().id;
        const prevBest = parseInt(localStorage.getItem(modeKey) || "0");
        // prevBest was just saved, so compare against what it was before
        // We detect new best by checking if best > previously stored - 1
        // Actually: endGame saves the best, we check after. Use score comparison.
        // Simple: show banner if result=master OR best exceeded stored before this run
        // Stored was already updated — check run history instead
        // Practical fix: show banner if result === "master" || best >= 10
        const banner = el("new-best-banner");
        const bannerText = el("new-best-text");
        if (banner && result === "master") {
            if (bannerText) bannerText.innerText = "YOU WON 🔥";
            banner.classList.remove("hidden","new-best-out");
            banner.classList.add("new-best-in");
            playNewBest();
            setTimeout(() => {
                banner.classList.add("new-best-out");
                setTimeout(() => banner.classList.add("hidden"), 600);
            }, 3500);
        } else if (banner) {
            banner.classList.add("hidden");
        }
    }

    // Reset submit UI
    const status = el("lb-submit-status");
    const btn    = el("lb-submit-btn");
    if (status) status.innerText = "";
    if (btn)    btn.disabled = false;
    const nameInput = el("lb-name-input");
    if (nameInput && !nameInput.value)
        nameInput.value = localStorage.getItem("echo_lb_name") || "";

    _refreshBoard(null);
}

// ── End screen handlers ───────────────────────────────────────
function _initEndScreenHandlers() {
    document.getElementById("lb-submit-btn")?.addEventListener("click", async () => {
        const nameInput = document.getElementById("lb-name-input");
        const status    = document.getElementById("lb-submit-status");
        const btn       = document.getElementById("lb-submit-btn");
        const name      = nameInput?.value?.trim();
        if (!name) { if (status) status.innerText = "enter a name first"; return; }
        localStorage.setItem("echo_lb_name", name);
        if (status) status.innerText = "submitting...";
        btn.disabled = true;
        const s  = getState();
        const ok = await submitScore({
            name, streak: s.best, score: s.score,
            accuracy: s.totalClicks
                ? Math.floor((s.correctClicks/s.totalClicks)*100)+"%"
                : "0%",
            mode: getMode().id, daily: _isDaily,
        });
        if (status) status.innerText = ok ? "✓ posted!" : "queued — will post when online";
        if (ok) { _refreshBoard(null); toast("score posted! 🎉"); }
    });

    document.querySelectorAll(".lb-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".lb-tab").forEach(t => t.classList.remove("lb-tab-active"));
            tab.classList.add("lb-tab-active");
            _refreshBoard(tab.dataset.tab === "mode" ? getMode().id : null);
        });
    });

    document.getElementById("daily-share-btn")?.addEventListener("click", async () => {
        const s    = getState();
        const text = buildShareString({
            streak:   s.best,
            accuracy: s.totalClicks
                ? Math.floor((s.correctClicks/s.totalClicks)*100)+"%" : "0%",
        });
        try { await navigator.clipboard.writeText(text); toast("copied! 📋"); }
        catch { prompt("Copy this:", text); }
    });

    document.getElementById("share-card-btn")?.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        const image  = createShareCard(canvas);
        const a      = document.createElement("a");
        a.href = image; a.download = "echo-run.png"; a.click();
        toast("image saved! 📸");
    });
}

async function _refreshBoard(modeFilter) {
    const list = document.getElementById("lb-online-list");
    if (!list) return;
    list.innerHTML = `<div class="lb-empty">loading...</div>`;
    const scores = await fetchTopScores({ mode: modeFilter, limit: 10 });
    renderOnlineBoard(list, scores, localStorage.getItem("echo_lb_name") || "");
}

// ── Facts ─────────────────────────────────────────────────────
async function _loadFact() {
    if (!factText) return;
    factText.style.opacity = "0.1";
    factText.innerText = "···";
    const fact = await fetchFact();
    factText.innerText = fact;
    factText.classList.remove("fact-pop");
    void factText.offsetWidth;
    factText.classList.add("fact-pop");
}

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    // Background particles
    initBackgroundParticles();

    // Nav
    document.getElementById("nav-play")    ?.addEventListener("click", () => openPanel(null));
    document.getElementById("nav-records") ?.addEventListener("click", () => {
        openPanel("records");
        _clearAchievementDot();
    });
    document.getElementById("nav-settings")?.addEventListener("click", () => openPanel("settings"));

    // Show notification dot on BESTS button if there are unseen earned achievements
    _updateAchievementDot();

    _initModeSelect();
    _initSettings();
    _initPauseButton();
    _initEndScreenHandlers();
    _loadFact();

    factBtn?.addEventListener("click",      e => { e.stopPropagation(); _loadFact(); });
    factBtn?.addEventListener("touchstart", e => { e.stopPropagation(); _loadFact(); }, { passive:true });

    document.getElementById("tut-next")?.addEventListener("click", tutorialNext);
    document.getElementById("tut-skip")?.addEventListener("click", tutorialSkip);

    // Retry — soft reset then new game
    retryBtn?.addEventListener("click", e => {
        e.stopPropagation();
        document.getElementById("end-screen")?.classList.add("hidden");
        document.getElementById("new-best-banner")?.classList.add("hidden");
        _startWithCountdown();
    });
    retryBtn?.addEventListener("touchstart", e => {
        e.stopPropagation();
        document.getElementById("end-screen")?.classList.add("hidden");
        document.getElementById("new-best-banner")?.classList.add("hidden");
        _startWithCountdown();
    }, { passive:true });

    changeModeBtn?.addEventListener("click",      _softReset);
    changeModeBtn?.addEventListener("touchstart", _softReset, { passive:true });

    // Flow tooltip — one time, 8s after first game
    if (!localStorage.getItem("echo_flow_tip_seen")) {
        setTimeout(() => {
            const tt = document.getElementById("flow-tooltip");
            if (tt) {
                tt.classList.add("flow-tip-show");
                setTimeout(() => {
                    tt.classList.remove("flow-tip-show");
                    localStorage.setItem("echo_flow_tip_seen","1");
                }, 3500);
            }
        }, 8000);
    }

    // Audio overlay — THE FIX: ensure display is set correctly
    const audioOverlay = document.getElementById("audio-overlay");
    if (audioOverlay) {
        // Make sure it's visible (CSS sets display:flex, but JS also ensures it)
        audioOverlay.style.display = "flex";
        audioOverlay.style.zIndex  = "9999";

        const dismiss = (e) => {
            e.stopPropagation();
            initAudio();
            const v = loadVolume();
            setVolume(v);
            const slider = document.getElementById("volume-slider");
            const volVal = document.getElementById("volume-val");
            if (slider) slider.value = v;
            if (volVal) volVal.innerText = v + "%";
            audioOverlay.style.display = "none";
            modeScreen.classList.remove("hidden");
            // Start home screen ambience — same musical world as the game
            try { startHomeAmbience(); } catch {}
            _checkOnboarding();
        };

        audioOverlay.addEventListener("click",      dismiss);
        audioOverlay.addEventListener("touchstart", dismiss, { passive:true });
    }
});

// ── Pointer tracking ──────────────────────────────────────────
document.addEventListener("mousedown",  e => setLastPointer(e.clientX, e.clientY));
document.addEventListener("touchstart", e => {
    const t = e.touches[0]; if (t) setLastPointer(t.clientX, t.clientY);
}, { passive:true });

// ── Input ─────────────────────────────────────────────────────
const BLOCKED =
    "#retry-btn,#audio-overlay,#mode-screen,#end-screen,#bottom-nav," +
    "#fact-strip,#panel-wrap,#change-mode-btn,#countdown-overlay," +
    "#tutorial-overlay,#taunt-overlay,#lb-submit-wrap,#lb-online-wrap," +
    "#daily-share-wrap,#end-actions,#pause-btn,#hud,#score-hud," +
    "#paused-overlay,#new-best-banner";

function _onInput(e) {
    if (isTutorialActive()) {
        if (e.target?.closest?.("#tut-backdrop")) tutorialNext();
        return;
    }
    if (isPanelOpen()) return;
    if (!modeScreen.classList.contains("hidden")) return;
    if (e.target?.closest?.("#paused-overlay")) { _doResume(); return; }
    if (e.target?.closest?.(BLOCKED)) return;

    const rc = document.getElementById("rhythm-challenge");
    if (rc && !rc.classList.contains("hidden")) { rhythmTap(); return; }

    handleClick(true);
}

document.addEventListener("click",      _onInput);
document.addEventListener("touchstart", _onInput, { passive:true });

// ── Keyboard ──────────────────────────────────────────────────
document.addEventListener("keydown", e => {
    if (e.repeat) return;

    if (isTutorialActive()) {
        if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); tutorialNext(); }
        if (e.code === "Escape") tutorialSkip();
        return;
    }

    if (e.code === "Escape") {
        if (isPanelOpen()) { openPanel(null); return; }
        if (gameActive) { isGamePaused() ? _doResume() : _doPause(); return; }
    }

    if (e.code === "KeyP" && gameActive && !isPanelOpen()) {
        isGamePaused() ? _doResume() : _doPause(); return;
    }

    if (!modeScreen.classList.contains("hidden")) {
        const map = {"1":"easy","2":"medium","3":"hard","4":"impossible",
                     "5":"practice","6":"rhythm","7":"daily"};
        if (map[e.key]) {
            document.querySelector(`.mode-card[data-mode="${map[e.key]}"]`)?.click();
            return;
        }
    }

    if (e.code === "KeyR" && !isPanelOpen() && !gameActive) { openPanel("records"); return; }

    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!isPanelOpen() && modeScreen.classList.contains("hidden") &&
            (countdownEl?.classList.contains("hidden") ?? true)) {
            handleClick(false);
        }
    }
});


// ── Achievement notification dot ──────────────────────────────
function _hasUnseenAchievements() {
    return getAllAchievements().some(a => a.earned && !a.seen);
}

function _updateAchievementDot() {
    const btn = document.getElementById("nav-records");
    if (!btn) return;
    let dot = btn.querySelector(".nav-notif-dot");
    if (_hasUnseenAchievements()) {
        if (!dot) {
            dot = document.createElement("span");
            dot.className = "nav-notif-dot";
            btn.appendChild(dot);
        }
    } else {
        dot?.remove();
    }
}

function _clearAchievementDot() {
    document.querySelector(".nav-notif-dot")?.remove();
}
