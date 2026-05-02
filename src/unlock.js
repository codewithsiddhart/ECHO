// unlock.js — mid-game skin unlock notifications
import { getUnlockedSkin, getSkinThresholds } from "./skins.js";
import { getMode } from "./modes.js";

let _lastSkin = null;

export function unlockCheckInit() {
    _lastSkin = getUnlockedSkin(getMode().id).skin;
}

// Call after every best-streak update
export function unlockCheck(currentBest) {
    const mode    = getMode();
    const current = getUnlockedSkin(mode.id);
    if (current.skin !== _lastSkin) {
        _lastSkin = current.skin;
        _showBanner(current.label);
    }
    // Also check if we're about to cross next threshold — preview
    const thresholds = getSkinThresholds();
    const next = thresholds.find(t => t.streak > currentBest);
    if (next) {
        const remaining = next.streak - currentBest;
        if (remaining <= 3 && remaining > 0) _showProgressHint(next.label, remaining);
    }
}

function _showBanner(label) {
    let el = document.getElementById("unlock-banner");
    if (!el) {
        el = document.createElement("div");
        el.id = "unlock-banner";
        document.getElementById("app")?.appendChild(el);
    }
    el.innerHTML = `<span class="unlock-icon">✦</span> UNLOCKED: ${label} <span class="unlock-icon">✦</span>`;
    el.classList.remove("unlock-in");
    void el.offsetWidth;
    el.classList.add("unlock-in");
    el.style.display = "flex";
    setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => { el.style.display = "none"; el.style.opacity = ""; }, 500);
    }, 2500);
}

function _showProgressHint(nextLabel, remaining) {
    let el = document.getElementById("unlock-hint");
    if (!el) {
        el = document.createElement("div");
        el.id = "unlock-hint";
        document.getElementById("app")?.appendChild(el);
    }
    el.innerText = `${remaining} more → ${nextLabel}`;
    el.classList.remove("unlock-hint-pop");
    void el.offsetWidth;
    el.classList.add("unlock-hint-pop");
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 1800);
}
