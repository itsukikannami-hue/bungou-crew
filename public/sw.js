/* ブンゴウクルー PWA: network-first, no offline storage of authenticated data. */
self.addEventListener("install", () => {
    self.skipWaiting();
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  // Requests are handled by the browser network; no fetch interception or cache.