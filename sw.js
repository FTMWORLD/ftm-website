self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function(e){
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'FTM', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'FTM', { body: d.body || '', icon: '/icon-192.png', badge: '/notif-badge.png', tag: d.tag || 'ftm', renotify: true, data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for (var i = 0; i < list.length; i++) { var c = list[i]; if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) { c.postMessage({ ftmOpen: url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
