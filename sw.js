// InnerShadow SW - stripped down
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
// No fetch handler = browser handles everything natively
console.log('[SW] Minimal SW loaded');
