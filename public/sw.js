self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Pass-through fetch handler keeps network behavior unchanged
// while satisfying installability requirements for browsers.
self.addEventListener("fetch", () => {})
