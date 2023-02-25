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



app.sw1 = 1
let sw1 = await app.sw1
console.log("[sw]app.sw1: " + sw1)

app.sw2 = 2
let sw2 = await app.sw2
console.log("[sw]app.sw2: " + sw2)

app.sw3 = 3
let sw3 = await app.sw3
console.log("[sw]app.sw3: " + sw3)

let x = await app.x
console.log("[sw]app.x: " + x)

let count = await app.count
console.log("[sw]app.count: " + count)

delete app.sw2
console.log("[sw]delete app.sw2")

sw2 = await app.sw2
console.log("[sw]app.sw2: " + sw2)

let appall=""
await Object.keys(app).forEach(async(k)=>{
  let v = await app[k]
  appall=appall+`${k}:${v}, `
})
console.log(`[sw]app all: ${appall}`)


console.log("sw.js end")

})()
