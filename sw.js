// عامل خدمة «تنظيف»: لمن زار النسخة القديمة؛ يمسح الكاش ويلغي نفسه. الموقع الآن لا يخزّن شيئًا.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
