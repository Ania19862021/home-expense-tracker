self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  self.registration.showNotification(data.title || '💸 CashFlow', {
    body: data.body || 'Sprawdź swój budżet!',
    icon: '/icon.png',
  });
});
