"use strict";
globalThis.Console=async(args={})=>{
const VERSION = "1.0.0"
const iswin = (typeof(window)!=="undefined")
const issw  = (typeof(ServiceWorkerGlobalScope)!=="undefined")
const canbcc = (typeof(globalThis.BroadcastChannel)!=="undefined")



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



const idbdict={}
const idbfunc=(args={})=>{

  const fake=(typeof(args.fake)!=="undefined")?args.fake:false
  const version=(typeof(args.version)!=="undefined")?args.version:1
  //const dbname=(typeof(args.dbname)!=="undefined")?getPrefix()+args.dbname:getPrefix()
  let dbname=""
  if (fake) {
    if (typeof(args.dbname)!=="undefined") {
      dbname=args.dbname
    } else {
      console.log("idb error: dbname not found")
      return
    }
  } else {
    dbname=(typeof(args.dbname)!=="undefined")?getPrefix()+args.dbname:getPrefix()
  }
  let objnames=[]
  if (typeof(args.objnames)!=="undefined") {
    objnames = [...args.objnames]
  } else {
    console.log("idb error: objnames not found")
    return
  }

  idbdict.clear=()=>{
    return new Promise((resolve, reject)=>{
      if (fake) {
        delete globalThis[dbname]
        resolve()
      } else {
        const req = indexedDB.deleteDatabase(dbname)
        req.onerror=()=>reject()
        req.onsuccess=()=>resolve()
      }
    })
  }

  idbdict.obj=(objname)=>{

    if (!objnames.includes(objname)) return undefined

    const commonfunc=(f, k="", v="")=>{
      return new Promise((resolve, reject)=>{
        if (fake) {
          let result
          switch(f){
            case "set":
              globalThis[dbname][objname][k]=v
              result=true
              break
            case "get":
              result=globalThis[dbname][objname][k]
              break
            case "keys":
              result=Object.keys(globalThis[dbname][objname])
              break
            case "delete":
              delete globalThis[dbname][objname][k]
              break
            case "clear":
              globalThis[dbname][objname]={}
              break
            default:
              break
          }
          resolve(result)
        } else {
          const req = indexedDB.open(dbname, version)
          req.onerror=()=>reject()
          req.onsuccess=(ev)=>{
            let req
            switch(f){
              case "set":
                req = ev.target.result.transaction(objname, "readwrite").objectStore(objname).put(v, k)
                //console.info(`[set]k:${k},v:${v}`)
                break
              case "get":
                req = ev.target.result.transaction(objname, "readonly").objectStore(objname).get(k)
                break
              case "keys":
                req = ev.target.result.transaction(objname, "readonly").objectStore(objname).getAllKeys()
                break
              case "delete":
                req = ev.target.result.transaction(objname, "readwrite").objectStore(objname).delete(k)
                break
              case "clear":
                req = ev.target.result.transaction(objname, "readwrite").objectStore(objname).clear()
                break
              default:
                break
            }
            req.onerror=()=>reject()
            req.onsuccess=()=>{
              ev.target.result.close()
              resolve(req.result)
            }
          }
        }
      })
    }

    const objdict={}
    objdict.set=(k, v)=>commonfunc("set", k, v)
    objdict.get=(k)=>commonfunc("get", k)
    objdict.keys=()=>commonfunc("keys")
    objdict.delete=(k)=>commonfunc("delete", k)
    objdict.clear=()=>commonfunc("clear")

    const objfunc=(args)=>{
      if (typeof(args)==="object") {
        objdict.clear()
        for(let key in args) objdict.set(key, args[key])
      } else {
        return new Promise((resolve, reject)=>{
          objdict.keys().then(keys=>{
            let promises=[], o={}
            for(let key of keys) promises.push(objdict.get(key).then(v=>o[key]=v))
            Promise.all(promises).then(()=>resolve(o))
          })
        })
      }
    }

    return Object.assign(objfunc, {...objdict})
  }

  return new Promise((resolve, reject)=>{
    if (fake) {
      globalThis[dbname]={}
      for(let objname of objnames) globalThis[dbname][objname]={}
      resolve({...idbdict})
    } else {
      const req = indexedDB.open(dbname, version)
      req.onupgradeneeded=(ev)=>{
        for(let objname of objnames) ev.target.result.createObjectStore(objname, {autoIncrement:false})
      }
      req.onerror=()=>reject()
      req.onsuccess=(ev)=>{
        ev.target.result.close()
        resolve({...idbdict})
      }
    }
  })
}

const IndexedDB=Object.assign(idbfunc, {...idbdict})



const storageName = "ConsoleIDB"
let storages, storage_app, storage_info, storage_logsw, storage_logwin

const storagesinit=async(fake=true)=>{
  storages = await IndexedDB({
    "fake": fake,
    "version": 1,
    "dbname": storageName,
    "objnames": [
      "app",
      "info",
      "logsw",
      "logwin",
    ],
  })
  storage_app = storages.obj("app")
  storage_info = storages.obj("info")
  storage_logsw = storages.obj("logsw")
  storage_logwin = storages.obj("logwin")
}
await storagesinit()



let storageSetFuncs=[]
/*
//sample
storageSetFuncs.push((k, v)=>{
  console.log("set " + storageName + "." + k + ":" + v)
})
*/

const isStoragePrefix=(k)=>(typeof(k)=="string")?k.substring(0, 1)=="_":false
const getStoragePrefixDel=(k)=>k.substring(1)

let setque=[], setrunning=false
const storagedict={}
storagedict.set=async(k, v)=>{
  setque.push([k, v])
  await new Promise(resolve=>{
    let id=setInterval(()=>{
      if (!setrunning) {
        clearInterval(id)
        resolve()
      }
    }, 1)
  })
  setrunning=true
  while (setque.length>0) {
    const args= setque.shift()
    k=args[0], v=args[1]
    if (isStoragePrefix(k)) {
      if (k=="_log") {
        await new Promise(resolve=>setTimeout(resolve,1))
        const settime = getDateTime()
        if (typeof(v)==="string" && (v.substring(0,13)=="&ensp;<&ensp;" || v.substring(0,13)=="&ensp;>&ensp;")) {
          const viewmode = await storage_info.get("viewmode")
          if (viewmode=="sw") {
            await storage_logsw.set(settime, v)
          } else {
            await storage_logwin.set(settime, v)
          }
        } else {
          if (issw) {
            await storage_logsw.set(settime, v)
          } else {
            await storage_logwin.set(settime, v)
          }
        }
      } else {
        await storage_info.set(getStoragePrefixDel(k), v)
      }
    } else {
      await storage_app.set(k, v)
    }
  }
  await storage_info.set("localtime", getDateTime())
  storageSetFuncs.forEach(f=>f(p, v))
  setrunning=false
  return true
}
storagedict.get=async(k)=>{
  let v
  if (isStoragePrefix(k)) {
    if (k=="_log") {
      if (iswin) {
        v = await storage_logwin()
      } else {
        v = await storage_logsw()
      }
    } else {
      v = await storage_info.get(getStoragePrefixDel(k))
    }
  } else {
    v = await storage_app.get(k)
  }
  return v
}
storagedict.keys=async()=>{
  let obj = await storagefunc()
  return Object.keys(obj)
}
storagedict.delete=async(k)=>{
  let r
  if (isStoragePrefix(k)) {
    if (k=="_log") {
      if (iswin) {
        r = await storage_logwin.delete(k)
      } else if (issw) {
        r = await storage_logsw.delete(k)
      } else {
        r = await storage_info.delete(getStoragePrefixDel(k))
      }
    } else {
      r = await storage_info.delete(getStoragePrefixDel(k))
    }
  } else {
    r = await storage_app.delete(k)
  }
  return r
}
storagedict.clear=async()=>{
  let r
  r = await storage_logwin.clear()
  r = await storage_logsw.clear()
  r = await storage_info.clear()
  r = await storage_app.clear()
  return r
}

storagedict.getAllKeysValues=async()=>{
  const obj_app = await storage_app()
  const obj_info = await storage_info()
  const obj_logsw = await storage_logsw()
  const obj_logwin = await storage_logwin()
  const obj = {
    "app":obj_app,
    "info":obj_info,
    "logsw":obj_logsw,
    "logwin":obj_logwin,
  }
  return obj
}

const storagefunc=async(args)=>{
  if (typeof(args)==="object") {
    await storage_app().clear
    await storage_app(args)
    return args
  } else {
    let obj = await storage_app()
    for (let key of (await storage_info.keys())) {
      obj["_"+key] = await storage_info.get(key)
    }
    return obj
  }
}
const storage=Object.assign(storagefunc, storagedict)

const initstorage=async()=>{
  await storage.clear()
}

const p = "Console_js_"

const addconsole=()=>{
  let consoleLogBackup=console.log
  Object.defineProperty(console, "log", {
    value: async(...args)=>{
      for (const arg of args) {
        consoleLogBackup(getDateTime() + "|" + arg)
        await storage.set("_log", arg)
      }
      if (isshow) viewlog()
    },
  })
}
addconsole()

const addcontents=async()=>{
const _settings = await storage.get("_settings")
document.body.insertAdjacentHTML("beforeend", String.raw`
<span id="${p}console_container">
<style>

#${p}console {
  text-size-adjust:100%;
  -webkit-text-size-adjust:100%;
  position:fixed;
  right:30px;
  left:inherit;
  top:inherit;
  bottom:30px;
  display:flex;
  flex-distoragetion:column;
  z-index:9999;
}

#${p}viewer {
  font-size:0.75rem;
  font-family:Menlo,consolas,monospace;
  background:#ffffff;
  position:fixed;
  right:0px;
  left:inherit;
  top:inherit;
  bottom:0px;
  width:100%;
  height:100%;
  overflow:auto;
  overflow-x:hidden;
  word-break:break-all;
  justify-content:flex-end;
  -webkit-overflow-scrolling:touch;
  transition:all 0.5s ease;
}
@media (min-width:650px) and (min-height:650px) {
  #${p}viewer {
    right:100px;
    left:inherit;
    top:inherit;
    bottom:60px;
    width:80%;
    height:80%;
    max-width:600px;
    max-height:800px;
    box-shadow:0 0 3px 0 rgb(0 0 0 / 12%), 0 2px 3px 0 rgb(0 0 0 / 22%);
    border-radius:3px;
  }
}

.${p}blankspace {
  width:100%;
  margin:0;
  position:relative;
}

.${p}line {
  margin:0;
  line-height:1.2rem;
  border-bottom:1px solid #eee;
  position:relative;
}

.${p}str {
  margin:0 5px 0 5px;
  line-height:1.2rem;
}

.${p}ver {
  text-align:right;
}

.${p}cmd {
  font-weight:900;
  color:#314de7
}

#${p}cmdclnow {
  font-weight:900;
  color:#314de7
}

#${p}cmd {
  font-size:0.75rem;
  font-family:Menlo,consolas,monospace;
  margin:0;
  padding:0;
  border:none;
  outline:none;
}

.${p}btn {
  display:flex;
  align-items:baseline;
  transition:all 0.5s ease;
  position:relative;
}
.${p}btn a {
  font-family:Menlo,consolas,monospace;
  font-weight:900;
  color:#ffffff;
  background:#b6b6b6;
  width:58px;
  height:58px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:9999px;
  box-shadow:0 0 6px 0 rgb(0 0 0 / 15%), 0 4px 5px 0 rgb(0 0 0 / 22%);
  position:relative;
  cursor:pointer;
}

.${p}btn a:before {
  z-index:2;
  transform:translate(-50%, -50%);
}

.${p}menu {
  font-size:1.5rem;
  margin-bottom:15px;
}

#${p}toggle a:before {
  font-size:1.7rem;
  content:"－";
  position:absolute;
  top:50%;
  left:50%;
  z-index:1;
}

#${p}console.${p}hide > #${p}viewer {
  right:50px;
  bottom:50px;
  width:0;
  height:0;
}

#${p}console.${p}hide > .${p}menu {
  margin-bottom:0;
  height:0;
}

#${p}console.${p}hide > #${p}toggle a:before {
  content:"＋";
}



#${p}console.${p}hide.${p}right-bottom {
  right:calc(30px - ${_settings.posx}px);
  left:inherit;
  top:inherit;
  bottom:calc(30px - ${_settings.posy}px);
  transition:all 0.5s ease;
}

#${p}console.${p}hide.${p}right-bottom > #${p}viewer {
  right:calc(60px - ${_settings.posx}px);
  left:inherit;
  top:inherit;
  bottom:calc(60px - ${_settings.posy}px);
}



#${p}console.${p}hide.${p}right-top {
  right:calc(30px - ${_settings.posx}px);
  left:inherit;
  top:calc(30px + ${_settings.posy}px);
  bottom:inherit;
  transition:all 0.5s ease;
}

#${p}console.${p}hide.${p}right-top > #${p}viewer {
  right:calc(60px - ${_settings.posx}px);
  left:inherit;
  top:calc(60px + ${_settings.posy}px);
  bottom:inherit;
}



#${p}console.${p}hide.${p}left-bottom {
  right:inherit;
  left:calc(30px + ${_settings.posx}px);
  top:inherit;
  bottom:calc(30px - ${_settings.posy}px);
  transition:all 0.5s ease;
}

#${p}console.${p}hide.${p}left-bottom > #${p}viewer {
  right:inherit;
  left:calc(60px + ${_settings.posx}px);
  top:inherit;
  bottom:calc(60px - ${_settings.posy}px);
}



#${p}console.${p}hide.${p}left-top {
  right:inherit;
  left:calc(30px + ${_settings.posx}px);
  top:calc(30px + ${_settings.posy}px);
  bottom:inherit;
  transition:all 0.5s ease;
}

#${p}console.${p}hide.${p}left-top > #${p}viewer {
  right:inherit;
  left:calc(60px + ${_settings.posx}px);
  top:calc(60px + ${_settings.posy}px);
  bottom:inherit;
}



#${p}console.${p}hidetoggle > #${p}toggle {
  opacity:0;
}

</style>
<div id="${p}console" class="${p}${_settings.pos} ${p}hide">
  <div id="${p}viewer">
    <span id="${p}viewerspan"></span>
    <div class="${p}line">
      <div class="${p}str">&ensp;<span class="${p}cmd">></span>&ensp;<input type="text" id="${p}cmd" style="width:90%; box-sizing:border-box"/></div>
    </div>
    <div class="${p}blankspace">
      <div class="${p}str">&ensp;</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvw" class="${p}cmd">@&ensp;&ensp;</span> previous command</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvw" class="${p}cmd">@vw</span> view service worker</div>
      <div class="${p}str">&ensp;<span id="${p}cmddw" class="${p}cmd">@dw</span> delete service worker</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvc" class="${p}cmd">@vc</span> view cache</div>
      <div class="${p}str">&ensp;<span id="${p}cmddc" class="${p}cmd">@dc</span> delete cache</div>
      <div class="${p}str">&ensp;<span id="${p}cmdvs" class="${p}cmd">@vs</span> view storage</div>
      <div class="${p}str">&ensp;<span id="${p}cmdds" class="${p}cmd">@ds</span> delete storage</div>
      <div class="${p}str">&ensp;<span id="${p}cmdsl" class="${p}cmd">@cl</span> change log view mode (currently <span id="${p}cmdclnow">${await getViewMode()}</span>)</div>
      <div class="${p}str">&ensp;<span id="${p}cmddl" class="${p}cmd">@dl</span> delete log</div>
      <div class="${p}str">&ensp;<span id="${p}cmdcu" class="${p}cmd">@cn</span> change name</div>
      <div class="${p}str">&ensp;<span id="${p}cmdcu" class="${p}cmd">@cu</span> change url</div>
      <div class="${p}str">&ensp;<span id="${p}cmdse" class="${p}cmd">@su</span> send to url</div>
      <div class="${p}str">&ensp;<span id="${p}cmdre" class="${p}cmd">@ru</span> receive from url</div>
      <div class="${p}str">&ensp;<span id="${p}cmdra" class="${p}cmd">@ra</span> reload app</div>
      <div class="${p}str ${p}ver">${VERSION}&ensp;</div>
    </div>
  </div>
  <!-- <div id="${p}menu1" class="${p}btn ${p}menu"><a>↑</a></div>
       <div id="${p}menu2" class="${p}btn ${p}menu"><a>↓</a></div> -->
  <div id="${p}toggle" class="${p}btn"><a></a></div>
</div>
</span>
`)
}



const hideToggle=()=>{
  //console.log("hideToggle")
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
        script = navigator.serviceWorker.controller.scripturl
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
  console.log( "&ensp;<&ensp;" + "delete service worker start" )
  navigator.serviceWorker.getRegistration()
  .then(registration=>registration.unregister())
  .catch(err=>console.log( "&ensp;<&ensp;" + "delete service worker catch(e): " + err))
  .finally(()=>console.log( "&ensp;<&ensp;" + "delete service worker end" ))
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

const viewstorage=async()=>{
  let disp="&ensp;<&ensp;" + "view storage...\n"
  let jo = await storage.getAllKeysValues()
  const js=JSON.stringify(jo)
  let size = js.length
  let sizestr=""
  if (size>1000000) {
    size = Math.ceil(size / 100000) / 10
    sizestr = size + "MB"
  } else if (size>1000) {
    size = Math.ceil(size / 100) / 10
    sizestr = size + "KB"
  } else {
    sizestr = size + "byte"
  }
  disp = disp + `"` + storageName + `"(` + sizestr + `): `
  delete jo.logsw
  delete jo.logwin
  disp = disp + JSON.stringify(jo, null, "&ensp;")
  disp = disp + ",\n"
  disp = disp.split("\n").join("<br>")
  console.log(disp)
}

const deletelog=async()=>{
  console.log( "&ensp;<&ensp;" + "delete log start" )
  await new Promise(resolve=>setTimeout(resolve, 500))
  document.getElementById(`${p}viewerspan`).innerHTML = ""
  arr_viewer=[]
  await storage_logsw.clear()
  await storage_logwin.clear()
  console.log( "&ensp;<&ensp;" + "delete log end" )
  return true
}

const doPost = async(req, url) => { //jsonオブジェクトを渡して、jsonオブジェクトで返る
  if (typeof(url)==="undefined") url = await storage.get("_posturl")
  console.log( "&ensp;<&ensp;" + "doPost start" )
  try {
    if (!navigator.onLine) throw "offline now"
    try {new URL(url)} catch {throw "url error"}
    const js = await fetch(url, {
      "method":"post",
      "Content-Type":"application/json",
      "body":JSON.stringify(req),
    })
    const jo = await js.json()
    if (jo.status == "OK") {
      console.log( "&ensp;<&ensp;" + "doPost end" )
      return jo.data
    } else {
      console.log( "&ensp;<&ensp;" + "doPost error: "  + JSON.stringify(jo) )
      throw "response ng"
    }
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "doPost catch(e): "  + e )
    throw e
  }
}

const postname=async(args)=>{
  if (typeof(args)!=="undefined" && args != null) await storage.set("_postname", args)
  return await storage.get("_postname")
}

const changename=async()=>{
  console.log( "&ensp;<&ensp;" + "change name..." )
  let pn = await storage.get("_postname")
  const res = prompt("post name?", (postname==undefined)?"":pn)
  pn = await postname(res)
  console.log( "&ensp;<&ensp;" + "name: " + pn )
}

const posturl=async(args)=>{
  if (typeof(args)!=="undefined" && args != null) await storage.set("_posturl", args)
  return await storage.get("_posturl")
}

const changeurl=async()=>{
  console.log( "&ensp;<&ensp;" + "change url..." )
  let pu = await storage.get("_posturl")
  const res = prompt("post url?", (posturl==undefined)?"":pu)
  pu = await posturl(res)
  console.log( "&ensp;<&ensp;" + "url: " + pu )
}

const postsend=async()=>{
  console.log( "&ensp;<&ensp;" + "send..." )
  try {
    let obj = await storage.getAllKeysValues()
    await storage.set("_sendtime", getDateTime())
    const jo = await doPost({
      "action":"set",
      "data":obj,
    })
    console.log( "&ensp;<&ensp;" + "send success, postname:" + jo.info.postname )
    if (jo.info.postname) await storage.set("_postname", jo.info.postname)
    return jo.info.postname
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "send catch(e): " + e )
    alert(e)
  }
}

const postrecv=async()=>{
  console.log( "&ensp;<&ensp;" + "receive..." )
  try {
    const postname = await storage.get("_postname")
    const jo = await doPost({
      "action":"get",
      "data":{
        "info":{
          "postname":postname,
        },
      },
    })
    console.log( "&ensp;<&ensp;" + "receive success, postname:" + jo.info.postname )
    await storage.set("_recvtime", getDateTime())
    if (jo.app) await storage_app(jo.app)
    return jo.app
  } catch(e) {
    console.log( "&ensp;<&ensp;" + "receive catch(e): " + e )
    alert(e)
  }
}



let isshow=false, arr_viewer=[]
const viewlog=async()=>{
  let arr_sw=[]
  const jo_sw = await storage_logsw()
  for (let key in jo_sw) arr_sw.push(`<div class="${p}line"><div class="${p}str">${[key]}|${jo_sw[key]}</div></div>`)
  let arr_win=[]
  const jo_win = await storage_logwin()
  for (let key in jo_win) arr_win.push(`<div class="${p}line"><div class="${p}str">${[key]}|${jo_win[key]}</div></div>`)
  let arr_all=[]
  const viewmode = await storage.get("_viewmode")
  if (typeof(viewmode)==="undefined" || viewmode=="all") {
    arr_all=arr_sw.concat(arr_win)
  } else if (viewmode=="sw") {
    arr_all=arr_sw.concat()
  } else if (viewmode=="other than sw") {
    arr_all=arr_win.concat()
  }
  arr_all.sort()
  let arr_diff=[]
  if (arr_viewer.length === 0) {
    document.getElementById(`${p}viewerspan`).innerHTML=""
    arr_diff=arr_all.concat()
  } else {
    arr_diff=arr_all.filter(i=>arr_viewer.indexOf(i)==-1)
  }
  document.getElementById(`${p}viewerspan`).insertAdjacentHTML("beforeend", arr_diff.join(""))
  arr_viewer=arr_viewer.concat(arr_diff)
  const viewer = document.getElementById(`${p}viewer`)
  viewer.scrollTop = viewer.scrollHeight
}

const getViewMode=async()=>{
  const viewmode = await storage.get("_viewmode")
  if (typeof(viewmode)==="undefined") {
    return "all"
  } else {
    return viewmode
  }
}



const addevents=async()=>{
  //storageSetFuncs.push(()=>{if(isshow)viewlog()})
  document.getElementById(`${p}toggle`).addEventListener("click",async()=>{
    console.log("toggle click")
    isshow=(isshow)?false:true
    if (isshow) viewlog()
    const rapper = document.getElementById(`${p}console`)
    rapper.classList.toggle(`${p}hide`)
    //if (isshow) document.getElementById(`${p}cmd`).focus()
    const _settings = await storage.get("_settings")
    if (!_settings.show) hideToggle()
  })

/*
  document.getElementById(`${p}menu1`).addEventListener("click",()=>{
    console.log("menu1 click")
  })

  document.getElementById(`${p}menu2`).addEventListener("click",()=>{
    console.log("menu2 click")
  })
*/

  document.getElementById(`${p}cmd`).addEventListener("focus",(e)=>viewlog())

  document.getElementById(`${p}cmd`).addEventListener("keydown",async(e)=>{
    //console.info(e)
    if (e.key=="Enter") {
      let input=document.getElementById(`${p}cmd`).value
      console.log( "&ensp;>&ensp;" + input )
      if (input!="") {
        if (input!="@") await storage.set("_precmd", input)
        if (typeof(input)=="string" && input.substring(0,1)=="@") {
          switch (input) {
            case "@":
              break
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
              console.log( "&ensp;<&ensp;" + "delete storage start" )
              await deletelog()
              await initstorage()
              console.log( "&ensp;<&ensp;" + "delete storage end" )
              break
            case "@cl":
              let viewmode = await storage.get("_viewmode")
              if (typeof(viewmode)==="undefined" || viewmode=="all") {
                viewmode = "other than sw"
              } else if (viewmode=="other than sw") {
                viewmode = "sw"
              } else if (viewmode=="sw") {
                viewmode = "all"
              }
              await storage.set("_viewmode", viewmode)
              document.getElementById(`${p}cmdclnow`).innerHTML = viewmode
              arr_viewer=[]
              console.log( "&ensp;<&ensp;" + `changed log view mode: ${viewmode}` )
              break
            case "@dl":
              await deletelog()
              break
            case "@cn":
              changename()
              break
            case "@cu":
              changeurl()
              break
            case "@su":
              postsend()
              break
            case "@ru":
              postrecv()
              break
            case "@ra":
              console.log( "&ensp;<&ensp;" + "reload app..." )
              await new Promise(resolve=>setTimeout(resolve, 500))
              location.reload(true)
              break
            default:
              console.log( "&ensp;<&ensp;" + "unknown command..." )
              break
          }
        } else {
          try {
            //console.log( "&ensp;<&ensp;" + eval(input) )
            if (input.indexOf("Console.settings")===-1) {
              let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
              let f = new AsyncFunction(`return ${input}`)
              let r = await f()
              console.log( "&ensp;<&ensp;" + r )
            } else {
              throw `Cannot run "Console.settings"`
            }
          } catch(e) {
            console.log( "&ensp;<&ensp;" + e )
          }
        }
      }
      if (input!="@") {
        document.getElementById(`${p}cmd`).value=""
      } else {
        const precmd = await storage.get("_precmd")
        document.getElementById(`${p}cmd`).value = (typeof(precmd)==="undefined")?"":precmd
      }
    }
  })

}

//globalThis.Console=Object.assign((args={})=>{
const settings=async(args={})=>{
  args.storage=(typeof(args.storage)!=="undefined")?args.storage:false
  if (args.storage) {
    await storagesinit(false)
    for (let k in globalThis[storageName]["app"]) storage_app.set(k, globalThis[storageName]["app"][k])
    for (let k in globalThis[storageName]["info"]) storage_info.set(k, globalThis[storageName]["info"][k])
    for (let k in globalThis[storageName]["logsw"]) storage_logsw.set(k, globalThis[storageName]["logsw"][k])
    for (let k in globalThis[storageName]["logwin"]) storage_logwin.set(k, globalThis[storageName]["logwin"][k])
    await delete globalThis[storageName]
  }
  if (iswin) {
    args.show=(typeof(args.show)!=="undefined")?args.show:true
    args.pos=(typeof(args.pos)!=="undefined")?args.pos:"right-bottom" //"right-bottom"(default), "right-top", "left-bottom", "left-top"
    args.posx=(typeof(args.posx)!=="undefined")?args.posx:0
    args.posy=(typeof(args.posy)!=="undefined")?args.posy:0
    if (document.getElementById(`${p}console_container`)!==null) document.getElementById(`${p}console_container`).remove()
    await storage.set("_settings", args)
    await addcontents()
    await addevents()
    if (!args.show) hideToggle()
  }
  console.log(`Console.settings:${JSON.stringify(args)}, isWindow:${iswin}, isServiceWorker:${issw}, canBroadcastChannel:${canbcc}`)

}
await settings(args)



Object.assign(globalThis.Console,{
  "settings":settings,
  "storage":storage,
  "setfuncs":storageSetFuncs,
  "deletelog":deletelog,
  "postname":postname,
  "posturl":posturl,
  "postsend":postsend,
  "postrecv":postrecv,
})
return storage
}
globalThis.Console.promise=Console()
