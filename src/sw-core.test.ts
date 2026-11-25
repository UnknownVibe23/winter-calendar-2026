import { describe, expect, it } from 'vitest';
import '../public/sw-core.js';

interface SWCoreApi {
  STRATEGY_CACHE_FIRST: string;
  STRATEGY_NETWORK_FIRST: string;
  STRATEGY_PASSTHROUGH: string;
  basePathFromScope(scope: string): string;
  isHashedAssetPath(pathname: string, basePath: string): boolean;
  isContentBundlePath(pathname: string, basePath: string): boolean;
  isAppShellPath(pathname: string, basePath: string): boolean;
  isIconPath(pathname: string, basePath: string): boolean;
  routeRequest(
    request: { url: string; method: string },
    context: { origin: string; basePath: string },
  ): string;
  assetCacheName(version: string): string;
  shellCacheName(version: string): string;
  cacheNamesFor(version: string): string[];
  isOrphanCache(name: string, version: string): boolean;
  selectOrphanCaches(names: string[], version: string): string[];
  shellPrecacheUrls(origin: string, basePath: string): string[];
  extractAssetUrls(html: string, origin: string, basePath: string): string[];
}

const SWCore = (globalThis as unknown as { SWCore: SWCoreApi }).SWCore;

const ORIGIN = 'https://unknownvibe23.github.io';
const BASE = '/winter-calendar-2026/';
const CONTEXT = { origin: ORIGIN, basePath: BASE };

function get(url: string, method = 'GET') {
  return { url, method };
}

describe('basePathFromScope', () => {
  it('extracts the path from an absolute scope URL and keeps the trailing slash', () => {
    expect(SWCore.basePathFromScope(`${ORIGIN}${BASE}`)).toBe(BASE);
    expect(SWCore.basePathFromScope(`${ORIGIN}/`)).toBe('/');
  });

  it('accepts a bare path and appends a missing trailing slash', () => {
    expect(SWCore.basePathFromScope(BASE)).toBe(BASE);
    expect(SWCore.basePathFromScope('/winter-calendar-2026')).toBe(BASE);
    expect(SWCore.basePathFromScope('')).toBe('/');
  });
});

describe('isHashedAssetPath', () => {
  it('accepts direct children of assets/ with an 8+ char hash suffix', () => {
    expect(SWCore.isHashedAssetPath(`${BASE}assets/index-a1B2c3D4.js`, BASE)).toBe(true);
    expect(SWCore.isHashedAssetPath(`${BASE}assets/index-a1B2c3D4.css`, BASE)).toBe(true);
    expect(SWCore.isHashedAssetPath(`${BASE}assets/chunk-aB-_9xYz12.js`, BASE)).toBe(true);
  });

  it('rejects unhashed names, short hashes, nested paths and other directories', () => {
    expect(SWCore.isHashedAssetPath(`${BASE}assets/index.js`, BASE)).toBe(false);
    expect(SWCore.isHashedAssetPath(`${BASE}assets/index-a1B2c3D.js`, BASE)).toBe(false);
    expect(SWCore.isHashedAssetPath(`${BASE}assets/nested/index-a1B2c3D4.js`, BASE)).toBe(false);
    expect(SWCore.isHashedAssetPath(`${BASE}assets/`, BASE)).toBe(false);
    expect(SWCore.isHashedAssetPath(`/other/assets/index-a1B2c3D4.js`, BASE)).toBe(false);
    expect(SWCore.isHashedAssetPath(`${BASE}content.enc`, BASE)).toBe(false);
  });
});

describe('path classification predicates', () => {
  it('detects the encrypted content bundle only at its exact path', () => {
    expect(SWCore.isContentBundlePath(`${BASE}content.enc`, BASE)).toBe(true);
    expect(SWCore.isContentBundlePath(`${BASE}content.enc.bak`, BASE)).toBe(false);
    expect(SWCore.isContentBundlePath(`/content.enc`, BASE)).toBe(false);
  });

  it('detects the app shell: bare base, index.html and the manifest', () => {
    expect(SWCore.isAppShellPath(BASE, BASE)).toBe(true);
    expect(SWCore.isAppShellPath(`${BASE}index.html`, BASE)).toBe(true);
    expect(SWCore.isAppShellPath(`${BASE}manifest.webmanifest`, BASE)).toBe(true);
    expect(SWCore.isAppShellPath(`${BASE}content.enc`, BASE)).toBe(false);
    expect(SWCore.isAppShellPath(`${BASE}icon.svg`, BASE)).toBe(false);
  });

  it('detects icons: the SVG favicon and everything under icons/', () => {
    expect(SWCore.isIconPath(`${BASE}icon.svg`, BASE)).toBe(true);
    expect(SWCore.isIconPath(`${BASE}icons/icon-192.png`, BASE)).toBe(true);
    expect(SWCore.isIconPath(`${BASE}icons/maskable-512.png`, BASE)).toBe(true);
    expect(SWCore.isIconPath(`${BASE}manifest.webmanifest`, BASE)).toBe(false);
    expect(SWCore.isIconPath(`${BASE}icons-other/icon.png`, BASE)).toBe(false);
  });
});

describe('routeRequest', () => {
  it('routes same-origin hashed assets to cache-first', () => {
    expect(SWCore.routeRequest(get(`${ORIGIN}${BASE}assets/index-a1B2c3D4.js`), CONTEXT)).toBe(
      SWCore.STRATEGY_CACHE_FIRST,
    );
  });

  it('routes the content bundle, app shell and icons to network-first', () => {
    for (const path of [
      `${BASE}content.enc`,
      BASE,
      `${BASE}index.html`,
      `${BASE}manifest.webmanifest`,
      `${BASE}icon.svg`,
      `${BASE}icons/icon-512.png`,
    ]) {
      expect(SWCore.routeRequest(get(`${ORIGIN}${path}`), CONTEXT)).toBe(
        SWCore.STRATEGY_NETWORK_FIRST,
      );
    }
  });

  it('ignores the query string when routing', () => {
    expect(SWCore.routeRequest(get(`${ORIGIN}${BASE}?refresh=1`), CONTEXT)).toBe(
      SWCore.STRATEGY_NETWORK_FIRST,
    );
    expect(
      SWCore.routeRequest(get(`${ORIGIN}${BASE}assets/index-a1B2c3D4.js?v=2`), CONTEXT),
    ).toBe(SWCore.STRATEGY_CACHE_FIRST);
  });

  it('passes non-GET requests through untouched, even for cacheable paths', () => {
    expect(SWCore.routeRequest(get(`${ORIGIN}${BASE}content.enc`, 'POST'), CONTEXT)).toBe(
      SWCore.STRATEGY_PASSTHROUGH,
    );
    expect(
      SWCore.routeRequest(get(`${ORIGIN}${BASE}assets/index-a1B2c3D4.js`, 'HEAD'), CONTEXT),
    ).toBe(SWCore.STRATEGY_PASSTHROUGH);
  });

  it('passes cross-origin requests through untouched', () => {
    expect(SWCore.routeRequest(get('https://cdn.example.com/lib-a1B2c3D4.js'), CONTEXT)).toBe(
      SWCore.STRATEGY_PASSTHROUGH,
    );
    expect(SWCore.routeRequest(get('https://cdn.example.com/content.enc'), CONTEXT)).toBe(
      SWCore.STRATEGY_PASSTHROUGH,
    );
  });

  it('passes everything else through: other same-origin paths and unhashed assets', () => {
    for (const path of [
      `${BASE}favicon.ico`,
      `${BASE}robots.txt`,
      `${BASE}assets/index.js`,
      '/some/other/page.html',
    ]) {
      expect(SWCore.routeRequest(get(`${ORIGIN}${path}`), CONTEXT)).toBe(
        SWCore.STRATEGY_PASSTHROUGH,
      );
    }
  });

  it('passes malformed requests through', () => {
    expect(SWCore.routeRequest(get('not a url'), CONTEXT)).toBe(SWCore.STRATEGY_PASSTHROUGH);
    expect(SWCore.routeRequest({ url: '', method: 'GET' }, CONTEXT)).toBe(
      SWCore.STRATEGY_PASSTHROUGH,
    );
  });
});

describe('cache naming and version bump', () => {
  it('derives stable cache names from the version', () => {
    expect(SWCore.assetCacheName('v1')).toBe('wc-assets-v1');
    expect(SWCore.shellCacheName('v1')).toBe('wc-shell-v1');
    expect(SWCore.cacheNamesFor('v1')).toEqual(['wc-assets-v1', 'wc-shell-v1']);
  });

  it('changes every cache name when the version is bumped', () => {
    const before = SWCore.cacheNamesFor('v1');
    const after = SWCore.cacheNamesFor('v2');
    expect(after).toEqual(['wc-assets-v2', 'wc-shell-v2']);
    expect(before.some((name) => after.includes(name))).toBe(false);
  });
});

describe('orphan pruning selection', () => {
  it('flags wc-* caches of other versions as orphans but keeps the current ones', () => {
    expect(SWCore.isOrphanCache('wc-assets-v1', 'v1')).toBe(false);
    expect(SWCore.isOrphanCache('wc-shell-v1', 'v1')).toBe(false);
    expect(SWCore.isOrphanCache('wc-assets-v0', 'v1')).toBe(true);
    expect(SWCore.isOrphanCache('wc-shell-v2', 'v1')).toBe(true);
  });

  it('never flags caches it does not own', () => {
    expect(SWCore.isOrphanCache('other-app-cache', 'v1')).toBe(false);
    expect(SWCore.isOrphanCache('cache', 'v1')).toBe(false);
  });

  it('selects exactly the orphaned caches from the full cache list', () => {
    const names = [
      'wc-assets-v1',
      'wc-shell-v1',
      'wc-assets-v0',
      'wc-shell-v0',
      'wc-precache-v9',
      'unrelated',
    ];
    expect(SWCore.selectOrphanCaches(names, 'v1')).toEqual([
      'wc-assets-v0',
      'wc-shell-v0',
      'wc-precache-v9',
    ]);
    expect(SWCore.selectOrphanCaches(names, 'v0')).toEqual([
      'wc-assets-v1',
      'wc-shell-v1',
      'wc-precache-v9',
    ]);
    expect(SWCore.selectOrphanCaches([], 'v1')).toEqual([]);
  });
});

describe('shell precache urls', () => {
  it('lists the app shell, manifest, icons and content bundle under the base path', () => {
    const urls = SWCore.shellPrecacheUrls(ORIGIN, BASE);
    expect(urls).toHaveLength(9);
    expect(urls).toContain(`${ORIGIN}${BASE}`);
    expect(urls).toContain(`${ORIGIN}${BASE}index.html`);
    expect(urls).toContain(`${ORIGIN}${BASE}manifest.webmanifest`);
    expect(urls).toContain(`${ORIGIN}${BASE}icon.svg`);
    expect(urls).toContain(`${ORIGIN}${BASE}icons/icon-192.png`);
    expect(urls).toContain(`${ORIGIN}${BASE}icons/icon-512.png`);
    expect(urls).toContain(`${ORIGIN}${BASE}icons/maskable-192.png`);
    expect(urls).toContain(`${ORIGIN}${BASE}icons/maskable-512.png`);
    expect(urls).toContain(`${ORIGIN}${BASE}content.enc`);
    for (const url of urls) {
      expect(url.startsWith(`${ORIGIN}${BASE}`)).toBe(true);
    }
  });
});

describe('extractAssetUrls', () => {
  it('collects hashed same-origin asset references from index.html, deduplicated', () => {
    const html = [
      '<script type="module" crossorigin src="/winter-calendar-2026/assets/index-a1B2c3D4.js"></script>',
      '<link rel="stylesheet" crossorigin href="/winter-calendar-2026/assets/index-x9Y8z7W6.css">',
      '<link rel="stylesheet" crossorigin href="/winter-calendar-2026/assets/index-x9Y8z7W6.css">',
      '<link rel="icon" type="image/svg+xml" href="/icon.svg">',
      '<link rel="manifest" href="/manifest.webmanifest">',
      '<script src="https://cdn.example.com/lib-a1B2c3D4.js"></script>',
      '<script src="/winter-calendar-2026/assets/not-hashed.js"></script>',
    ].join('\n');
    expect(SWCore.extractAssetUrls(html, ORIGIN, BASE)).toEqual([
      `${ORIGIN}${BASE}assets/index-a1B2c3D4.js`,
      `${ORIGIN}${BASE}assets/index-x9Y8z7W6.css`,
    ]);
  });

  it('resolves relative asset references against the base path', () => {
    const html = '<script type="module" src="./assets/index-a1B2c3D4.js"></script>';
    expect(SWCore.extractAssetUrls(html, ORIGIN, BASE)).toEqual([
      `${ORIGIN}${BASE}assets/index-a1B2c3D4.js`,
    ]);
  });

  it('returns an empty list when the html references no hashed assets', () => {
    expect(SWCore.extractAssetUrls('<html><body>nothing</body></html>', ORIGIN, BASE)).toEqual([]);
  });
});
