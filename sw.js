"use strict";

const CACHE_NAME = "nexus-secret-code-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./codes.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./css/style.css",
  "./js/game.js",
  "./js/script.js",
  "./js/codes.js",
  "./js/pwa.js"
];

function cacheResponse(request, response) {
  return caches.open(CACHE_NAME)
    .then(function (cache) { return cache.put(request, response); })
    .catch(function (error) {
      console.error("An app resource could not be saved for offline use.", error);
    });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames
          .filter(function (cacheName) {
            return cacheName.indexOf("nexus-secret-code-") === 0 && cacheName !== CACHE_NAME;
          })
          .map(function (cacheName) { return caches.delete(cacheName); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            return cacheResponse(request, response.clone()).then(function () { return response; });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cachedResponse) {
            return cachedResponse || caches.match("./index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request);
    }).then(function (cachedResponse) {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then(function (response) {
        if (response.ok) {
          return cacheResponse(request, response.clone()).then(function () { return response; });
        }
        return response;
      });
    })
  );
});
