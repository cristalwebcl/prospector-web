/* Prospector — service worker mínimo.
   Existe para que Edge/Chrome dejen instalar la app como ventana propia.
   No cachea nada: el servidor es local y los datos cambian; cachear la API
   mostraría demos viejas. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) { e.respondWith(fetch(e.request)); });
