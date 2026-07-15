const CACHE_NAME = 'sinistro-app-v2';

const urlsToCache = [
  './',
  './index.html',
  './style.css?v=2',
  './vendor/quill.snow.css',
  './vendor/quill.js',
  './utils.js?v=2',
  './domUtils.js?v=2',
  './modules/storage.js?v=2',
  './modules/editor.js?v=2',
  './formHandler.js?v=2',
  './reportGenerator.js?v=2',
  './script.js?v=2',
  './manifest.json',
  './sabesp-logo.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
