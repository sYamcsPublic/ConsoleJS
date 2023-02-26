"use strict";
(()=>{
//Console.settings({show:false, pos:"left-top", posx:-65, posy:-65})
//Console.settings({pos:"left-bottom"})
let app = Console.storage
app.verwin = "0.2.0"
console.log("win.js start")



console.log("---- type primitive : directChange OK / indirectChange OK")

app.x = 1
console.log("app.x=1 -> x:" + Console.storage.x)

app.x++
console.log("app.x++ -> x:" + Console.storage.x)

let x = app.x; x++; app.x = x
console.log("x=app.x; x++; app.x=x -> x:" + Console.storage.x)



console.log("---- type object : directChange NG / indirectChange OK")

app.obj = {x:1}
console.log("app.obj={x:1} -> obj.x:" + Console.storage.obj.x)

app.obj.x++
console.log("app.obj.x++ -> obj.x:" + Console.storage.obj.x)

let obj = app.obj; obj.x++; app.obj = obj
console.log("obj=app.obj; obj.x++; app.obj=obj -> obj.x:" + Console.storage.obj.x)



console.log("---- type array : direct change NG / indirectChange OK")

app.arr = [1, 2]
console.log("app.arr=[1,2] -> arr[0]:" + Console.storage.arr[0])

app.arr[0]++
console.log("app.arr[0]++ -> arr[0]:" + Console.storage.arr[0])

let arr = app.arr; arr[0]++; app.arr=arr
console.log("arr=app.arr; arr[0]++; app.arr=arr -> arr[0]:" + Console.storage.arr[0])



console.log("---- app watch")

/*
console.log(app) // <- [Object Function]
console.log({app}) // <- [Object Object]
//console.log({{app}}) // <- SyntaxError
console.log(JSON.stringify(app)) // <- undefined
console.log(JSON.stringify({app})) // <- {}
*/

const appwatch=()=>{
  Object.keys(app).forEach(key=>{
    //console.log(key)
    if (typeof(app[key])=="object") {
      console.log(key + ":" + JSON.stringify(app[key]))
    } else {
      console.log(key + ":" + app[key])
    }
  })
}
appwatch()



console.log("---- delete app.arr")
delete app.arr
appwatch()

console.log("---- delete app.obj")
delete app.obj
appwatch()

/*
console.log("---- delete app.x")
delete app.x
appwatch()
*/



console.log("---- watch app._localtime")
console.log(app._localtime)



const sample_app=()=>{
  console.log("---- sample app start")

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

  app.recvtime = app._recvtime
  app.count = (app.count==undefined) ? 0 : app.count
  document.getElementById("show").innerHTML=app.count
  console.log("app.count:" + app.count)

  document.getElementById("show").addEventListener("click",()=>{
    app.recvtime = app._recvtime
    app.count = app.count + 1
    document.getElementById("show").innerHTML=app.count
    console.log("app.count:" + app.count)
  })

  Console.setfuncs.push(()=>{
    if (app.recvtime!=app._recvtime) {
      document.getElementById("show").innerHTML=app.count
      console.info("[info]auto refresh app.count:" + app.count)
    }
  })

  console.log("---- sample app end")
}
sample_app()



console.log("win.js end")
})()
