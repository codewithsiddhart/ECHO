// sw.js — minimal service worker for ECHO
// Cache-first for game assets, network-first for API
const CACHE = "echo-v3";
const ASSETS = ["/","index.html","style.css","manifest.json","offline.html"];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(ASSETS).catch(() => {})) // non-fatal if some fail
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const url = e.request.url;
    // Network-only for Supabase API
    if (url.includes("supabase.co")) {
        e.respondWith(
            fetch(e.request).catch(() =>
                new Response(JSON.stringify([]), { headers: { "Content-Type":"application/json" } })
            )
        );
        return;
    }
    // Cache-first for everything else
    const isNavigation = e.request.mode === "navigate";
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res.ok && e.request.method === "GET") {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => {
                if (cached) return cached;
                if (isNavigation) return caches.match("offline.html");
                return new Response("offline", { status: 503 });
            });
        })
    );
});
