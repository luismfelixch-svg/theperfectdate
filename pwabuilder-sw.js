// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded 🎉`);

  const offlineFallbackPage = "offline.html";
  const offlineCacheName = "offline-fallback-cache";

  // Precache the offline page during installation
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(offlineCacheName).then(cache => {
        return cache.add(offlineFallbackPage);
      })
    );
  });

  // Enable navigation preload if supported
  if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
  }

  // 1. Strategy for Pages (Navigation)
  // Use NetworkFirst, but fall back to the offline page if network fails.
  const pageStrategy = new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.plugins.NetworkErrorPlugin({
        handler: async () => {
          const cache = await caches.open(offlineCacheName);
          return await cache.match(offlineFallbackPage);
        }
      })
    ],
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    pageStrategy
  );

  // 2. Strategy for Assets (CSS, JS)
  // Use StaleWhileRevalidate to serve from cache and update in the background.
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'asset-cache',
    })
  );

  // 3. Strategy for Images
  // Use CacheFirst with expiration to serve images quickly.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.plugins.ExpirationPlugin({
          maxEntries: 60, // Max 60 images
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Allows the new service worker to take over immediately.
  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

} else {
  console.log(`Workbox didn't load 😬`);
}