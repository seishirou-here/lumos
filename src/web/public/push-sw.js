/*
 * Lumos push handler.
 * Imported into the Workbox-generated service worker via `workbox.importScripts`
 * (see vite.config.ts). Handles FCM data-only Web Push messages without the
 * Firebase SW SDK, so precaching and push live in one service worker.
 *
 * Expected FCM payload: { data: { title, body, url?, tag? } }
 */
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { data: { body: event.data ? event.data.text() : '' } };
  }

  const data = payload.data || {};
  const fallback = payload.notification || {};
  const title = data.title || fallback.title || 'Lumos';
  const tag = data.tag || '';

  const options = {
    body: data.body || fallback.body || '',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    vibrate: [80, 40, 80],
    data: { url: data.url || '/' },
  };

  if (tag) {
    options.tag = tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if (client.url !== target && 'navigate' in client) {
            try {
              await client.navigate(target);
            } catch {
              // Cross-origin or uncontrolled client: focusing is enough.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
