// idle.js — idle animation, fully reset-safe

let idleTimer  = null;
let orbitFrame = null;
let orbitDots  = [];
let isIdle     = false;
let _active    = false;
let orbitT     = 0; // reset each game

export function initIdle() {
    orbitT  = 0;
    _active = true;
    _resetTimer();
}

export function stopIdle() {
    _active = false;
    _clearAll();
}

export function resetIdle() {
    if (!_active) return;
    if (isIdle) _exitIdle();
    _resetTimer();
}

function _resetTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(_enterIdle, 4000);
}

function _clearAll() {
    clearTimeout(idleTimer);
    cancelAnimationFrame(orbitFrame);
    if (isIdle) _exitIdle();
}

function _enterIdle() {
    if (!_active) return;
    // Guard: don't double-enter
    if (isIdle) return;
    isIdle = true;
    const circle = document.getElementById("circle");
    const ring   = document.getElementById("ring");
    if (circle) circle.classList.add("idle-breathe");
    if (ring)   ring.classList.add("idle-breathe-ring");
    _spawnOrbitDots();
}

function _exitIdle() {
    isIdle = false;
    const circle = document.getElementById("circle");
    const ring   = document.getElementById("ring");
    if (circle) circle.classList.remove("idle-breathe");
    if (ring)   ring.classList.remove("idle-breathe-ring");
    cancelAnimationFrame(orbitFrame);
    orbitFrame = null;
    orbitDots.forEach(d => d.el?.remove());
    orbitDots = [];
}

function _spawnOrbitDots() {
    // Always clean up first — prevents double spawn
    orbitDots.forEach(d => d.el?.remove());
    orbitDots = [];
    cancelAnimationFrame(orbitFrame);

    const layer = document.getElementById("game");
    if (!layer) return;

    const N = 6;
    for (let i = 0; i < N; i++) {
        const el = document.createElement("div");
        el.style.cssText = `position:absolute;width:5px;height:5px;border-radius:50%;
            background:var(--accent);box-shadow:0 0 8px var(--accent);
            pointer-events:none;left:50%;top:50%;will-change:transform;opacity:0;
            transition:opacity 0.3s ease;`;
        layer.appendChild(el);
        orbitDots.push({ el, offset: (i / N) * Math.PI * 2 });
        // stagger fade-in without setTimeout soup — use CSS delay
        el.style.transitionDelay = (i * 80) + "ms";
        requestAnimationFrame(() => { el.style.opacity = "0.55"; });
    }
    _animateOrbit();
}

function _animateOrbit() {
    orbitT += 0.012;
    const r = 92;
    for (const d of orbitDots) {
        const ang = d.offset + orbitT;
        d.el.style.transform = `translate(calc(-50% + ${Math.cos(ang)*r}px), calc(-50% + ${Math.sin(ang)*r}px))`;
    }
    orbitFrame = requestAnimationFrame(_animateOrbit);
}
