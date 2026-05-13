// skins.js — circle skin unlocks
// FIX: applySkin guards against null mode (called before setMode on first load)

import { getMode, GAME_MODES } from "./modes.js";

const THRESHOLDS = [
    { streak: 0,  skin: "default",     label: "DEFAULT"     },
    { streak: 5,  skin: "double-ring", label: "DOUBLE RING" },
    { streak: 10, skin: "arc-spin",    label: "ARC SPIN"    },
    { streak: 20, skin: "halo",        label: "HALO"        },
    { streak: 35, skin: "nova",        label: "NOVA"        },
];

export function getUnlockedSkin(modeId) {
    if (!modeId) return THRESHOLDS[0];
    const best = parseInt(localStorage.getItem("echo_best_" + modeId) || "0");
    let skin = THRESHOLDS[0];
    for (const t of THRESHOLDS) { if (best >= t.streak) skin = t; }
    return skin;
}

export function applySkin(circle, ring, ringOuter) {
    // FIX: guard — getMode() may return undefined if called before setMode
    const mode = getMode?.();
    if (!mode || !circle) return THRESHOLDS[0];
    const skin = getUnlockedSkin(mode.id);
    circle.dataset.skin = skin.skin;
    return skin;
}

export function skinBadge(modeId) {
    const s = getUnlockedSkin(modeId);
    return s.skin === "default" ? "" : `<span class="skin-badge">${s.label}</span>`;
}

export function getSkinThresholds() { return THRESHOLDS; }
