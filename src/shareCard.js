// shareCard.js — canvas share card using replay waveform
import { getEndSnapshot } from "./game.js";
import { getMode } from "./modes.js";

export function createShareCard(canvas) {
    const W = 900, H = 500;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Use the frozen end-of-run snapshot; fall back to live state only if unavailable
    const snap   = getEndSnapshot();
    const mode   = getMode();
    const streak = snap?.streak ?? 0;
    const totalClicks   = snap?.totalClicks ?? 0;
    const correctClicks = snap?.correctClicks ?? 0;
    const accuracy = snap?.accuracy
        ?? (totalClicks ? Math.floor((correctClicks / totalClicks) * 100) : 0);
    const color  = snap?.color ?? mode?.color ?? "#00ffe0";

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#04060a");
    bg.addColorStop(1, "#0b1222");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Scanlines overlay
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

    // Glow blob
    const glow = ctx.createRadialGradient(W * 0.75, H * 0.35, 10, W * 0.75, H * 0.35, 280);
    glow.addColorStop(0, color + "28");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = color;
    ctx.font = "bold 72px 'Arial Black', Arial";
    ctx.fillText("ECHO", 52, 100);

    // Mode badge
    ctx.fillStyle = color + "22";
    roundRect(ctx, 52, 120, 180, 36, 6);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "bold 14px Arial";
    ctx.fillText(mode?.label ?? "UNKNOWN", 68, 144);

    // Stats
    const stats = [
        { label: "BEST STREAK", val: "×" + streak },
        { label: "ACCURACY",    val: accuracy + "%" },
        { label: "TOTAL TAPS",  val: totalClicks },
    ];
    ctx.textAlign = "left";
    stats.forEach((s, i) => {
        const x = 52 + i * 240;
        const y = 230;
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.font = "11px Arial";
        ctx.fillText(s.label, x, y);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 48px Arial";
        ctx.fillText(s.val, x, y + 58);
    });

    // Streak bar
    const barX = 52, barY = 350, barH = 12, maxW = W - 104;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, barX, barY, maxW, barH, 6);
    ctx.fill();
    const pct = Math.min(streak / (mode?.winStreak ?? 20), 1);
    if (pct > 0) {
        const barGrad = ctx.createLinearGradient(barX, 0, barX + maxW * pct, 0);
        barGrad.addColorStop(0, color);
        barGrad.addColorStop(1, color + "88");
        ctx.fillStyle = barGrad;
        roundRect(ctx, barX, barY, maxW * pct, barH, 6);
        ctx.fill();
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "13px Arial";
    ctx.fillText("echo — a rhythm that learns you", 52, H - 28);
    ctx.textAlign = "right";
    ctx.fillStyle = color + "88";
    ctx.fillText("share your run", W - 52, H - 28);

    return canvas.toDataURL("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
