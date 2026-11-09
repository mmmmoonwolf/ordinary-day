// v0.59 the service worker that makes the game installable (Add to Home screen). It caches nothing on purpose: every
// file comes from the network as before, so a new version on GitHub Pages is never hidden behind an old copy.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
