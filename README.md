# ECHO — Rhythm Game

A browser-based rhythm game built with vanilla JS + Web Audio API. Zero dependencies.

> "A rhythm that learns you... then betrays you."

---

## What was fixed in this version (v4 → v4.1)

All 9 issues from the pre-launch audit have been resolved:

| # | Issue | Fix |
|---|-------|-----|
| 1 | `taunt-overlay` had no HTML element — could render under other layers | Added `<div id="taunt-overlay">` inside `#app` in `index.html` |
| 2 | `history.js` `modeColors` had duplicate legacy keys (`feel`, `trust`, `forget`, `dissolve`) | Cleaned to only real mode IDs (`easy`, `medium`, `hard`, `impossible`) |
| 3 | `unlock-banner` and `unlock-hint` had no HTML elements — same stacking problem as taunt | Added both divs inside `#app` in `index.html` |
| 4 | Share card called live `getState()` — sharing after a retry showed new run's data | `game.js` now freezes `_endSnapshot` at the moment `_onGameEnd` fires; `shareCard.js` reads from it |
| 5 | No Open Graph / Twitter meta tags — game link showed nothing when shared on Discord/Twitter | Added full OG + Twitter card meta tags to `index.html` |
| 6 | Audio init could silently fail on iOS Safari — game played silently with no feedback | `initAudio()` now catches failures, sets `_audioFailed` flag, shows `#audio-failed-banner` |
| 7 | No visual indicator for unseen achievements on the BESTS nav button | Pink notification dot appears on BESTS when unseen earned achievements exist; clears on open |
| 8 | Only 5 hardcoded placeholder `PLAYER_NAMES` — obviously fake on itch.io | Expanded to 40 names: mix of gamer tags, casual names, and absurd ones |
| 9 | `offline.html` had minimal content with no game identity | Rebuilt with full ECHO branding, title, proper offline instructions |

---

## Running locally

```bash
# Any static server works — do NOT open index.html directly (ES modules need HTTP)
npx serve .                    # Node
python3 -m http.server 8080    # Python
```

Then open `http://localhost:8080`.

---

## Deploying to itch.io

### Step 1 — Build your zip

itch.io hosts static files. Zip your game folder:

```bash
cd ..
zip -r ECHO.zip echo_v4_fixed/ --exclude "*.DS_Store" --exclude "*/.git/*"
```

### Step 2 — Upload to itch.io

1. Go to https://itch.io/game/new
2. Set **Kind of project** → HTML
3. Under **Uploads**, upload your `ECHO.zip`
4. Check **This file will be played in the browser**
5. Set **Viewport dimensions** → `480 × 860` (portrait, mobile-friendly)
6. Enable the **Fullscreen button**

### Step 3 — Update the OG image URL

Edit `index.html` once you have your itch.io cover image URL:
```html
<meta property="og:image" content="https://img.itch.zone/YOUR_ACTUAL_BANNER.png">
<meta name="twitter:image" content="https://img.itch.zone/YOUR_ACTUAL_BANNER.png">
```

### Step 4 — Set your itch.io page details

- **Title**: ECHO
- **Short description**: A rhythm game that learns you — then betrays you.
- **Tags**: rhythm, music, minimalist, browser, arcade, mobile
- **Cover image**: 630×500px min, dark background with ECHO title in accent color (#00ffe0)

### Step 5 — Fix the service worker path for itch.io

itch.io serves games in an iframe. The SW registration uses an absolute path which fails inside an iframe. Change it at the bottom of `index.html`:

```js
// BEFORE (absolute — breaks in itch.io iframe):
navigator.serviceWorker.register("/sw.js")

// AFTER (relative — works everywhere):
navigator.serviceWorker.register("sw.js")
```

The game works fine without the SW; this just enables offline caching.

---

## Setting up Supabase (online leaderboard)

The leaderboard is optional. Without it the game works fully offline.

### 1. Create a free Supabase project
Go to https://supabase.com → New Project → choose name, region, password.

### 2. Create the scores table

In Supabase → **SQL Editor** → run:

```sql
create table echo_scores (
  id         bigserial primary key,
  name       text        not null check (char_length(name) <= 24),
  streak     int         not null default 0,
  score      int         not null default 0,
  accuracy   text,
  mode       text,
  daily      boolean     default false,
  played_at  timestamptz default now()
);

alter table echo_scores enable row level security;

create policy "anyone can read scores"
  on echo_scores for select using (true);

create policy "anyone can insert scores"
  on echo_scores for insert with check (true);
```

### 3. Get your API keys

Supabase → **Project Settings** → **API**:
- **Project URL** — `https://xyzabc.supabase.co`
- **anon / public key** — the long JWT string

### 4. Add them to the game

Open `src/config.js`:

```js
export const SUPABASE_URL      = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGci...YOUR-ANON-KEY...";
```

---

## Deploying to a live URL (Vercel / Netlify / GitHub Pages)

A live URL also allows the game to be installed as a PWA on mobile.

### Vercel (recommended)
```bash
npm i -g vercel
vercel .
```

### Netlify
Drag the `echo_v4_fixed/` folder onto https://app.netlify.com/drop

### GitHub Pages
```bash
git init && git add . && git commit -m "echo v4.1"
# Push to GitHub → Settings → Pages → Deploy from branch main /root
```

After deploying, update `og:url` in `index.html`:
```html
<meta property="og:url" content="https://YOUR-ACTUAL-URL.vercel.app">
```

---

## Future roadmap — what to build next

Roughly in priority order:

### High priority
- **Server-side score validation** — add a Supabase Edge Function that sanity-checks scores before inserting. Currently anyone can POST any number.
- **Daily leaderboard UI** — daily scores have `daily: true` in the DB but there's no "today's top scores" on the daily end screen. That one feature makes the daily mode feel competitive.
- **Account / name protection** — Supabase Auth (email + password) would let players own their name across sessions and devices.

### Medium priority
- **Per-category audio mute** — UI to keep music but mute hit sounds (or vice versa). The audio engine already supports separated gain nodes.
- **Haptic patterns** — distinct vibration patterns for perfect vs good vs miss. `haptics.js` is ready; it just needs wiring.
- **Ghost ring mid-game** — the ghost data is recorded but only shown on the end waveform. Rendering a faint secondary ring during the run showing your best-run position would be a strong visual.
- **Streak milestone explosions** — at ×10, ×25, ×50, trigger a full-screen particle burst. The particle system exists; it just needs threshold checks.

### Polish / low priority
- **More taunts** — the pool in `ui.js` thins out after 30 minutes. Aim for 40+ including mode-specific ones.
- **Mobile share sheet** — use `navigator.share({ files: [...] })` on mobile for the native iOS/Android share sheet instead of a download prompt.
- **Reduced motion** — add `@media (prefers-reduced-motion: reduce)` overrides for the ring pulse and particles.
- **Tutorial skip memory** — store `echo_tutorial_done` in localStorage so returning players never see the tutorial again.
- **Analytics** — a single `navigator.sendBeacon` on game end with `{ mode, streak, result }` gives you player drop-off data with zero libraries.

---

## File structure

```
echo_v4_fixed/
├── index.html          — HTML shell (OG tags, DOM anchors for overlays)
├── style.css           — all styles (nav dot, audio banner, taunt z-index)
├── manifest.json       — PWA manifest
├── sw.js               — service worker — use relative path for itch.io
├── offline.html        — branded offline fallback page
├── icon-192.png        — PWA icon
├── icon-512.png        — PWA icon
└── src/
    ├── config.js       — ← SUPABASE KEYS GO HERE
    ├── main.js         — entry, routing, panels, achievement dot
    ├── game.js         — beat loop, input, hit logic, _endSnapshot
    ├── audio.js        — music engine, audio failure handling
    ├── ui.js           — HUD, flow bar, taunt overlay
    ├── modes.js        — mode definitions
    ├── constants.js    — timing/flow constants, 40 PLAYER_NAMES
    ├── history.js      — run history (modeColors use real IDs only)
    ├── achievements.js — achievement earn/seen tracking
    ├── leaderboard.js  — Supabase REST client
    ├── shareCard.js    — canvas share image (reads _endSnapshot)
    ├── unlock.js       — skin unlock notifications
    ├── daily.js        — seeded daily mode
    ├── replay.js       — end-screen waveform charts
    ├── score.js        — combo multiplier
    ├── skins.js        — skin unlock thresholds
    ├── particles.js    — particle burst system
    ├── idle.js         — idle orbit animation
    ├── ghost.js        — best-run ghost
    ├── players.js      — simulated leaderboard names
    ├── rhythm.js       — rhythm challenge mode
    ├── tutorial.js     — 9-step tutorial
    ├── haptics.js      — mobile vibration
    ├── shake.js        — screen shake
    ├── facts.js        — facts strip
    └── mirror.js       — end-screen message generator
```

---

## Keyboard shortcuts

| Key         | Action                      |
|-------------|-----------------------------|
| Space/Enter | Tap beat                    |
| 1 – 7       | Select mode on mode screen  |
| R           | Open records panel          |
| ESC         | Close panel / resume game   |
| P           | Pause / resume              |

---

## Known limits

- **Daily timezone** — seed uses local date. Players near midnight get different seeds. Fix: use UTC date string.
- **Leaderboard trust** — no server-side validation. Add a Supabase Edge Function before going viral.
- **SW cache busting** — after shipping updates, bump `CACHE = "echo-v5"` in `sw.js` to force refetch on returning visitors.
- **itch.io SW path** — must use relative `"sw.js"` not absolute `"/sw.js"` inside the itch.io iframe.
