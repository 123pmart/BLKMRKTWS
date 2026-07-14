const CACHE_NAME = "blackmarket-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles-v3.css",
  "/app.js",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/assets/install-step1.png",
  "/assets/install-step2.png",
  "/assets/install-step3.png",
  "/assets/install-step4.png",
  "/assets/install-step5.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});


self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;


  const url = new URL(request.url);


  // Never cache API/database requests
  if (
    url.pathname.includes("/api") ||
    url.hostname.includes("supabase")
  ) {
    event.respondWith(
      fetch(request)
    );
    return;
  }


  // Images: cache first
  if (
    request.destination === "image" ||
    url.pathname.includes("/assets/")
  ) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          return cached || fetch(request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          });
        })
    );
    return;
  }


  // CSS / JS: stale while revalidate
  if (
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, response.clone());
                });

              return response;
            });

          return cached || networkFetch;
        })
    );
    return;
  }


  // Everything else: network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});
