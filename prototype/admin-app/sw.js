/* Service worker of the admin app: shows push notifications (new lead) and opens the right lead when tapped.
   It does not cache anything, so the admin always shows live data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network only */ });
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'יוסק׳ה', {
    body: d.body || '', icon: '/admin-app/icon-192.png', badge: '/admin-app/icon-192.png', dir: 'rtl', lang: 'he', tag: d.tag || 'lead', renotify: true, data: { url: d.url || '/admin#/leads' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin#/leads';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes('/admin') && 'focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
