/*
[参考]windowsコマンドプロンプトcurlでpost検証した実績
doPost関数は以下1行のみ
return ContentService.createTextOutput(JSON.stringify(e)).setMimeType(ContentService.MimeType.JSON)
  ↓
windowsから発信するコマンド（コマンドプロンプト）
curl  -H "Content-Type: application/json"  -d "{\"key1\":\"123\",\"key2\":\"456\"}" -L "公開URL"
  ↓
返却値
{"postData":{"contents":"{\"key1\":\"123\",\"key2\":\"456\"}","length":27,"name":"postData","type":"application/json"},"contentLength":27,"parameter":{},"parameters":{},"contextPath":"","queryString":""}
*/

/*
  GoogleドライブのURLの以下「xxxxxxxxxxxxxxxx」の値をセット
  https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx
*/

const folderid = "xxxxxxxxxxxxxxxx"

const getContents=(args)=>{
  //console.log("getContents: start, args:" + JSON.stringify(args))
  console.log("getContents: start")
  let isExist=false, folder, file, data=""
  try {
    if (!args.hasOwnProperty("data")) throw "data undefined"
    if (!args.data.hasOwnProperty("postname")) throw "postname undefined"
    if (args.data.postname=="") throw "postname empty"
    //const folderid = args.folder.substr(args.folder.lastIndexOf('/')+1)
    folder = DriveApp.getFolderById(folderid);
    const files = folder.getFiles()
    while (files.hasNext()) {
      file = files.next()
      if (file.getName() === args.data.postname) { //postnameをファイル名として存在チェック
        isExist = true
        data = file.getBlob().getDataAsString("utf-8"); //ファイルをutf-8で読み込み
        break
      }
    }
    return {"status": "OK", "exist": isExist, "folder": folder, "file": file, "data": data};
  } catch(e) {
    return {"status": "NG", "data": e};
  }
}
const get=(args)=>{
  //console.log("get: start, args:" + JSON.stringify(args))
  console.log("get: start")
  try {
    const contents = getContents(args)
    if (contents.status=="OK") {
      if (contents.exist) {
        return {"status": "OK", "data": JSON.parse(contents.data)};
      } else {
        return {"status": "NG", "data": "postname not found"};
      }
    } else {
      throw contents.data
    }
  } catch(e) {
    return {"status": "NG", "data": e};
  }
}
const set=(args)=>{
  //console.log("set: start, args:" + JSON.stringify(args))
  console.log("set: start")
  try {
    let contents = getContents(args)
    if (contents.status=="OK") {
      if (contents.exist) {
        contents.file.setTrashed(true);
        console.log(`set: ${args.data.postname} deleted`)
      }
    } else if (contents.data=="postname undefined" || contents.data=="postname empty") {
      let f=true
      do {
        args.data.postname = Math.random().toString(36).substring(2)
        contents = getContents(args)
        if (contents.status=="OK" && !contents.exist) f=false
      } while(f)
    } else {
      throw contents.data
    }
    const data = JSON.stringify(args.data); //受信したdataを文字列変換
    const file = DriveApp.createFile(args.data.postname, data, MimeType.PLAIN_TEXT); //IDをファイル名にしてプレーンテキストでファイル作成
    file.moveTo(contents.folder)
    return {"status": "OK", "data": {"postname": args.data.postname}};
  } catch(e) {
    return {"status": "NG", "data": e};
  }
}

const main=(args)=>{
  console.log("main: start, args:" + JSON.stringify(args))
  let res={};
  switch (args.action) {
    case "set":
      res = set(args)
      break
    case "get":
      res = get(args)
      break
    default:
      res = {"status": "NG", "data": "action error"};
  }
  res.req = args
  return res
}

/*
const reqJson = {
  action: "get",
  data: {
    postname: "6cvgl7tzxye",
  },
}
*/

/*
const reqJson = {
  action: "set",
  data: {
    "postname": "test3.txt",
    "key1": "xxxx",
    "log": "3023-02-03.20:15:10.010|start\\n3023-02-03.20:20:10.010|end\\n",
  }
}
*/

/*
const reqJson = {
  action: "set",
  data: {
    "postname": "",
    "key1": "xxxx",
    "log": "bbbb\\ncccc\\n",
  }
}
*/

/*
const reqJson = {
  action: "set",
  data: {
    "key1": "xxxx",
    "log": "dddd\\neeee\\n",
  }
}
*/

/*
function doPostTest(){
  console.log("doPostTest: start")
  let resJson = main(reqJson)
  console.log(resJson)
}
*/

/*
function doPost(e){
  return ContentService.createTextOutput(JSON.stringify(e)).setMimeType(ContentService.MimeType.JSON)
}
*/

function doPost(e){
  console.log("doPost: start")
  let reqJson = JSON.parse(e.postData.getDataAsString());
  let resJson = main(reqJson)
  return ContentService.createTextOutput(JSON.stringify(resJson)).setMimeType(ContentService.MimeType.JSON);
}






