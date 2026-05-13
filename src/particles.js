// particles.js — burst particles, zero layout thrash
// Uses a single reused pool of elements, GPU-only transforms

const POOL_SIZE = 20;
let pool = [];
let container = null;
let ready = false;

export function initParticles() {
    if (ready) return;
    container = document.getElementById("particle-burst-layer");
    if (!container) {
        container = document.createElement("div");
        container.id = "particle-burst-layer";
        // Fixed to viewport so coords are always correct regardless of parent transforms
        container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden;";
        document.body.appendChild(container);
    }
    // Pre-create pool elements — no DOM creation during gameplay
    for (let i = 0; i < POOL_SIZE; i++) {
        const el = document.createElement("div");
        el.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;will-change:transform,opacity;display:none;";
        container.appendChild(el);
        pool.push({ el, free: true });
    }
    ready = true;
}

function acquire() {
    return pool.find(p => p.free) ?? null;
}

export function burstParticles(quality = "perfect") {
    if (!ready) initParticles();
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const count  = quality === "perfect" ? 12 : 6;
    const colors = quality === "perfect"
        ? ["#00ffe0","#00ccff","#ffffff","#80fff0"]
        : ["#4a9fff","#00ccff","#aaddff"];

    for (let i = 0; i < count; i++) {
        const slot = acquire();
        if (!slot) continue;
        slot.free = false;

        const ang  = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 50 + Math.random() * 75;
        const size = 3 + Math.random() * 4;
        const col  = colors[Math.floor(Math.random() * colors.length)];
        const dur  = 420 + Math.random() * 220;
        const el   = slot.el;

        // Set base position — no getBoundingClientRect, no layout read
        el.style.cssText = `
            position:absolute;border-radius:50%;pointer-events:none;
            will-change:transform,opacity;
            left:${cx}px;top:${cy}px;
            width:${size}px;height:${size}px;
            background:${col};
            box-shadow:0 0 ${size*2}px ${col};
            transform:translate(-50%,-50%);
            opacity:1;
            transition:none;
            display:block;
        `;

        // Use rAF to batch the animated state — avoids forced sync layout
        requestAnimationFrame(() => {
            el.style.transition = `transform ${dur}ms cubic-bezier(0.1,0.8,0.3,1), opacity ${dur}ms ease-out`;
            el.style.transform  = `translate(calc(-50% + ${Math.cos(ang)*dist}px), calc(-50% + ${Math.sin(ang)*dist}px)) scale(0.1)`;
            el.style.opacity    = "0";
        });

        setTimeout(() => {
            el.style.display = "none";
            slot.free = true;
        }, dur + 30);
    }
}

// ── Background particle canvas ────────────────────────────────
// Moved from inline HTML script
export function initBackgroundParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    let W, H, pts = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    function init() {
        pts = Array.from({ length: 35 }, () => ({
            x: rand(0, W), y: rand(0, H),
            vx: rand(-0.1, 0.1), vy: rand(-0.14, -0.03),
            r: rand(0.5, 1.6), a: rand(0.02, 0.12),
        }));
    }

    let _rgb = "0,255,224";
    let _rgbTick = 0;

    function draw() {
        ctx2d.clearRect(0, 0, W, H);
        // Only re-read CSS var every 60 frames — avoids expensive getComputedStyle each RAF
        if (++_rgbTick % 60 === 0) {
            _rgb = getComputedStyle(document.documentElement)
                .getPropertyValue("--accent-rgb").trim() || "0,255,224";
        }
        for (const p of pts) {
            p.x += p.vx; p.y += p.vy;
            if (p.y < -4) { p.y = H + 4; p.x = rand(0, W); }
            ctx2d.beginPath();
            ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx2d.fillStyle = `rgba(${_rgb},${p.a})`;
            ctx2d.fill();
        }
        requestAnimationFrame(draw);
    }

    resize(); init(); draw();
    window.addEventListener("resize", () => { resize(); init(); });
}
