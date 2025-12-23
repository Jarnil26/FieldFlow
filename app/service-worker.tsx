/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = "field-sales-v1"
const OFFLINE_URL = "/offline"

// ⚠️ DO NOT cache "/" for auth apps
const STATIC_ASSETS = [
  "/offline",
  "/icon-192.jpg",
  "/icon-512.jpg",
  "/manifest.json",
]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // 🚫 NEVER handle navigation for auth or dashboard routes
  if (
    event.request.mode === "navigate" &&
    (
      url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/distributor") ||
      url.pathname.startsWith("/salesman") ||
      url.pathname.startsWith("/owner")
    )
  ) {
    // Let browser & Next.js handle it
    return
  }

  // 🌐 Navigation fallback (offline only)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (response) =>
            response ??
            new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            }),
        ),
      ),
    )
    return
  }

  // 📦 Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    }),
  )
})

export {}
