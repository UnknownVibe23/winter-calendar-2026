(function () {
  'use strict';

  const STRATEGY_CACHE_FIRST = 'cache-first';
  const STRATEGY_NETWORK_FIRST = 'network-first';
  const STRATEGY_PASSTHROUGH = 'passthrough';

  const ASSET_DIR = 'assets/';
  const CACHE_PREFIX = 'wc-';
  const HASHED_NAME_PATTERN = /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;
  const HTML_REFERENCE_PATTERN = /(?:src|href)\s*=\s*"([^"]+)"/g;

  const SHELL_PRECACHE_PATHS = [
    '',
    'index.html',
    'manifest.webmanifest',
    'icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-192.png',
    'icons/maskable-512.png',
    'content.enc',
  ];

  function basePathFromScope(scope) {
    if (typeof scope !== 'string' || scope === '') {
      return '/';
    }
    let pathname = scope;
    if (scope.charAt(0) !== '/') {
      pathname = new URL(scope).pathname;
    }
    if (pathname.charAt(pathname.length - 1) !== '/') {
      pathname += '/';
    }
    return pathname;
  }

  function isHashedAssetPath(pathname, basePath) {
    const prefix = basePath + ASSET_DIR;
    if (pathname.indexOf(prefix) !== 0) {
      return false;
    }
    const name = pathname.slice(prefix.length);
    if (name === '' || name.indexOf('/') !== -1) {
      return false;
    }
    return HASHED_NAME_PATTERN.test(name);
  }

  function isContentBundlePath(pathname, basePath) {
    return pathname === basePath + 'content.enc';
  }

  function isAppShellPath(pathname, basePath) {
    return (
      pathname === basePath ||
      pathname === basePath + 'index.html' ||
      pathname === basePath + 'manifest.webmanifest'
    );
  }

  function isIconPath(pathname, basePath) {
    return pathname === basePath + 'icon.svg' || pathname.indexOf(basePath + 'icons/') === 0;
  }

  function routeRequest(request, context) {
    if (!request || request.method !== 'GET') {
      return STRATEGY_PASSTHROUGH;
    }
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return STRATEGY_PASSTHROUGH;
    }
    if (url.origin !== context.origin) {
      return STRATEGY_PASSTHROUGH;
    }
    const pathname = url.pathname;
    if (isHashedAssetPath(pathname, context.basePath)) {
      return STRATEGY_CACHE_FIRST;
    }
    if (
      isContentBundlePath(pathname, context.basePath) ||
      isAppShellPath(pathname, context.basePath) ||
      isIconPath(pathname, context.basePath)
    ) {
      return STRATEGY_NETWORK_FIRST;
    }
    return STRATEGY_PASSTHROUGH;
  }

  function assetCacheName(version) {
    return CACHE_PREFIX + 'assets-' + version;
  }

  function shellCacheName(version) {
    return CACHE_PREFIX + 'shell-' + version;
  }

  function cacheNamesFor(version) {
    return [assetCacheName(version), shellCacheName(version)];
  }

  function isOrphanCache(name, version) {
    return name.indexOf(CACHE_PREFIX) === 0 && cacheNamesFor(version).indexOf(name) === -1;
  }

  function selectOrphanCaches(names, version) {
    return names.filter((name) => isOrphanCache(name, version));
  }

  function shellPrecacheUrls(origin, basePath) {
    return SHELL_PRECACHE_PATHS.map((path) => origin + basePath + path);
  }

  function extractAssetUrls(html, origin, basePath) {
    const urls = [];
    const seen = Object.create(null);
    const pattern = new RegExp(HTML_REFERENCE_PATTERN.source, 'g');
    let match = pattern.exec(html);
    while (match !== null) {
      let url;
      try {
        url = new URL(match[1], origin + basePath);
      } catch {
        match = pattern.exec(html);
        continue;
      }
      if (url.origin === origin && isHashedAssetPath(url.pathname, basePath) && !seen[url.href]) {
        seen[url.href] = true;
        urls.push(url.href);
      }
      match = pattern.exec(html);
    }
    return urls;
  }

  const SWCore = {
    STRATEGY_CACHE_FIRST,
    STRATEGY_NETWORK_FIRST,
    STRATEGY_PASSTHROUGH,
    basePathFromScope,
    isHashedAssetPath,
    isContentBundlePath,
    isAppShellPath,
    isIconPath,
    routeRequest,
    assetCacheName,
    shellCacheName,
    cacheNamesFor,
    isOrphanCache,
    selectOrphanCaches,
    shellPrecacheUrls,
    extractAssetUrls,
  };

  if (typeof self !== 'undefined') {
    self.SWCore = SWCore;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SWCore = SWCore;
  }
  if (typeof window !== 'undefined' && window !== globalThis) {
    window.SWCore = SWCore;
  }
})();
