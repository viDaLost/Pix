// «Бестиарий Велена» caches under its own prefix; the caches of the previous game «Сияние» (pix-forge-*) go on activation.
const CACHE = 'pix-bestiary-v11';
const BASE = new URL('./', self.location.href);
const INDEX = new URL('./index.html', BASE).href;
const FILES = ['./', './index.html', './styles.css', './src/app.js', './src/progress.js', './src/bestiary.js', './src/rules.js', './src/lore.js', './src/content-data.js', './src/rng.js', './src/guide.js', './src/notices.js', './src/store.js', './src/scriptorium-scene.js', './src/ambience.js', './src/audio.js', './src/icons.js', './src/characters.js', './src/character-rig.js', './src/motion.js', './src/pixel.js', './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/fonts/cormorant-garamond-cyrillic-600-normal.woff2', './assets/fonts/cormorant-garamond-latin-600-normal.woff2', './assets/fonts/cormorant-garamond-cyrillic-700-normal.woff2', './assets/fonts/cormorant-garamond-latin-700-normal.woff2', './assets/fonts/manrope-cyrillic-wght-normal.woff2', './assets/fonts/manrope-latin-wght-normal.woff2'].map(path => new URL(path, BASE).href);
// The cache name changes with every build, so a cached file is always the one of this version.
// cache:'reload' skips the HTTP cache, which could otherwise mix files of the previous deploy into the new set.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('pix-bestiary-') || key.startsWith('pix-forge-')) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Cache first: the game starts offline and never waits for the network; only missing files are fetched.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = event.request.mode === 'navigate' ? await cache.match(INDEX) : await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && FILES.includes(url.origin + url.pathname)) await cache.put(url.origin + url.pathname, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
