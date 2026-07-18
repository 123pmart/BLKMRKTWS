const CACHE_VERSION = "2026-07-18-v8-admin-sales";
const STATIC_CACHE = `blackmarket-static-${CACHE_VERSION}`;
const MEDIA_CACHE = `blackmarket-media-${CACHE_VERSION}`;
const CACHE_PREFIX = "blackmarket-";

const SAFE_STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // A missing optional icon must not prevent a new worker from installing.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(SAFE_STATIC_ASSETS.map((asset) => cache.add(asset))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, MEDIA_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Mutations always go directly to the network. The worker never handles,
  // clones, retries, or caches order, admin, upload, or authentication writes.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API, auth, account, admin, and upload data is mutable or private. Keeping
  // these network-only prevents stale announcements, orders, and save results.
  if (isNetworkOnlyPath(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations are network-first and are never written to Cache Storage. This
  // keeps route refreshes and deployed HTML shells predictable.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // Versioned application code is network-first. A cached copy is only an
  // offline fallback; successful network responses replace it safely.
  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Product/catalog media under /assets is immutable at the CDN and therefore
  // safe for cache-first repeat visits. Only successful basic responses cache.
  if (request.destination === "image" || url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Mutable JSON and manifests prefer the network, with a cache fallback only
  // for safe public GET resources outside /api.
  if (request.destination === "manifest" || url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

// The app can display live notifications while an installed admin session is
// open. This handler is also ready for provider-delivered Web Push once VAPID
// subscriptions are configured on the server.
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text?.() || "" }; }
    await self.registration.showNotification(payload.title || "New wholesale order", {
      body: payload.body || "Open the admin inbox to review it.",
      icon: "/icon-192.png",
      badge: "/favicon.png",
      tag: "blackmarket-new-orders",
      data: { url: "/admin" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      existing.navigate("/admin");
      return existing.focus();
    }
    return clients.openWindow("/admin");
  }));
});

function isNetworkOnlyPath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/api/account/") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/order-preview") ||
    pathname.startsWith("/api/order-pdf") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/admin") ||
    pathname.includes("upload") ||
    pathname.includes("auth") ||
    pathname.includes("order")
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await safelyCacheResponse(cacheName, request, response);
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    await safelyCacheResponse(cacheName, request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function safelyCacheResponse(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return;
  try {
    // Clone once before Cache Storage consumes its body. Cache failures are
    // isolated so the untouched network response still reaches the page.
    const cacheCopy = response.clone();
    const cache = await caches.open(cacheName);
    await cache.put(request, cacheCopy);
  } catch (error) {
    console.warn("Optional response caching failed:", error);
  }
}
