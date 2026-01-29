"use strict";
const VERSION="1.0.7";
console.log(`[sw.js] start / version:${VERSION}`);
importScripts("./Console.js"); Console.promise.then(async()=>{
  console.log(`[sw.js] promise start / version:${VERSION}`);
  let kv = Console.storage; await Console.settings({storage:false}); await kv.set("_versw", VERSION);

  // sample
  await kv.set("swKey1", "swText1");
  const value1 = await kv.get("swKey1");
  console.log(`[sw.js] promise value1:${value1}`)

  console.log("[sw.js] promise end")
})

// template
const cacheItems = [
  "./Console.js",
  "./index.html",
  "./",
]
self.addEventListener("install", (event)=>{
  console.log("[sw.js] install start")
  event.waitUntil((async()=>{
    self.skipWaiting()
    const cacheName = registration.scope
    const cache = await caches.open(cacheName)
    const res = await cache.addAll(cacheItems)
    console.log("[sw.js] install end")
    return res
  })())
})
self.addEventListener("activate", (event)=>{
  console.log("[sw.js] activate start")
  event.waitUntil((async()=>{
    const res = await self.clients.claim()
    console.log("[sw.js] activate end")
    return res
  })())
})
self.addEventListener("fetch", (event)=>{
  if (event.request.method == "POST") return
  event.respondWith((async()=>{
    const cacheres = await caches.match(event.request)
    if (cacheres) return cacheres
    return fetch(event.request)
  })())
})

console.log("[sw.js] end")
