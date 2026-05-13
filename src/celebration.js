// celebration.js — win confetti burst
// Canvas-based, self-cleaning, no dependencies

let _canvas = null;
let _ctx    = null;
let _pieces = [];
let _raf    = null;
let _celebrating = false;

export function triggerWinCelebration() {
    // Guard: don't stack if already celebrating or end screen is visible
    if (_celebrating) return;
    const endScreen = document.getElementById("end-screen");
    if (endScreen && !endScreen.classList.contains("hidden")) return;

    _celebrating = true;
    _ensureCanvas();
    _pieces = [];
    const colors = ["#00ffe0","#00ccff","#ff2d78","#ffd700","#ff8800","#ffffff","#a0ff80"];
    const W = window.innerWidth, H = window.innerHeight;

    // Spawn 120 confetti pieces from top-center
    for (let i = 0; i < 120; i++) {
        const angle = (Math.random() * 160 - 80) * (Math.PI / 180); // fan shape downward
        const speed = 4 + Math.random() * 8;
        _pieces.push({
            x:   W / 2 + (Math.random() - 0.5) * 120,
            y:   H * 0.3,
            vx:  Math.sin(angle) * speed,
            vy:  -Math.cos(angle) * speed * 0.6,
            w:   4 + Math.random() * 6,
            h:   8 + Math.random() * 10,
            rot: Math.random() * 360,
            rotV: (Math.random() - 0.5) * 8,
            col: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0,
            decay: 0.008 + Math.random() * 0.006,
        });
    }

    if (_raf) cancelAnimationFrame(_raf);
    _animate();
    // Auto-clear flag after celebration lifetime (120 pieces × ~0.014 decay avg ≈ 3.5s)
    setTimeout(() => { _celebrating = false; }, 4000);

    // Big win text
    const txt = document.createElement("div");
    txt.className = "win-flash-text";
    txt.innerText = "PERFECT SYNC";
    document.body.appendChild(txt);
    setTimeout(() => txt.remove(), 2200);

    // Flash the whole screen briefly
    const flash = document.createElement("div");
    flash.style.cssText = "position:fixed;inset:0;background:rgba(0,255,224,0.12);z-index:2000;pointer-events:none;";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

function _ensureCanvas() {
    if (_canvas) return;
    _canvas = document.createElement("canvas");
    _canvas.style.cssText = "position:fixed;inset:0;z-index:1999;pointer-events:none;";
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    document.body.appendChild(_canvas);
    _ctx = _canvas.getContext("2d");
    window.addEventListener("resize", () => {
        if (_canvas) { _canvas.width = window.innerWidth; _canvas.height = window.innerHeight; }
    });
}

function _animate() {
    if (!_ctx) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    const H = _canvas.height;

    _pieces = _pieces.filter(p => p.life > 0);
    if (_pieces.length === 0) return;

    for (const p of _pieces) {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.25; // gravity
        p.vx  *= 0.99; // air resistance
        p.rot += p.rotV;
        p.life -= p.decay;

        _ctx.save();
        _ctx.globalAlpha = Math.max(0, p.life);
        _ctx.translate(p.x, p.y);
        _ctx.rotate(p.rot * Math.PI / 180);
        _ctx.fillStyle = p.col;
        _ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        _ctx.restore();
    }

    _raf = requestAnimationFrame(_animate);
}
