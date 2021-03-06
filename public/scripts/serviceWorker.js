(global => {
    'use strict';
    importScripts('sw-toolbox');
    global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
    global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));

    toolbox.options.debug = false;

    toolbox.precache(['/index.html', '/css/base.css', '/scripts/messenger.js']);

    toolbox.router.get('/', toolbox.cacheFirst);
    toolbox.router.get('/api/threads/*', toolbox.networkFirst);
    toolbox.router.get('/api/listen', toolbox.networkOnly);
    toolbox.router.get('/api', toolbox.cacheFirst);
    toolbox.router.get('/api/currentUserID', toolbox.cacheFirst);
    toolbox.router.get('/api/appStatus', toolbox.cacheFirst);
    toolbox.router.get('/api/friends', toolbox.cacheFirst);
    toolbox.router.get('/api/getUserByName', toolbox.cacheFirst);
    toolbox.router.get('/api/getUserById/:id', toolbox.cacheFirst);
    toolbox.router.get('/css', toolbox.cacheFirst);
    toolbox.router.get('/react', toolbox.cacheFirst);
    toolbox.router.get('/sw-toolbox', toolbox.cacheFirst);
    toolbox.router.get('https://graph.facebook.com/*', toolbox.cacheFirst);

    self.addEventListener('sync', function (event) { // may be global
       // console.log(event) // TODO: background sync
    });
})(self);





