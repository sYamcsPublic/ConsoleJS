"use strict";
(()=>{

const VERSION = "0.3.0";

//const p = ((Math.random()*26)+10).toString(36).replace(".","")

const iswin = (typeof(window)!=="undefined")
const issw  = (typeof(ServiceWorkerGlobalScope)!=="undefined")
const canbcc = (typeof(globalThis.BroadcastChannel)!=="undefined")
//console.info(`[info]isWindow: ${iswin}, isServiceWorker: ${issw}, canBroadcastChannel: ${canbcc}`)



const getDateTime=()=>{
  const toDoubleDigits=(i)=>{
    let res = "" + i
    if (res < 10) {
      res = "0" + i
    }
    return res
  }
  const toTripleDigits=(i)=>{
    let res = "" + i
    if (res < 10) {
      res = "00" + i
    } else if (res < 100) {
      res = "0" + i
    }
    return res
  }
  const DD = new Date()
  const Year = DD.getFullYear()
  const Month = toDoubleDigits(DD.getMonth() + 1)
  const Day = toDoubleDigits(DD.getDate())
  const Hours = toDoubleDigits(DD.getHours())
  const Minutes = toDoubleDigits(DD.getMinutes())
  const Seconds = toDoubleDigits(DD.getSeconds())
  const mSeconds = toTripleDigits(DD.getMilliseconds())
  const res = Year + "/" + Month + "/" + Day + "-" + Hours + ":" + Minutes + ":" + Seconds + ":" + mSeconds
  return res
}

const getPrefix=()=>{
  if (iswin) {
    const href = window.location.href
    const pos = href.lastIndexOf("?")
    if (pos<0) {
      if (href.slice(-1)=="/") {
        return href
      } else if (href.slice(-4)=="html") {
        return href.substr(0, href.lastIndexOf("/")+1)
      } else {
        return href + "/"
      }
    } else {
      return href.substr(0, pos)
    }
  } else {
    const scope = registration.scope
    if (scope.slice(-1)=="/") {
      return scope
    } else {
      return scope + "/"
    }
    //return undefined
  }
}



const localStorageName = "Console.js"
const localStorageKey = getPrefix() + localStorageName

let bcc, resbcc, fresbcc=false
if (canbcc) bcc = new BroadcastChannel(localStorageKey)

let localStorageSetFuncs=[]
/*
//----
// sample
localStorageSetFuncs.push((p, v)=>{
  console.log("set " + localStorageName + "." + p + ": " + v)
})
*/

const isLocalStoragePrefix=(p)=>(typeof(p)=="string")?p.substring(0, 1)=="_":false
const getLocalStoragePrefixDel=(p)=>p.substring(1)

const localStorageSetFix=(jo)=>{
  jo["localtime"] = getDateTime()
}

const localStorageFunc=(obj)=>{
  if (iswin) {
    let jo = {"app": obj}
    localStorageSetFix(jo)
    js = JSON.stringify(jo)
    localStorage[localStorageKey] = js
  }
}

const localStoragePromiseRes=(obj)=>{
  return (async()=>{
    const w=50, t=1000, wait=async(ms)=>new Promise(resolve=>setTimeout(resolve, ms))
    let res=undefined, s=new Date()
    if (fresbcc) while (fresbcc && new Date()-s < t) await wait(w)
    if (fresbcc) return res
    fresbcc=true
    resbcc=null
    bcc.postMessage(obj)
    s = new Date()
    while (resbcc===null && new Date()-s < t) await wait(w)
    if (resbcc!==null) res = resbcc
    fresbcc=false
    return res
  })()
}

const localStorageHandler = {
  get: (t, p, r)=>{
    try {
      if (iswin) {
        let js = localStorage[localStorageKey]
        if (js) {
          let jo = JSON.parse(js)
          let val
          if (isLocalStoragePrefix(p)) {
            val = jo[getLocalStoragePrefixDel(p)]
          } else {
            val = jo["app"][p]
          }
          return val
        } else {
          return undefined
        }
      } else if (canbcc) {
        const getref = Reflect.get(t, p, r)
        if (typeof(getref)!=="undefined") {
          return getref
        } else {
          return localStoragePromiseRes({ "type": "getreq", "args": {"p":p} })
        }
      } else {
        return Reflect.get(t, p, r)
      }
    } catch(e) {
      console.info("localStorageHandler.get error:" + e)
      return Reflect.get(t, p, r)
    }
  },
  set: (t, p, v, r)=>{
    try {
      if (iswin) {
        //if (p!="_log") console.info("[info]set p:" + p + ", v:" + v)
        let js = localStorage[localStorageKey]
        let jo
        if (js) {
          jo = JSON.parse(js)
        } else {
          jo = {"app": {}}
        }
        if (isLocalStoragePrefix(p)) {
          jo[getLocalStoragePrefixDel(p)] = v
        } else {
          jo["app"][p] = v
        }
        localStorageSetFix(jo)
        js = JSON.stringify(jo)
        localStorage[localStorageKey] = js
        localStorageSetFuncs.forEach(f=>f(p, v))
        if (isLocalStoragePrefix(p)) {
          return true
        } else {
          return Reflect.set(t, p, v, r)
        }
      } else if (canbcc) {
        Reflect.set(t, p, v, r)
        return localStoragePromiseRes({ "type": "setreq", "args": {"p":p, "v":v} })
      } else {
        return Reflect.set(t, p, v, r)
      }
    } catch(e) {
      console.info("localStorageHandler.set error:" + e)
      return Reflect.set(t, p, v, r)
    }
  },
  deleteProperty: (t, p)=>{
    try {
      if (iswin) {
        let js = localStorage[localStorageKey]
        if (js) {
          let jo = JSON.parse(js)
          if (isLocalStoragePrefix(p)) {
            delete jo[getLocalStoragePrefixDel(p)]
          } else {
            delete jo["app"][p]
          }
          localStorageSetFix(jo)
          js = JSON.stringify(jo)
          localStorage[localStorageKey] = js
          //return true
        } else {
          //return false
        }
        return Reflect.deleteProperty(t, p)
      } else if (canbcc) {
        Reflect.deleteProperty(t, p)
        return localStoragePromiseRes({ "type": "delreq", "args": {"p":p} })
      } else {
        return Reflect.deleteProperty(t, p)
      }
    } catch(e) {
      console.info("localStorageHandler.delete error:" + e)
      return Reflect.deleteProperty(t, p)
    }
  },
}

const storage = new Proxy(localStorageFunc, localStorageHandler)
if (typeof(storage._app)==="undefined") storage._app={}

const initstorage=()=>{
  localStorage[localStorageKey]=JSON.stringify({})
  storage._app={}
}

if (canbcc && issw) {
  bcc.onmessageerror=(event)=>{
    console.info(`sw.onmessageerror: event: ${event.data}`)
  }
  bcc.onmessage=(event)=>{
    //console.info(`sw.onmessage: event: ${event.data}`)
    //console.info(`sw.onmessage: event: type:${event.data.type}, v.app_win:${event.data.args.v.app_win}`)
    switch (event.data.type) {
      case "getres":
        resbcc=event.data.value
        break
      case "setres":
        resbcc=event.data.status
        break
      case "delres":
        resbcc=event.data.status
        break
      default:
        break
    }
  }
}

if (canbcc && iswin) {
  bcc.onmessageerror=(event)=>{
    console.info(`win.onmessageerror: event: ${event.data}`)
  }
  bcc.onmessage=(event)=>{
    //console.info(`win.onmessage: event: ${event.data.args}`)
    //console.info(`win.onmessage: event: type:${event.data.type}, p:${event.data.args.p}`)
    switch (event.data.type) {
      case "log":
        console.log(event.data.args)
        break
      case "getreq":
        bcc.postMessage({ "type": "getres", "status": true, "value": storage[event.data.args.p] })
        break
      case "setreq":
        storage[event.data.args.p] = event.data.args.v
        bcc.postMessage({ "type": "setres", "status": true })
        break
      case "delreq":
        delete storage[event.data.args.p]
        bcc.postMessage({ "type": "delres", "status": true })
        break
      default:
        break
    }
  }
}

const p = "Console_js_"

const addconsole=()=>{
  let consoleLogBackup=console.log
  Object.defineProperty(console, "log", {
    value: (...args)=>{
      args.forEach(arg=>{
        const log = getDateTime() + "|" + arg
        if (iswin) {
          consoleLogBackup(log)
          const htmllog = `<div class="${p}line"><div class="${p}str">` + log + `</div></div>`
          if (document.getElementById(`${p}viewerspan`)!==null) {
            if ((document.getElementById(`${p}viewerspan`).childElementCount===0) && (typeof(storage._log)!=="undefined" && storage._log!="")) {
              document.getElementById(`${p}viewerspan`).innerHTML = storage._log
              if (typeof(storage._usestoragelog)==="undefined" || !storage._usestoragelog) storage._log = ""
            }
            document.getElementById(`${p}viewerspan`).innerHTML = document.getElementById(`${p}viewerspan`).innerHTML + htmllog
            if (typeof(storage._usestoragelog)!=="undefined" && storage._usestoragelog) {
              storage._log = (typeof(storage._log)==="undefined") ? htmllog : storage._log + htmllog
            }
          } else {
            storage._log = (typeof(storage._log)==="undefined") ? htmllog : storage._log + htmllog
          }
        } else {
          if (canbcc) bcc.postMessage({"type": "log", "args": arg})
        }
      })
    },
  })
}
addconsole()

const addcontents=()=>{
document.body.insertAdjacentHTML("beforeend", String.raw`
<style>

#${p}console {
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  position: fixed;
  right: 30px;
  left: inherit;
  top: inherit;
  bottom: 30px;
  display: flex;
  flex-distoragetion: column;
  z-index: 9999;
}

#${p}viewer {
  font-size: 0.75rem;
  font-family: Menlo,consolas,monospace;
  background: #ffffff;
  position: fixed;
  right: 0px;
  left: inherit;
  top: inherit;
  bottom: 0px;
  width: 100%;
  height: 100%;
  overflow: auto;
  overflow-x:hidden;
  word-break: break-all;
  justify-content: flex-end;
  -webkit-overflow-scrolling: touch;
  transition: all 0.5s ease;
}
@media (min-width: 650px) and (min-height: 650px) {
  #${p}viewer {
    right: 100px;
    left: inherit;
    top: inherit;
    bottom: 60px;
    width: 80%;
    height: 80%;
    max-width: 600px;
    max-height: 800px;
    box-shadow: 0 0 3px 0 rgb(0 0 0 / 12%), 0 2px 3px 0 rgb(0 0 0 / 22%);
    border-radius: 3px;
  }
}

.${p}blankspace {
  width: 100%;
  margin: 0;
  position: relative;
}

.${p}line {
  margin: 0;
  line-height: 1.2rem;
  border-bottom: 1px solid #eee;
  position: relative;
}

.${p}str {
  margin: 0 5px 0 5px;
  line-height: 1.2rem;
}

.${p}ver {
  text-align: right;
}

.${p}cmd {
  font-weight: 900;
  color: #314de7
}

#${p}cmdslnow {
  font-weight: 900;
  color: #314de7
}

#${p}cmd {
  font-size: 0.75rem;
  font-family: Menlo,consolas,monospace;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
}

.${p}btn {
  display: flex;
  align-items: baseline;
  transition: all 0.5s ease;
  position: relative;
}
.${p}btn a {
  font-family: Menlo,consolas,monospace;
  font-weight: 900;
  color: #ffffff;
  background: #b6b6b6;
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  box-shadow: 0 0 6px 0 rgb(0 0 0 / 15%), 0 4px 5px 0 rgb(0 0 0 / 22%);
  position: relative;
  cursor: pointer;
}

.${p}btn a:before {
  z-index: 2;
  transform: translate(-50%, -50%);
}

.${p}menu {
  font-size: 1.5rem;
  margin-bottom: 15px;
}

#${p}toggle a:before {
  font-size: 1.7rem;
  content: "－";
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
}

#${p}console.${p}hide > #${p}viewer {
  right: 50px;
  bottom: 50px;
  width: 0;
  height: 0;
}

#${p}console.${p}hide > .${p}menu {
  margin-bottom: 0;
  height: 0;
}

#${p}console.${p}hide > #${p}toggle a:before {
  content: "＋";
}



#${p}console.${p}hide.${p}right-bottom {
  right: calc(30px - ${storage._settings.posx}px);
  left: inherit;
  top: inherit;
  bottom: calc(30px - ${storage._settings.posy}px);
  transition: all 0.5s ease;
}

#${p}console.${p}hide.${p}right-bottom > #${p}viewer {
  right: calc(60px - ${storage._settings.posx}px);
  left: inherit;
  top: inherit;
  bottom: calc(60px - ${storage._settings.posy}px);
}



#${p}console.${p}hide.${p}right-top {
  right: calc(30px - ${storage._settings.posx}px);
  left: inherit;
  top: calc(30px + ${storage._settings.posy}px);
  bottom: inherit;
  transition: all 0.5s ease;
}

#${p}console.${p}hide.${p}right-top > #${p}viewer {
  right: calc(60px - ${storage._settings.posx}px);
  left: inherit;
  top: calc(60px + ${storage._settings.posy}px);
  bottom: inherit;
}



#${p}console.${p}hide.${p}left-bottom {
  right: inherit;
  left: calc(30px + ${storage._settings.posx}px);
  top: inherit;
  bottom: calc(30px - ${storage._settings.posy}px);
  transition: all 0.5s ease;
}

#${p}console.${p}hide.${p}left-bottom > #${p}viewer {
  right: inherit;
  left: calc(60px + ${storage._settings.posx}px);
  top: inherit;
  bottom: calc(60px - ${storage._settings.posy}px);
}



#${p}console.${p}hide.${p}left-top {
  right: inherit;
  left: calc(30px + ${storage._settings.posx}px);
  top: calc(30px + ${storage._settings.posy}px);
  bottom: inherit;
  transition: all 0.5s ease;
}

#${p}console.${p}hide.${p}left-top > #${p}viewer {
  right: inherit;
  left: calc(60px + ${storage._settings.posx}px);
  top: calc(60px + ${storage._settings.posy}px);
  bottom: inherit;
}



#${p}console.${p}hidetoggle > #${p}toggle {
  opacity: 0;
}

</style>
<div id="${p}console" class="${p}${storage._settings.pos} ${p}hide">
  <div id="${p}viewer">
    <span id="${p}viewerspan"></span>
    <div class="${p}line">
      <div class="${p}str">&ensp;<span class="${p}cmd">></span>&ensp;<input type="text" id="${p}cmd" style="width:90%; box-sizing:border-box"/></div>
    </div>
    <div class="${p}blankspace">
      <div class="${p}str">&ensp;</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvw" class="${p}cmd">@vw</span>: view service worker</div>
      <div class="${p}str">&ensp;<span id="${p}cmddw" class="${p}cmd">@dw</span>: delete service worker</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvc" class="${p}cmd">@vc</span>: view cache</div>
      <div class="${p}str">&ensp;<span id="${p}cmddc" class="${p}cmd">@dc</span>: delete cache</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvs" class="${p}cmd">@vs</span>: view storage</div>
      <div class="${p}str">&ensp;<span id="${p}cmdds" class="${p}cmd">@ds</span>: delete storage</div>
      <div class="${p}str">&ensp;<span id="${p}cmdsl" class="${p}cmd">@sl</span>: storage log (currently <span id="${p}cmdslnow">${getUsestoragelogStr()}</span>)</div>
      <div class="${p}str">&ensp;<span id="${p}cmddl" class="${p}cmd">@dl</span>: delete log</div>
      <div class="${p}str">&ensp;<span id="${p}cmdcu" class="${p}cmd">@cu</span>: change URL</div>
      <div class="${p}str">&ensp;<span id="${p}cmdse" class="${p}cmd">@se</span>: send to URL</div>
      <div class="${p}str">&ensp;<span id="${p}cmdre" class="${p}cmd">@re</span>: receive from URL</div>
      <div class="${p}str">&ensp;<span id="${p}cmdra" class="${p}cmd">@ra</span>: reload app</div>
      <div class="${p}str ${p}ver">${VERSION}&ensp;</div>
    </div>
  </div>
  <!-- <div id="${p}menu1" class="${p}btn ${p}menu"><a>↑</a></div>
       <div id="${p}menu2" class="${p}btn ${p}menu"><a>↓</a></div> -->
  <div id="${p}toggle" class="${p}btn"><a></a></div>
</div>
`)
}

const hideToggle=()=>{
  console.log("hideToggle")
  const rapper = document.getElementById(`${p}console`);
  rapper.classList.toggle(`${p}hidetoggle`);
}

const viewsw=()=>{
  navigator.serviceWorker.getRegistration().then(res=>{
    let regist = true
    if (typeof(res)==="undefined") regist = false
    let script = "undefined"
    let state = "undefined"
    if (typeof(navigator.serviceWorker)!=="undefined") {
      if (typeof(navigator.serviceWorker.controller)!=="undefined" && navigator.serviceWorker.controller !== null) {
        script = navigator.serviceWorker.controller.scriptURL
        state = navigator.serviceWorker.controller.state
      }
    }
    let msg = ""
    msg = msg + "&ensp;<&ensp;" + "view service worker info... (show when executing claim after activated or when reload)<br>"
    msg = msg + "&ensp;script:&ensp;" + script + "<br>"
    msg = msg + "&ensp;state:&ensp;" + state + "<br>"
    msg = msg + "&ensp;registration:&ensp;" + regist + "<br>"
    console.log(msg)
  })
}

const delsw=()=>{
  console.log( "&ensp;<&ensp;" + "delete service worker: start" )
  navigator.serviceWorker.getRegistration()
  .then(registration=>registration.unregister())
  .catch(err=>console.log( "&ensp;<&ensp;" + "delete service worker: catch(e):" + err))
  .finally(()=>console.log( "&ensp;<&ensp;" + "delete service worker: end" ))
}

const actCache=async(msg, fdel)=>{
  try {
    const cache = await caches.keys()
    if (cache.length==0) {
      msg = msg + `&ensp;cache nothing<br>`
    } else {
      cache.forEach(cn=>{
        if (fdel) {
          caches.delete(cn)
          msg = msg + `&ensp;${cn} -> delete<br>`
        } else {
          msg = msg + `&ensp;${cn}<br>`
        }
      })
    }
    console.log(msg)
  } catch(e) {
    msg = msg + `&ensp;catch(e): ${e}<br>`
  }
}

const viewCache=async()=>{
  const msg = "&ensp;<&ensp;" + "view cache...<br>"
  actCache(msg, false)
}

const delCache=async()=>{
  const msg = "&ensp;<&ensp;" + "delete cache...<br>"
  actCache(msg, true)
}

const doPost = async(req, url=storage._posturl) => { //jsonオブジェクトを渡して、jsonオブジェクトで返る
  console.log( "&ensp;<&ensp;" + "doPost: start" )
  try {
    if (!navigator.onLine) throw "offline now"
    try {new URL(url)} catch {throw "url error"}
    const js = await fetch(url, {
      "method": "post",
      "Content-Type": "application/json",
      "body": JSON.stringify(req),
    })
    const jo = await js.json()
    if (jo.status == "OK") {
      console.log( "&ensp;<&ensp;" + "doPost: end" )
      return jo.data
    } else {
      console.log( "&ensp;<&ensp;" + "doPost: error: "  + JSON.stringify(jo) )
      throw "response ng"
    }
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "doPost: catch(e): "  + e )
    throw e
  }
}



const viewstorage=()=>{
  let disp="&ensp;<&ensp;" + "view storage...\n"
  Object.keys(localStorage).forEach(key=>{
    if (key==localStorageKey) {
      let size = localStorage[key].length
      let sizestr=""
      if (size>1000000){
        size = Math.ceil(size / 100000) / 10
        sizestr = size + "MB"
      } else if (size>1000){
        size = Math.ceil(size / 100) / 10
        sizestr = size + "KB"
      } else {
        sizestr = size + "byte"
      }
      disp = disp + `"` + key + `"(` + sizestr + `): `
      let jo = JSON.parse(localStorage[key])
      if (jo.log!=undefined) {
        if (jo.log==="") {
          jo.log = ""
        } else {
          jo.log = "..."
        }
      }
      //disp = disp + JSON.stringify(jo, null, "&ensp;").split("\n").join("\n&ensp;")
      disp = disp + JSON.stringify(jo, null, "&ensp;")
      disp = disp + ",\n"
    } else {
      disp = disp + `"` + key + `",\n`
    }
  })
  disp = disp.split("\n").join("<br>")
  console.log(disp)
}

const changeurl=()=>{
  console.log( "&ensp;<&ensp;" + "change URL..." )
  const res = prompt("post name?", (storage._posturl==undefined)?"":storage._posturl)
  if (res != null) storage._posturl=res
  console.log( "&ensp;<&ensp;" + "URL: " + storage._posturl )
}

const send=async()=>{
  console.log( "&ensp;<&ensp;" + "send..." )
  try {
    storage._sendtime = getDateTime()
    const jo = await doPost({
      "action": "set",
      "data": JSON.parse(localStorage[localStorageKey]),
    })
    console.log( "&ensp;<&ensp;" + "send: success, postname: " + jo.postname )
    storage._postname=(storage._postname)?storage._postname:jo.postname
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "send: catch(e): " + e )
    alert(e)
  }
}

const recv=async()=>{
  console.log( "&ensp;<&ensp;" + "receive..." )
  try {
    const jo = await doPost({
      "action": "get",
      "data": {
        "postname": storage._postname,
      },
    })
    console.log( "&ensp;<&ensp;" + "receive: success, postname: " + jo.postname )
    storage._recvtime = getDateTime()
    storage._app=(jo.app)?jo.app:storage._app
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "receive: catch(e): " + e )
    alert(e)
  }
}



let isshow=false
const view=()=>{
storage._usestoragelog
  //document.getElementById(`${p}viewerspan`).innerHTML = storage._log
  const viewer = document.getElementById(`${p}viewer`)
  viewer.scrollTop = viewer.scrollHeight
}

const getUsestoragelogStr=()=>(typeof(storage._usestoragelog)!=="undefined" && storage._usestoragelog)?"in using":"not using"

const addevents=()=>{

  localStorageSetFuncs.push(()=>{if(isshow)view()})

  document.getElementById(`${p}toggle`).addEventListener("click",()=>{
    console.log("toggle: click")
    isshow=(isshow)?false:true
    if (isshow) view()
    const rapper = document.getElementById(`${p}console`)
    rapper.classList.toggle(`${p}hide`)
    //if (isshow) document.getElementById(`${p}cmd`).focus()
    if (!storage._settings.show) hideToggle()
  })

/*
  document.getElementById(`${p}menu1`).addEventListener("click",()=>{
    console.log("menu1: click")
  })

  document.getElementById(`${p}menu2`).addEventListener("click",()=>{
    console.log("menu2: click")
  })
*/

  document.getElementById(`${p}cmd`).addEventListener("focus",(e)=>view())

  document.getElementById(`${p}cmd`).addEventListener("keydown",(e)=>{
    //console.info(e)
    if (e.key=="Enter") {
      let input=document.getElementById(`${p}cmd`).value
      console.log( "&ensp;>&ensp;" + input )
      if (input!="") {
        if (typeof(input)=="string" && input.substring(0,1)=="@") {
          switch (input) {
            case "@vw":
              viewsw()
              break
            case "@dw":
              delsw()
              break
            case "@vc":
              viewCache()
              break
            case "@dc":
              delCache()
              break
            case "@vs":
              viewstorage()
              break
            case "@ds":
              console.log( "&ensp;<&ensp;" + "delete storage: start" )
              initstorage()
              console.log( "&ensp;<&ensp;" + "delete storage: end" )
              break
            case "@sl":
              storage._usestoragelog=(typeof(storage._usestoragelog)==="undefined")?true:!storage._usestoragelog
              let usestr = getUsestoragelogStr()
              document.getElementById(`${p}cmdslnow`).innerHTML = usestr
              const tmp_usestoragelog = storage._usestoragelog
              storage._usestoragelog = true
              console.log( "&ensp;<&ensp;" + `change the use of storage log: ${usestr}` )
              storage._usestoragelog = tmp_usestoragelog
              break
            case "@dl":
              console.log( "&ensp;<&ensp;" + "delete log: start" )
              storage._log = ""
              document.getElementById(`${p}viewerspan`).innerHTML = ""
              console.log( "&ensp;<&ensp;" + "delete log: end" )
              break
            case "@cu":
              changeurl()
              break
            case "@se":
              send()
              break
            case "@re":
              recv()
              break
            case "@ra":
              console.log( "&ensp;<&ensp;" + "reload app..." )
              location.reload(true)
              break
            default:
              console.log( "&ensp;<&ensp;" + "unknown command..." )
              break
          }
        } else {
          try {
            console.log( "&ensp;<&ensp;" + eval(input) )
          } catch(e) {
            console.log( "&ensp;<&ensp;" + e )
          }
        }
      }
      document.getElementById(`${p}cmd`).value=""
    }
  })

}

//globalThis.Console=Object.assign((args={})=>{
const settings=(args={})=>{
  if (iswin) {

    args.show=(typeof(args.show)!=="undefined")?args.show:true
    args.pos=(typeof(args.pos)!=="undefined")?args.pos:"right-bottom" //"right-bottom"(default), "right-top", "left-bottom", "left-top"
    args.posx=(typeof(args.posx)!=="undefined")?args.posx:0
    args.posy=(typeof(args.posy)!=="undefined")?args.posy:0

    if (document.getElementById(`${p}console`)!==null) document.getElementById(`${p}console`).remove()
    storage._settings=args

    addcontents()
    addevents()
    if (!storage._settings.show) hideToggle()

  }
  console.log(`Console.settings: ${JSON.stringify(args)}, isWindow: ${iswin}, isServiceWorker: ${issw}, canBroadcastChannel: ${canbcc}`)
}



globalThis.Console={
  settings: settings,
  storage: storage,
  setfuncs: localStorageSetFuncs,
}

})()

if (typeof(window)!=="undefined") {
  window.addEventListener("DOMContentLoaded", ()=>Console.settings(), true)
} else {
  Console.settings()
}
