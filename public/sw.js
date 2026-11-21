const prefix = 'tamago-shell-';
const scope = self.registration.scope;
const shell = new URL('index.html', scope).href;
const staticFiles = ['manifest.webmanifest', 'touch.png', 'icon-192.png', 'icon-512.png', 'the-fly-has-ai.mp3', 'the-fly-has-an-upgrade.mp3', 'the-room-has-a-space-bar.mp3', 'the-fly-is-you.mp3', 'infinite-loop.mp3'];
const activeCache = prefix + build; // build is injected by Vite.

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(shell, {cache: 'reload'});
    if (!response.ok) throw new Error('Game shell unavailable');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map(match => match[1]);
    const cache = await caches.open(activeCache);
    await cache.addAll([...staticFiles, ...assets].map(path => new Request(new URL(path, scope), {cache:'reload'})));
    await cache.put(shell, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith(prefix) && key !== activeCache).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  if (new URL(request.url).pathname===new URL('api/scores',scope).pathname) return;
  event.respondWith((async () => {
    const cache = await caches.open(activeCache);
    if (request.mode === 'navigate') {
      try {
        const fresh = await fetch(request, {cache: 'no-cache'});
        if (fresh.ok) return fresh;
        return (await cache.match(shell)) ?? fresh;
      } catch (error) {
        const saved = await cache.match(shell);
        if (saved) return saved;
        throw error;
      }
    }
    return (await cache.match(request)) ?? fetch(request);
  })());
});
