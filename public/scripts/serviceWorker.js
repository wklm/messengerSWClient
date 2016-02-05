self.addEventListener('install', event => {

	 function onInstall () {
	    return caches.open('static')
	      .then(cache => cache.addAll([
	        '/'
	      ])
	    );
	  }

	  event.waitUntil(onInstall(event));
	});

});

self.addEventListener('activate', event => {
  // Do activate stuff: This will come later on.
});