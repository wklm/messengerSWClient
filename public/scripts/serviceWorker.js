self.addEventListener('install', function (event) {
  console.log("install");
  function onInstall() {
    return caches.open('static')
      .then(cache => cache.addAll([
          '/css',
          '/react',
          'https://cdnjs.cloudflare.com/ajax/libs/react/0.14.0/react.js',
          'https://cdnjs.cloudflare.com/ajax/libs/react/0.14.0/react-dom.js',
          'https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js'
        ])
      );
  }

  event.waitUntil(onInstall(event));
});

self.addEventListener('activate', function (event) {
  console.log("activate");
});

//self.addEventListener('fetch', function (event) {
//  console.log("fetch");
//
//  event.respondWith(
//    caches.open('threads').then(function (cache) {
//      return cache.match(event.request).then(function (response) {
//        return response || fetch(event.request).then(function (response) {
//            cache.put(event.request, response.clone());
//            return response;
//          })
//      })
//    })
//  );
//
//  console.log(event.request.url);
//
//});

//self.addEventListener('fetch', function(event) {
//  event.respondWith(
//    caches.match(event.request)
//      .then(function(response) {
//        if (response) {
//          return response;
//        }
//        var fetchRequest = event.request.clone();
//        return fetch(fetchRequest).then(
//          function(response) {
//            if(!response || response.status !== 200 || response.type !== 'basic') {
//              return response;
//            }
//
//            else {
//
//            var responseToCache = response.clone();
//
//            caches.open('dynamic')
//              .then(function(cache) {
//                cache.put(event.request, responseToCache);
//              });
//
//            // And return the network response
//            return response;
//          }}
//        );
//      })
//  );
//});