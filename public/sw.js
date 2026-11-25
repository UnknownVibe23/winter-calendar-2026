importScripts(self.registration.scope + 'sw-core.js');

const SWCore = self.SWCore;
const SW_VERSION = 'v1';
const ASSET_CACHE = SWCore.assetCacheName(SW_VERSION);
const SHELL_CACHE = SWCore.shellCacheName(SW_VERSION);

function routingContext() {
  return {
    origin: self.location.origin,
    basePath: SWCore.basePathFromScope(self.registration.scope),
  };
}

async function precache() {
  const context = routingContext();
  const shellCache = await caches.open(SHELL_CACHE);
  const shellUrls = SWCore.shellPrecacheUrls(context.origin, context.basePath);
  await Promise.all(shellUrls.map((url) => shellCache.add(url).catch(() => undefined)));
  const indexResponse = await fetch(context.origin + context.basePath + 'index.html');
  const html = await indexResponse.text();
  const assetUrls = SWCore.extractAssetUrls(html, context.origin, context.basePath);
  const assetCache = await caches.open(ASSET_CACHE);
  await Promise.all(assetUrls.map((url) => assetCache.add(url).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const orphans = SWCore.selectOrphanCaches(names, SW_VERSION);
      await Promise.all(orphans.map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const cache = await caches.open(ASSET_CACHE);
  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const strategy = SWCore.routeRequest(event.request, routingContext());
  if (strategy === SWCore.STRATEGY_PASSTHROUGH) {
    return;
  }
  event.respondWith(
    strategy === SWCore.STRATEGY_CACHE_FIRST
      ? cacheFirst(event.request)
      : networkFirst(event.request),
  );
});
