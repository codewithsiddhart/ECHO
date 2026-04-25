// ============================================================
// shake.js — screen shake utility
// ============================================================

const app = document.getElementById("app");

export function shake(intensity = 1) {
    if (!app) return;
    app.classList.remove("shake-active");
    void app.offsetWidth; // reflow to restart
    app.style.setProperty("--shake-x", (intensity * 6) + "px");
    app.style.setProperty("--shake-y", (intensity * 4) + "px");
    app.classList.add("shake-active");
    setTimeout(() => app.classList.remove("shake-active"), 220);
}