"use strict";
(async()=>{
importScripts("./Console.js")
let app = await Console.storage

console.log("sw.js start")

const cacheName = registration.scope
const cacheItems = [
  "./Console.js",
  "./sw.js",
  "./icon.png",
  "./manifest.json",
  "./",
]

self.addEventListener("install", async(event)=>{
  console.log("sw.js install")
  event.waitUntil((async()=>{
    const cache = await caches.open(cacheName)
    return cache.addAll(cacheItems)
  })())
})

self.addEventListener("activate", async(event)=>{
  console.log("sw.js activate")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", async(event)=>{
  if (event.request.method == "POST") return
  event.respondWith((async()=>{
    const cacheres = await caches.match(event.request)
    if (cacheres) return cacheres
    return fetch(event.request)
  })())
})



await (app.sw1 = 1)
let sw1 = await app.sw1
console.log("[sw]app.sw1: " + sw1)

await (app.sw2 = 2)
let sw2 = await app.sw2
console.log("[sw]app.sw2: " + sw2)

let x = await app.x
console.log("[sw]app.x: " + x)

let count = await app.count
console.log("[sw]app.count: " + count)

await (delete app.sw2)
console.log("[sw]delete app.sw2")



console.log("sw.js end")

})()
