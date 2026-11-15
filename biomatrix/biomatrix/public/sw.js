/* BioMatrix service worker: keeps a copy of the app on the device so it opens with no internet.
 *
 * - install:  saves the page, the icons, the manifest and every script/style the page links to
 *             (Vite's hashed files in /assets/), found by reading the page itself.
 * - activate: removes old caches and files the current page no longer uses.
 * - fetch:    page loads go to the network first (so updates arrive) and fall back to the saved copy;
 *             scripts, styles and images come from the saved copy first and refresh in the background.
 *             /api/ calls (the AI) are never cached.
 *
 * Bump VERSION to force every device to download a fresh copy.
 */
const VERSION = 'v1';
const CACHE = `biomatrix-${VERSION}`;
const SHELL = '/index.html';
const CORE = ['/', SHELL, '/manifest.webmanifest', '/favicon.svg', '/favicon-32.png', '/icon-512.png', '/apple-touch-icon.png'];
const NAV_TIMEOUT_MS = 4000;

/** Same-origin script and stylesheet URLs linked from an HTML page. */
function linkedAssets(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) {
    const url = new URL(m[1], self.registration.scope);
    if (url.origin === self.location.origin) urls.add(url.pathname);
  }
  return [...urls];
}

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const res = await cache.match(SHELL);
  const assets = res ? linkedAssets(await res.text()) : [];
  await cache.addAll(assets.filter((a) => !CORE.includes(a)));
}

/** Drop old cache versions and hashed files the current page does not link to any more. */
async function cleanUp() {
  for (const key of await caches.keys()) if (key.startsWith('biomatrix-') && key !== CACHE) await caches.delete(key);
  const cache = await caches.open(CACHE);
  const shell = await cache.match(SHELL);
  if (!shell) return;
  const keep = new Set([...CORE, ...linkedAssets(await shell.text())]);
  for (const req of await cache.keys()) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/assets/') && !keep.has(pathname)) await cache.delete(req);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanUp().then(() => self.clients.claim()));
});

/** Network first with a time limit; on failure the saved page. */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
    const res = await fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (res.ok) {
      const copy = res.clone();
      // Save the new page and anything new it links to, so the next offline start matches it.
      copy.text().then(async (html) => {
        await cache.put(SHELL, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
        const missing = [];
        for (const a of linkedAssets(html)) if (!(await cache.match(a))) missing.push(a);
        if (missing.length) await cache.addAll(missing).catch(() => {});
      });
    }
    return res;
  } catch {
    return (await cache.match(SHELL)) || (await cache.match('/')) || Response.error();
  }
}

/** Saved copy first; refresh it from the network in the background. */
async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((res) => {
      if (res.ok && res.type === 'basic') cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // the AI is always live, never cached
  if (request.mode === 'navigate') event.respondWith(handleNavigation(request));
  else event.respondWith(handleAsset(request));
});
