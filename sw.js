"use strict";
console.log("[sw]sw.js start")

const cacheName = registration.scope
const cacheItems = [
  "./Console.js",
  "./win.js",
  "./sw.js",
  "./icon.png",
  "./manifest.json",
  "./",
]

self.addEventListener("install", (event)=>{
  console.log("[sw]install start")
  event.waitUntil((async()=>{
    self.skipWaiting()
    const cache = await caches.open(cacheName)
    const res = await cache.addAll(cacheItems)
    console.log("[sw]install end")
    return res
  })())
})

self.addEventListener("activate", (event)=>{
  console.log("[sw]activate start")
  event.waitUntil((async()=>{
    const res = await self.clients.claim()
    console.log("[sw]activate end")
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



;(async()=>{
importScripts("./Console.js")
const app = await Console()
await app.set("versw", "0.10.0")



const sample_app=async()=>{
  console.log("[sw]sample app start")

  await app.set("sw1", 1)
  console.log(`[sw]app.sw1:${await app.get("sw1")}`)

  await app.set("sw2", 2)
  console.log(`[sw]app.sw2:${await app.get("sw2")}`)

  await app.set("sw3", 3)
  console.log(`[sw]app.sw1:${await app.get("sw3")}`)

  console.log(`[sw]app.x2:${await app.get("x2")}`)

  console.log(`[sw]app.count:${await app.get("count")}`)

  console.log(`[sw]app:${JSON.stringify((await app()).app)}`)

  console.log("[sw]sample app end")
}
sample_app()



console.log("[sw]sw.js end")
})()
