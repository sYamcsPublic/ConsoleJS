"use strict";
(async()=>{
console.log("[sw]sw.js start")
importScripts("./Console.js")
let app;Console.promise.then(async()=>{
  await Console.settings({storage:true})
  app = Console.storage
  await app.set("versw", "1.0.0")

  const inspection_func=async()=>{
    console.log("[sw]---- inspection func start")

    console.log("[sw]---- set&get")
    await app.set("sw1", 1)
    console.log(`[sw]app.sw1:${await app.get("sw1")}`)
    await app.set("sw2", 2)
    console.log(`[sw]app.sw2:${await app.get("sw2")}`)
    await app.set("sw3", 3)
    console.log(`[sw]app.sw1:${await app.get("sw3")}`)

    console.log("[sw]---- win.js value get")
    console.log(`[sw]app.x2:${await app.get("x2")}`)
    console.log(`[sw]app.count:${await app.get("count")}`)

    console.log("[sw]---- app watch")
    console.log(`[sw]app-KeysValues:${JSON.stringify(await app())}`)

    console.log("[sw]---- app keys")
    console.log(`[sw]app-Keys:${JSON.stringify(await app.keys())}`)

/*
    console.log("[sw]---- app replace")
    await app({count:20, sw4:4, swobj1:{swk2:2}, swarr:[4,5]})
    console.log(`[sw]app-KeysValues:${JSON.stringify(await app())}`)
*/

    console.log("[sw]---- inspection func end")
  }
  inspection_func()

})



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

console.log("[sw]sw.js end")
})()
