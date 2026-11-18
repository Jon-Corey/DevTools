{{ assetsManifest }}

self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;

const baseUrl = new URL('/', self.location.origin);
const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset, baseUrl).href);

async function onInstall(event) {
    console.info('Service worker: Install');

    // Fetch and cache all items from the assets manifest
    await caches.open(cacheName).then(cache => cache.addAll(manifestUrlList));

    await self.skipWaiting();
}

async function onActivate(event) {
    console.info('Service worker: Activate');

    // Delete unused caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));

    await self.clients.claim();
}

async function onFetch(event) {
    if (event.request.method === 'GET') {
        const cache = await caches.open(cacheName);

        let cachedResponse = await cache.match(event.request, { ignoreSearch: true });
        if (cachedResponse) {
            return cachedResponse;
        }

        const url = new URL(event.request.url);
        if (url.origin === self.location.origin && event.request.mode === 'navigate') {
            let path = url.pathname;
            if (path.endsWith('/')) {
                path += 'index.html';
            } else if (path.split('/').pop().includes('.') === false) {
                path += '/index.html';
            }

            cachedResponse = await cache.match(path, { ignoreSearch: true });
            if (cachedResponse) {
                return cachedResponse;
            }
        }
    }

    if (isCloudflareInsightsRequest(event.request)) {
        return fetchCloudflareInsights(event.request);
    }

    return fetch(event.request);
}

function isCloudflareInsightsRequest(request) {
    const { hostname } = new URL(request.url);
    return hostname === 'cloudflareinsights.com' || hostname.endsWith('.cloudflareinsights.com');
}

// Cloudflare Insights is commonly blocked by ad blockers. Since it does not affect site
// functionality, swallow the failure and return an empty script instead of letting the
// rejected fetch surface as console warnings/errors.
async function fetchCloudflareInsights(request) {
    try {
        return await fetch(request);
    } catch {
        console.info('Service worker: Cloudflare Insights is unavailable or was blocked');
        return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/javascript' }
        });
    }
}
