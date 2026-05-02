// tutorial.js — interactive step-by-step tutorial overlay
// Walks through: beat, timing ring, hit types, flow bar, streak, end screen
// All animated, skippable, blocks input to game while active

let _overlay = null;
let _step    = 0;
let _active  = false;
let _demoInterval = null;
let _demoFrame    = null;
let _onDone       = null;

const STEPS = [
    {
        id: "welcome",
        title: "before we start — one thing.",
        body: "Don't try to win yet.\n\nJust listen. The beat will tell you when to tap. The ring is a hint. Not an instruction.",
        highlight: null,
        demo: null,
        duration: null,
    },
    {
        id: "circle",
        title: "this is the only thing that matters.",
        body: "Every pulse is a beat. You feel it before you see it — or you will, eventually. That moment when your hands move before your brain catches up? That's the whole game.",
        highlight: "circle",
        demo: "pulse-circle",
        duration: 2000,
    },
    {
        id: "timing-ring",
        title: "the ring is a training wheel.",
        body: "It shrinks toward the circle. Tap when it arrives. But here's the secret — the best players stop watching it. They feel the beat coming and move before they see the ring land.",
        highlight: "timing-ring",
        demo: "shrink-ring",
        duration: 2200,
    },
    {
        id: "hit-types",
        title: "the game will tell you what it heard.",
        body: "PERFECT — you were in the pocket.\nGOOD — close. you felt it.\nMISS — you were thinking, not feeling.\n\nMisses aren't failure. They're information.",
        highlight: "feedback",
        demo: "show-hits",
        duration: 3000,
    },
    {
        id: "flow",
        title: "the game pushes back when you're good.",
        body: "The FLOW bar on the left fills when you hit. When it's full, the beat speeds up and the windows tighten. The better you get, the harder it gets. There is no comfortable ceiling.",
        highlight: "flow-bar-wrap",
        demo: "pulse-flow",
        duration: 2500,
    },
    {
        id: "streak",
        title: "consecutive hits build a streak.",
        body: "String hits together and your score multiplies — ×2 at 3, ×4 at 7, ×8 at 14 in a row. One miss resets it to zero.\n\nThe streak isn't the goal. It's proof you stopped thinking.",
        highlight: "hud",
        demo: "count-streak",
        duration: 2500,
    },
    {
        id: "end",
        title: "at the end, the game shows you your run.",
        body: "Not just a score. A waveform of every tap — where you were on time, where you drifted, where you dissolved. The game will also tell you something specific about what it saw.",
        highlight: null,
        demo: "show-end-preview",
        duration: null,
    },
    {
        id: "modes",
        title: "four states. one journey.",
        body: "FEEL — find the beat. wide windows, slow tempo.\nTRUST — you know the beat. stop watching the ring.\nFORGET — stop thinking. your hands know.\nDISSOLVE — 38ms. there is no you and the beat.\n\nStart at FEEL. Move when you're ready.",
        highlight: null,
        demo: null,
        duration: null,
    },
    {
        id: "ready",
        title: "one last thing.",
        body: "The ring is a hint.\nNot an instruction.\n\nListen first.",
        highlight: null,
        demo: null,
        duration: null,
        last: true,
    },
];

export function startTutorial(onDone, autoOpen = false) {
    _onDone = onDone;
    _step   = 0;
    _active = true;

    _overlay = document.getElementById("tutorial-overlay");
    if (!_overlay) { _onDone?.(); return; }

    _overlay.classList.remove("hidden");
    _showStep(0);
}

export function isTutorialActive() { return _active; }

function _showStep(idx) {
    if (!_active) return;
    _clearDemo();

    const step = STEPS[idx];
    if (!step) { _finish(); return; }

    const titleEl    = _overlay.querySelector("#tut-title");
    const bodyEl     = _overlay.querySelector("#tut-body");
    const progressEl = _overlay.querySelector("#tut-progress");
    const nextBtn    = _overlay.querySelector("#tut-next");
    const stepNumEl  = _overlay.querySelector("#tut-step-num");

    if (titleEl)    titleEl.innerText = step.title;
    if (bodyEl)     bodyEl.innerText  = step.body;
    if (stepNumEl)  stepNumEl.innerText = (idx + 1) + " / " + STEPS.length;
    if (nextBtn)    nextBtn.innerText = step.last ? "i'm ready" : "got it →";

    // Progress dots
    if (progressEl) {
        progressEl.innerHTML = STEPS.map((_, i) =>
            `<div class="tut-dot ${i === idx ? "tut-dot-active" : i < idx ? "tut-dot-done" : ""}"></div>`
        ).join("");
    }

    // Highlight a game element
    _clearHighlight();
    if (step.highlight) _highlightEl(step.highlight);

    // Animate content in
    const card = _overlay.querySelector("#tut-card");
    if (card) {
        card.classList.remove("tut-card-in");
        void card.offsetWidth;
        card.classList.add("tut-card-in");
    }

    // Run demo animation
    if (step.demo) _runDemo(step.demo);
}

function _runDemo(type) {
    const demoArea = _overlay.querySelector("#tut-demo");
    if (!demoArea) return;
    demoArea.innerHTML = "";

    if (type === "pulse-circle") {
        demoArea.innerHTML = `<div class="tut-demo-circle"></div>`;
        const c = demoArea.querySelector(".tut-demo-circle");
        let on = false;
        _demoInterval = setInterval(() => {
            on = !on;
            c.classList.toggle("tut-demo-pulse", on);
        }, 700);
    }

    else if (type === "shrink-ring") {
        demoArea.innerHTML = `
            <div class="tut-demo-wrap">
                <div class="tut-demo-circle"></div>
                <div class="tut-demo-ring"></div>
            </div>`;
        const ring = demoArea.querySelector(".tut-demo-ring");
        let pct = 0;
        const animate = () => {
            pct = (pct + 0.008) % 1;
            const size = 120 - pct * 60;
            ring.style.width   = size + "px";
            ring.style.height  = size + "px";
            ring.style.opacity = (0.2 + pct * 0.7).toFixed(2);
            _demoFrame = requestAnimationFrame(animate);
        };
        _demoFrame = requestAnimationFrame(animate);
    }

    else if (type === "show-hits") {
        demoArea.innerHTML = `<div class="tut-demo-feedback" id="tdf"></div>`;
        const fb = demoArea.querySelector("#tdf");
        const seq = [
            { text: "perfect", cls: "tdf-perfect" },
            { text: "good",    cls: "tdf-good"    },
            { text: "miss",    cls: "tdf-miss"    },
        ];
        let i = 0;
        const show = () => {
            const s = seq[i % seq.length];
            fb.innerText = s.text;
            fb.className = "tut-demo-feedback " + s.cls;
            fb.classList.remove("tdf-pop");
            void fb.offsetWidth;
            fb.classList.add("tdf-pop");
            i++;
        };
        show();
        _demoInterval = setInterval(show, 900);
    }

    else if (type === "pulse-flow") {
        demoArea.innerHTML = `
            <div class="tut-demo-flow-wrap">
                <div class="tut-demo-flow-track">
                    <div class="tut-demo-flow-fill" id="tff"></div>
                </div>
                <div class="tut-demo-flow-label">FLOW</div>
            </div>`;
        const fill = demoArea.querySelector("#tff");
        let pct = 0, dir = 1;
        _demoInterval = setInterval(() => {
            pct = Math.max(0, Math.min(100, pct + dir * 8));
            if (pct >= 100 || pct <= 0) dir *= -1;
            fill.style.height = pct + "%";
        }, 120);
    }

    else if (type === "count-streak") {
        demoArea.innerHTML = `
            <div class="tut-demo-streak-wrap">
                <div class="tut-demo-streak-label">STREAK</div>
                <div class="tut-demo-streak-val" id="tsv">0</div>
                <div class="tut-demo-mult" id="tmv"></div>
            </div>`;
        const sv  = demoArea.querySelector("#tsv");
        const mv  = demoArea.querySelector("#tmv");
        let n = 0;
        _demoInterval = setInterval(() => {
            if (n < 14) {
                n++;
                sv.innerText = n;
                mv.innerText = n >= 14 ? "×8" : n >= 7 ? "×4" : n >= 3 ? "×2" : "";
                mv.style.color = n >= 14 ? "#ff2d78" : n >= 7 ? "#ff8800" : "#00ffe0";
            } else {
                n = 0; sv.innerText = 0; mv.innerText = "";
            }
        }, 200);
    }

    else if (type === "show-end-preview") {
        demoArea.innerHTML = `
            <div class="tut-demo-end">
                <div class="tde-badge">EASY</div>
                <div class="tde-title">out of sync.</div>
                <div class="tde-stats">
                    <span style="color:#00ffe0">acc: 72%</span>
                    <span style="color:#fff">best: ×8</span>
                    <span style="color:#ff8800">score: 1,850</span>
                </div>
                <div class="tde-wave">
                    ${Array.from({length:24}, (_,i) => {
                        const t = i % 3 === 2 ? "miss" : i % 3 === 0 ? "perfect" : "good";
                        const h = t === "miss" ? 35 : t === "good" ? 65 : 100;
                        const c = t === "miss" ? "#ff2d78" : t === "good" ? "#4a9fff" : "#00ffe0";
                        return `<div style="width:6px;height:${h}%;background:${c};border-radius:2px;opacity:0.75"></div>`;
                    }).join("")}
                </div>
            </div>`;
    }
}

function _highlightEl(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("tut-highlight");
}

function _clearHighlight() {
    document.querySelectorAll(".tut-highlight").forEach(e => e.classList.remove("tut-highlight"));
}

function _clearDemo() {
    clearInterval(_demoInterval);
    _demoInterval = null;
    if (_demoFrame) { cancelAnimationFrame(_demoFrame); _demoFrame = null; }
    const demoArea = _overlay?.querySelector("#tut-demo");
    if (demoArea) demoArea.innerHTML = "";
}

function _finish() {
    _active = false;
    _clearDemo();
    _clearHighlight();
    _overlay?.classList.add("hidden");
    _onDone?.();
}

// Called by next button
export function tutorialNext() {
    if (!_active) return;
    _step++;
    if (_step >= STEPS.length) { _finish(); return; }
    _showStep(_step);
}

// Called by skip button
export function tutorialSkip() {
    _finish();
}
