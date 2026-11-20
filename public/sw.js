const prefix = 'tamago-shell-';
const scope = self.registration.scope;
const shell = new URL('index.html', scope).href;
const staticFiles = ['manifest.webmanifest', 'touch.png', 'icon-192.png', 'icon-512.png'];
const activeCache = prefix + build; // build is injected by Vite.

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(shell, {cache: 'reload'});
    if (!response.ok) throw new Error('Shell non disponibile');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map(match => match[1]);
    const cache = await caches.open(activeCache);
    await cache.addAll([...staticFiles, ...assets].map(path => new Request(new URL(path, scope), {cache:'reload'})));
    await cache.put(shell, response);
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
  event.respondWith((async () => {
    const key = request.mode === 'navigate' ? shell : request;
    return (await (await caches.open(activeCache)).match(key)) ?? fetch(request);
  })());
});
