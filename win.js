"use strict";
(async()=>{
console.log("[win]win.js start")
await Console.promise
//await Console.settings({storage:true, show:false, pos:"left-top", posx:-65, posy:-65})
await Console.settings({storage:true})
const app = Console.storage
await app.set("verwin", "0.10.0")



const inspection_func=async()=>{
  console.log("[win]---- inspection func start")

  console.log("[win]---- type primitive")
  await app.set("x1", 1)
  let x1 = await Console.storage.get("x1")
  console.log("[win]app.x1=1 -> x1:" + x1)
  await app.set("x2", 2)
  let x2 = await Console.storage.get("x2")
  console.log("[win]app.x2=2 -> x2:" + x2)

  console.log("[win]---- type object")
  await app.set("obj", {x:1})
  let obj = await Console.storage.get("obj")
  console.log("[win]app.obj={x:1} -> obj.x:" + obj.x)

  console.log("[win]---- type array")
  await app.set("arr", [1, 2])
  let arr = await Console.storage.get("arr")
  console.log("[win]app.arr=[1,2] -> arr[0]:" + arr[0])

  console.log("[win]---- app watch")
  console.log(`[win]app:${JSON.stringify(await app())}`)

  console.log("[win]---- app keys")
  console.log(`[win]app:${JSON.stringify(await app.keys())}`)

  console.log("[win]---- delete app.x1")
  await app.delete("x1")
  console.log(`[win]app:${JSON.stringify(await app())}`)

  console.log("[win]---- watch app._localtime")
  console.log(`[win]${await app.get("_localtime")}`)

/*
  console.log("[win]---- app replace")
  await app({count:10, win3:3, winobj1:{k1:1}, winarr:[3,4]})
  console.log(`[win]app:${JSON.stringify(await app())}`)
*/

  console.log("[win]---- inspection func end")
}
inspection_func()



const sample_app=async()=>{
  console.log("[win]---- sample app start")

  document.body.insertAdjacentHTML("beforeend", String.raw`
<style>
.pos {
  font-family: 'Archivo Black', sans-serif;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  position: fixed;
  left: 5vw;
  top: 5vh;
  user-select: none;
}
.area {
  font-size: 13rem;
  width: 90vw;
  height: 90vh;
  background: #cdddbd;
  transition: background-color 1.5s;
}
.rect {
  color: #000000;
  box-shadow: 0 0 3px 0 rgb(0 0 0 / 12%), 0 2px 3px 0 rgb(0 0 0 / 22%);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
<div class="pos">
  <div id="show" class="area rect"></div>
</div>
  `)

  let _recvtime = await app.get("_recvtime")
  //console.info(`_recvtime:${_recvtime}`)
  await app.set("recvtime", _recvtime)
  let count = await app.get("count")
  count = (typeof(count)==="undefined") ? 0 : count
  await app.set("count", count)
  document.getElementById("show").innerHTML = count
  console.log("[win]app.count:" + count)

  document.getElementById("show").addEventListener("click",async()=>{
    _recvtime = await app.get("_recvtime")
    await app.set("recvtime", _recvtime)
    count = await app.get("count")
    count = count + 1
    await app.set("count", count)
    document.getElementById("show").innerHTML = count
    console.log("[win]app.count:" + count)
  })

  Console.setfuncs.push(async()=>{
    const recvtime = await app.get("recvtime")
    const _recvtime_org = await app.get("_recvtime")
    const _recvtime=(typeof(_recvtime_org)!=="undefined")?_recvtime_org:""
    if (recvtime!=_recvtime) {
      count = await app.get("count")
      document.getElementById("show").innerHTML = count
      console.info("auto refresh app.count:" + count)
    }
  })

  console.log("[win]---- sample app end")
}
sample_app()



console.log("[win]win.js end")
})()
