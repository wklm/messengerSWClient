(global => {
  'use strict';
  importScripts('sw-toolbox');
  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));

  toolbox.router.get('/api/*', toolbox.networkFirst);
  toolbox.router.get('/*', toolbox.cacheFirst);


})(self);