const FAILED_QUEUE = 'failed-visits';

// Install & activate
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

// Achtergrond sync
self.addEventListener('sync', e => {
  if (e.tag === 'retry-visits') e.waitUntil(retryFailedRequests());
});

async function retryFailedRequests() {
  const cache = await caches.open(FAILED_QUEUE);
  const keys = await cache.keys();
  for (const request of keys) {
    try {
      const body = await cache.match(request).then(r => r.text());
      const res = await fetch(request.url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body,
        mode: 'cors'
      });
      if (res.ok) await cache.delete(request);
    } catch (e) {
      console.log('Retry failed', e);
    }
  }
}

// Berichten van pagina
self.addEventListener('message', async e => {
  if (e.data?.type === 'storeFailed') {
    const cache = await caches.open(FAILED_QUEUE);
    const req = new Request(e.data.request.url, { method: 'POST' });
    await cache.put(req, new Response(e.data.request.body));

    // Background sync registeren
    if ('sync' in self.registration) {
      self.registration.sync.register('retry-visits').catch(err => console.log('Sync register failed', err));
    }
  }
});
