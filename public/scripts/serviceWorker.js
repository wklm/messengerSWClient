(global => {
  'use strict';
  importScripts('sw-toolbox');
  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));

  toolbox.options.debug = true;

  //toolbox.precache(['/index.html', '/css/base.css', '/scripts/messenger.js']);


  toolbox.router.get('/api/threads/*', toolbox.cacheFirst);
  //toolbox.router.get('/*', toolbox.cacheFirst);



})(self);