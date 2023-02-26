"use strict";
(async()=>{
importScripts("./Console.js")
let app = await Console.storage
app.versw = "0.6.0"
console.info("[info]sw.js start")
console.log("[sw]sw.js start")



const cacheName = registration.scope
const cacheItems = [
  "./Console.js",
  "./sw.js",
  "./icon.png",
  "./manifest.json",
  "./",
]

self.addEventListener("install", async(event)=>{
  console.log("[sw]install start")
  event.waitUntil((async()=>{
    self.skipWaiting()
    const cache = await caches.open(cacheName)
    const res = await cache.addAll(cacheItems)
    console.log("[sw]install end")
    return res
  })())
})

self.addEventListener("activate", async(event)=>{
  console.log("[sw]activate start")
  event.waitUntil((async()=>{
    const res = await self.clients.claim()
    console.log("[sw]activate end")
    return res
  })())
})

self.addEventListener("fetch", async(event)=>{
  if (event.request.method == "POST") return
  event.respondWith((async()=>{
    const cacheres = await caches.match(event.request)
    if (cacheres) return cacheres
    return fetch(event.request)
  })())
})



const sample_app=async()=>{
  console.log("[sw]sample app start")

  app.sw1 = 1
  console.log(`[sw]app.sw1:${await app.sw1}`)

  app.sw2 = 2
  console.log(`[sw]app.sw2:${await app.sw2}`)

  app.sw3 = 3
  console.log(`[sw]app.sw3:${await app.sw3}`)

  console.log(`[sw]app.x:${await app.x}`)
  console.log(`[sw]app.count:${await app.count}`)

  delete app.sw2
  console.log("[sw]delete app.sw2")
  console.log(`[sw]app.sw2:${await app.sw2}`)

  let appobj={}
  await Object.keys(app).forEach(async(k) => appobj[k] = await app[k])
  console.log(`[sw]app:${JSON.stringify(appobj)}`)

  console.log("[sw]sample app end")
}
sample_app()



console.log("[sw]sw.js end")
})()
