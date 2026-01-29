"use strict";
globalThis.Console=async(args={})=>{
const VERSION = "2.1.6"
const iswin = (typeof(window)!=="undefined")
const issw  = (typeof(ServiceWorkerGlobalScope)!=="undefined")
const canbcc = (typeof(globalThis.BroadcastChannel)!=="undefined")



/**
 * common
 */

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
  const res = Year + "-" + Month + "-" + Day + "T" + Hours + ":" + Minutes + ":" + Seconds + "." + mSeconds
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
        return href.slice(0, href.lastIndexOf("/")+1)
      } else {
        return href + "/"
      }
    } else {
      return href.slice(0, pos)
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

// 文字省略
const truncateText=(str, maxLength = 30)=>{
  // 文字列が指定した長さより長い場合、切り詰めて"..."を追加
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}



/**
 * gis
 */
const gis={}
gis.isProcessing = false; // 処理中フラグ

// 認証ヘッダー付きでfetchを実行
gis.authfetch=async(url, options={})=>{
  // console.log(`[gis.authfetch] start url:${url}, options:${truncateText(JSON.stringify(options))}`);
  try {
    if (!navigator.onLine) throw new Error(`ネットワークに接続されていません。接続後に再度実施してください。`);
    if (!gis.accessToken) throw new Error(`トークンがないため認証不可。ログイン後に再度実施してください。`);
    const authOptions = {
      ...options,
      headers: { ...options.headers, 'Authorization': `Bearer ${gis.accessToken}` }
    };
    const response = await fetch(url, authOptions);
    // console.log(`[gis.authfetch] status: ${response.status}`);
    if (!response.ok) {
      const errorDetail = await response.json().catch(() => ({}));
      console.log(`[gis.authfetch] errorDetail: ${JSON.stringify(errorDetail)}`); // エラー詳細表示
      if (response.status === 401) throw new Error(`通信時にエラーが発生しました。セッションの有効期限が切れた可能性が高いため、アプリを再起動してください。`); // 認証情報の不足、もしくは無効
      if (response.status === 403) throw new Error(`通信時にエラーが発生しました。ログイン時にGoogleDriveアクセス許可欄にチェックしていない、もしくは反映に時間がかかっている可能性があります。アプリを複数回再起動してください。`); // 認証が失敗
    }
    // console.log(`[gis.authfetch] normal end`);
    return response;
  } catch(e) {
    const msg = `[gis.authfetch] ${e}`
    // console.log(msg);
    throw msg;
    // throw new Error(msg);
  }
}

// ファイル名からファイルIDを検索する(同一ファイル名が複数ある場合は代表1件のidを返却)
gis.findFileId=async(filename)=>{
  try {
    const q = encodeURIComponent(`name = '${filename}' and 'root' in parents and trashed = false`);
    const res = await gis.authfetch(`https://www.googleapis.com/drive/v3/files?q=${q}`);
    const json = await res.json();
    return json.files && json.files.length > 0 ? json.files[0].id : null;
  } catch(e) {
    throw e;
    // throw new Error(e);
  }
};

// ファイルを読み込む(ファイルが存在しないときはnull、取得できたときはjsonオブジェクトで返却）
gis.readFile=async(filename)=>{
  try {
    const fileId = await gis.findFileId(filename);
    let resObj = null;
    if (fileId) {
      const res = await gis.authfetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      resObj = await res.json();
    }
    return resObj;
  } catch(e) {
    throw e;
    // throw new Error(e);
  }
};

// ファイルを保存(新規作成or更新)
gis.saveFile=async(filename, contentObj)=>{
  try {
    const fileId = await gis.findFileId(filename);
    const boundary = 'sync_boundary_' + Date.now();
    const mimeType = 'text/plain';
    const metadata = { name: filename, mimeType: mimeType };
    if (!fileId) {
      // 新規作成 (Multipart upload)
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
                  `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${JSON.stringify(contentObj, null, "  ")}\r\n` +
                  `--${boundary}--`;
      await gis.authfetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: body
      });
    } else {
      // 既存更新 (Simple media update)
      await gis.authfetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': mimeType },
        body: JSON.stringify(contentObj, null, "  ")
      });
    }
  } catch(e) {
    throw e;
    // throw new Error(e);
  }
};

// アプリデータ同期
gis.sync=async(isTouchProcessing=true)=>{
  if (isTouchProcessing) gis.isProcessing = true;
  console.log(`[gis.sync] start`);
  let action = "none"
  try {
    const user = await storage_info.get("user");
    if (!user) throw new Error(`ユーザ情報が存在しません。ログイン後に再度実施してください。`);

    // ローカルデータの取得（storageオブジェクトを想定）
    const localData = await storage_app.get(user.id) || { datetime: "1970-01-01T00:00:00.000", data: {} };

    // Drive上の datetime ファイルを取得
    const driveTimeObj = await gis.readFile(`${gis.appName}.datetime.json.txt`);

    // 最新性の判定
    const localTime = new Date(localData.datetime).getTime();
    const driveTime = driveTimeObj ? new Date(driveTimeObj.datetime).getTime() : 0;
    console.log(`[gis.isLastestLocal] local:${localData.datetime}, drive:${driveTimeObj?.datetime || 'none'}`);

    if (localTime > driveTime) {
      console.log(`[gis.sync] ローカルが最新。アップロードしてドライブを上書きします。`);
      await gis.saveFile(`${gis.appName}.data.json.txt`, localData.data); // データファイルを保存
      await gis.saveFile(`${gis.appName}.datetime.json.txt`, { datetime: localData.datetime }); // 日時ファイルを保存
      console.log(`[gis.sync] アップロードが成功しました`);
      action = "upload"
    } else if (localTime < driveTime) {
      console.log(`[gis.sync] ドライブが最新。ダウンロードしてローカルを上書きします。`);
      const driveDataObj = await gis.readFile(`${gis.appName}.data.json.txt`);
      await storage_app.set(user.id, { // ローカルを更新
        datetime: driveTimeObj.datetime,
        data: driveDataObj
      });
      console.log(`[gis.sync] ダウンロードが成功しました`);
      action = "download"
    } else {
      console.log(`[gis.sync] ローカルとドライブは同一です。`);
    }
    if (isTouchProcessing) gis.isProcessing = false;
  } catch (e) {
    console.log(`[gis.sync] ${e}`);
    if (isTouchProcessing) gis.isProcessing = false;
    throw e;
    // throw new Error(e);
  }
  console.log(`[gis.sync] end`);
  return action
};

// 送信用ログ配列作成
gis.makeLogArray=async()=>{
  let arr_sw=[]
  const jo_sw = await storage_logsw()
  for (let key in jo_sw) arr_sw.push(`${[key]}|${jo_sw[key]}`)
  let arr_win=[]
  const jo_win = await storage_logwin()
  for (let key in jo_win) arr_win.push(`${[key]}|${jo_win[key]}`)
  let arr_all=[]
  arr_all=arr_sw.concat(arr_win)
  arr_all.sort()
  return arr_all
}

// ログ送信
gis.sendLog=async()=>{
  gis.isProcessing = true;
  console.log(`[gis.sendLog] start`);
  const LOG_FILE = `${gis.appName}.log.json.txt`;
  try {
    if (!navigator.onLine) throw new Error(`ネットワークに接続されていません。接続後に再度実施してください。`);
    const user = await storage_info.get("user")
    if (!user) throw new Error(`ユーザ情報が存在しません。ログイン後に再度実施してください。`);
    const logText = await gis.makeLogArray()
    await gis.saveFile(LOG_FILE, logText); // ログファイルを保存
    console.log(`[gis.sendLog] Driveへの送信完了`);
    gis.isProcessing = false;
  } catch (e) {
    console.log(`[gis.sendLog] ${e}`);
    // alert("送信中にエラーが発生しました。");
    gis.isProcessing = false;
  }
  console.log(`[gis.sendLog] end`);
};

// ユーザー情報取得
gis.fetchUserInfo=async()=>{
  try {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const res = await gis.authfetch(url);
    // console.log(`[gis.fetchUserInfo] status: ${res.status}`);
    if (!res.ok) throw new Error(`ユーザ情報の取得に失敗しました。`);
    const jsonTxt = await res.text();
    // console.log(`[gis.fetchUserInfo] jsonTxt: ${jsonTxt}`);
    const jsonObj = JSON.parse(jsonTxt);
    // console.log(`[gis.fetchUserInfo] jsonObj: ${JSON.stringify(jsonObj)}`);
    return {
      id: jsonObj.sub,
      name: jsonObj.name,
      picture: jsonObj.picture,
      email: jsonObj.email,
    }
  } catch (e) {
    console.log(`[gis.fetchUserInfo] error: ${e}`);
  }
}

// ログイン・ログアウトに伴うコンソール画面リフレッシュ
gis.refreshInOut=async()=>{
  const settings = await storage.get(".settings")
  if (!settings.gis) {
    document.getElementById(`${p}divli`).classList.add(`${p}hide`)
    document.getElementById(`${p}divlo`).classList.add(`${p}hide`)
    document.getElementById(`${p}divsd`).classList.add(`${p}hide`)
    document.getElementById(`${p}divsl`).classList.add(`${p}hide`)
    return
  }
  const userInfo = await storage.get(".user")
  // console.log(`[gis.refreshInOut] userInfo type:${typeof(userInfo)}`)
  if (userInfo) {
    document.getElementById(`${p}divli`).classList.add(`${p}hide`)
    document.getElementById(`${p}divlo`).classList.remove(`${p}hide`)
    document.getElementById(`${p}divsd`).classList.remove(`${p}hide`)
    document.getElementById(`${p}divsl`).classList.remove(`${p}hide`)
  } else {
    document.getElementById(`${p}divli`).classList.remove(`${p}hide`)
    document.getElementById(`${p}divlo`).classList.add(`${p}hide`)
    document.getElementById(`${p}divsd`).classList.add(`${p}hide`)
    document.getElementById(`${p}divsl`).classList.add(`${p}hide`)
  }
}

// ログアウト処理
// 1. Googleサーバー側のアクセストークンを無効化
// 2. ローカルのユーザー情報とトークンを削除
// 3. アプリのエントリーポイントを再実行（ゲストモードへ）
gis.logout=async()=>{
  gis.isProcessing = true;
  console.log(`[gis.logout] start`);
  
  try {
    // 1. Googleトークンの無効化 (Revoke)
    if (gis.accessToken) {
      console.log(`[gis.logout] トークンを無効化します`);
      // google.accounts.oauth2.revoke は非同期ですが、完了を待たずに次に進んでも実用上の問題は少ないです
      google.accounts.oauth2.revoke(gis.accessToken, (done) => {
        console.log(`[gis.logout] トークン無効化完了:`, done.error ? `Error: ${done.error}` : "Success");
      });
    }

    // 2. 自動ログイン（One Tapなど）を一時的に無効化
    // これをしないと、ログアウトした直後にまた自動ログインが走るループに陥ることがあります
    google.accounts.id.disableAutoSelect();

    // 3. アプリ内の状態をクリア
    gis.accessToken = null;
    if (typeof storage !== 'undefined') {
      await storage.delete(".user");
    }
    
    console.log(`[gis.logout] ローカルデータの削除完了。アプリを再起動します。`);

    // 4. アプリのエントリーポイントを呼び出して「未ログイン状態」にする
    // finish(null) を呼ぶことで、gis.accessTokenが空の状態で appEntry が実行されます
    await gis.finish(null);

  } catch (e) {
    console.log(`[gis.logout] ${e}`);
    gis.isProcessing = false;
  }
  console.log(`[gis.logout] end`);
};

// ログイン成功/失敗後の事後処理、アプリエントリーポイント起動
gis.finish=async(token)=>{
  // console.log(`[gis.finish] start token:${(token===null?null:truncateText(token,7))}`);
  // console.log(`[gis.finish] start token:${token}`);
  // console.log(`[gis.finish] gis.checkFocus:${gis.checkFocus}`);
  if (gis.checkFocus) {
    clearInterval(gis.checkFocus);
    gis.checkFocus = null;
  }
  gis.isInRequestAccessToken = false;
  gis.accessToken = token
  if (gis.accessToken) {
    console.log(`[gis.finish] ログイン完了！ユーザ情報の取得を開始します。`);
    const userinfo = await gis.fetchUserInfo();
    if (userinfo) {
      await storage.set(".user", userinfo);
      console.log(`[gis.finish] ユーザ情報の取得に成功しました。アプリを起動します。`);
    } else {
      await storage.delete(".user");
      console.log(`[gis.finish] ユーザ情報の取得に失敗しました。ゲストモードでアプリを起動します。`);
    }
  } else {
    console.log(`[gis.finish] アクセストークンの取得に失敗、もしくは自動ログイン不要と判断しました。ゲストモードでアプリを起動します。`);
  }
  // console.log(`[gis.finish] gis.checkFocus:${gis.checkFocus}`);
  // console.log(`[gis.finish] gis keys:${JSON.stringify(Object.keys(gis), null, "  ")}`);
  // console.log(`[gis.finish] end`);
  await gis.refreshInOut()
  await gis.appEntry();
  gis.isProcessing = false;
}

// ログイン画面起動
gis.login=(prompt='')=>{
  gis.isProcessing = true;
    // console.log(`[gis.login] start prompt:${prompt}`);
    if (!navigator.onLine) {
      console.log(`[gis.login] ネットワークに接続されていません。`);
      gis.finish(null);
    }
    // このタイミングで極小の画面を開いてポップアップブロックをテストする方式だとiPhoneSafariが止まるためテスト方式を不採用としている
    // console.log(`[gis.login] アクセストークンをリクエストします。prompt:${prompt}`);
    console.log(`[gis.login] ログイン画面を起動。アクセストークンをリクエストします。`);
    try {
      gis.isInRequestAccessToken = true;
      gis.tokenClient.requestAccessToken({prompt}); // ログイン画面起動。ログイン完了したら gis.init内の tokenClientのcallbackから finish 関数が呼ばれて gis.accessToken が設定され、init処理の後半が進む。
    } catch(e) {
      gis.isInRequestAccessToken = false;
      console.log(`[gis.login] アクセストークンのリクエストに失敗しました。起動アプリがGISを利用する前提で実装しているか、Console.settingsが正しく設定されているか、などを確認してください。`);
      gis.finish(null);
    }
    gis.checkFocus = setInterval(() => { // ログイン画面を閉じるなどしてアプリ画面に戻ってくる（あえてログインしなかった場合を配慮）
      if (gis.isInRequestAccessToken && document.hasFocus()) {
        console.log(`[gis.login] ログイン画面を閉じるなどしてアプリ画面に戻ってきたためログインをキャンセルしたと判断`);
        gis.finish(null);
      }
    }, 1000);
    // console.log(`[gis.login] gis.checkFocus:${gis.checkFocus}`);
    // console.log(`[gis.login] end`);
}

// デコード（複合化）
const obfuscator = {};
obfuscator.key = "se" + "cre" + "t-k" + "ey-q" + "shhej" + "ycka";
obfuscator.decode=(encoded)=>{ // デコード（複合化）
  if (!encoded) return "";
  const decodedBase64 = typeof atob !== 'undefined' 
    ? atob(encoded) 
    : Buffer.from(encoded, 'base64').toString('binary');
  const chars = decodedBase64.split('');
  return chars.map((char, i) => {
    const charCode = char.charCodeAt(0);
    const keyCode = obfuscator.key.charCodeAt(i % obfuscator.key.length);
    return String.fromCharCode(charCode ^ keyCode);
  }).join('');
}

// ログイン初期処理
// gis.initで想定している引数 補填は呼び出し元で実施している想定
// - appName: "testApp1", // GoogleDrive保存時に利用するアプリ名
// - appEntry: initApp, // ログイン成功時に呼び出すコールバック関数(＝アプリのエントリーポイントにあたる関数)
// - isUseLoginDisp: true, // 自作したログイン画面をアプリ起動時に利用するか否か
// - isEncrypt: false, // GCPで取得したクライアントIDを暗号化しているか否か
// - clientId: "...apps.googleusercontent.com", // GCPで取得したクライアントID
// - scope: "https://www.googleapis.com/auth/drive.file profile". //スコープ内容
gis.init=async(args={})=>{
  gis.isProcessing = true;
  console.log(`[gis.init] Note: ポップアップブロックが有効になっているとGoogleログインができないため、ログインできない場合はブラウザ設定を確認してください。もしポップアップが有効になっているなら、無効化した後にアプリを再度起動してください。`)
  // console.log(`[gis.init] start args:${JSON.stringify(args)}`)
  console.log(`[gis.init] start`)
  gis.appName = args.appName;
  gis.appEntry = args.appEntry;
  gis.isUseLoginDisp = args.isUseLoginDisp;
  gis.isEncrypt = args.isEncrypt;
  gis.clientId = args.clientId;
  gis.scope = args.scope;
  try {
    if (!navigator.onLine) {
      console.log(`[gis.init] ネットワークに接続されていません。直前までログインしていたアカウント情報を元にアプリを起動します。`);
      await gis.appEntry();
      gis.isProcessing = false;
      return;
    }
    await new Promise((resolve, reject) => { // SDK読み込み
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('[gis.init] SDK読み込み失敗'));
      document.head.appendChild(script);
    });
    google.accounts.id.initialize({ // Identity初期化
      client_id: (gis.isEncrypt)?obfuscator.decode(gis.clientId):gis.clientId,
      auto_select: true,
      use_fedcm_for_prompt: false,
      callback: (idResp) => {
        console.log(`[gis.init] Identity確定、トークン取得へ`);
        gis.login()
      }
    });
    gis.tokenClient = google.accounts.oauth2.initTokenClient({ // gis.TokenClient初期化
      client_id: (gis.isEncrypt)?obfuscator.decode(gis.clientId):gis.clientId,
      scope: gis.scope,
      callback: (tokenResp) => {
        if (tokenResp.error) {
          console.log(`[gis.init] アクセストークン取得失敗: ${tokenResp.error}`);
          gis.finish(null);
        } else {
          console.log(`[gis.init] アクセストークン取得成功`);
          gis.finish(tokenResp.access_token);
        }
      },
    });
    if (gis.isUseLoginDisp) {
      console.log(`[gis.init] 自作ログイン画面を常に使うため、起動時の自動ログインは行わない。(ユーザ操作でログイン実施)`);
      gis.finish(null)
    } else {
      console.log(`[gis.init] 自作ログイン画面を使わないため、自動ログインを試行。`);
      gis.login();
    }
  } catch (e) {
    console.log(`[gis.init] ${e}`);
    gis.isProcessing = false;
  }
  console.log(`[gis.init] end`)
};



/**
 * idb
 */

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
            case "get":
              result=globalThis[dbname][objname][k]
              break
            case "set":
              globalThis[dbname][objname][k]=v
              result=true
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
              case "get":
                req = ev.target.result.transaction(objname, "readonly").objectStore(objname).get(k)
                break
              case "set":
                // console.info(`[set]k:${k},v:${(typeof(v)==="object")?JSON.stringify(v):v}`)
                const vTxt = JSON.stringify(v) // 関数をオブジェクトに含んでいるとエラーになってしまうため、文字列化→再度オブジェクト化して除去
                const vObj = JSON.parse(vTxt)
                req = ev.target.result.transaction(objname, "readwrite").objectStore(objname).put(vObj, k)
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
    objdict.get=(k)=>commonfunc("get", k)
    objdict.set=(k, v)=>commonfunc("set", k, v)
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



/**
 * storage
 */

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

const isStoragePrefixAppCommon=(k)=>(typeof(k)=="string")?k.substring(0, 1)=="_":false
const isStoragePrefixInfo=(k)=>(typeof(k)=="string")?k.substring(0, 1)==".":false
const getStoragePrefixDel=(k)=>(isStoragePrefixAppCommon(k) || isStoragePrefixInfo(k)) ? k.substring(1) : k
const isStorageAt=(k)=>(typeof(k)=="string")?k=="@":false

const getAppValueLv1=async(k)=>{
  let appk1
  if (isStoragePrefixAppCommon(k)) {
    appk1 = "common"
  } else {
    const user = await storage_info.get("user")
    if (user) {
      appk1 = user.id
    } else {
      appk1 = "guest"
    }
  }
  return appk1
}

let setque=[], setrunning=false
const storagedict={}
storagedict.get=async(k)=>{
  let v
  if (isStoragePrefixInfo(k)) {
    if (k==".log") {
      if (iswin) {
        v = await storage_logwin()
      } else {
        v = await storage_logsw()
      }
    } else {
      if (isStorageAt(getStoragePrefixDel(k))) {
        v = await storage_info.get("datetime")
      } else {
        v = await storage_info.get(getStoragePrefixDel(k))
      }
    }
  } else {
    const appk1 = await getAppValueLv1(k)
    const appv1 = await storage_app.get(appk1)
    if (!appv1) return undefined
    let txt
    if (isStorageAt(getStoragePrefixDel(k))) {
      txt = appv1["datetime"]
    } else {
      if (!appv1["data"]) return undefined
      txt = appv1["data"][getStoragePrefixDel(k)]
    }
    try {
      const obj = JSON.parse(txt)
      v = obj
    } catch(e) {
      v = txt
    }
  }
  return v
}
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
    if (isStoragePrefixInfo(k)) {
      if (k==".log") {
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
        if (isStorageAt(getStoragePrefixDel(k))) {
         await storage_info.set("datetime", v)
        } else {
         await storage_info.set(getStoragePrefixDel(k), v)
        }
      }
    } else {
      const appk1 = await getAppValueLv1(k)
      let appv1 = await storage_app.get(appk1)
      appv1 = (appv1)?appv1:{}
      if (isStorageAt(getStoragePrefixDel(k))) {
        appv1["datetime"] = v
      } else {
        appv1["datetime"] = getDateTime()
        if (!appv1["data"]) appv1["data"]={}
        appv1["data"][getStoragePrefixDel(k)]=v // objectのままsetするので文字列化はしない
      }
      await storage_app.set(appk1, appv1)
    }
  }
  await storage_info.set("datetime", getDateTime())
  storageSetFuncs.forEach(f=>f(p, v))
  setrunning=false
  return true
}
storagedict.keys=async(prefix="")=>{
  let obj = await storagedict.gets(prefix)
  return Object.keys(obj)
}
storagedict.delete=async(k)=>{
  let r
  if (isStoragePrefixInfo(k)) {
    if (k==".log") {
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
    const appk1 = await getAppValueLv1(k)
    const appv1 = await storage_app.get(appk1)
    if (!appv1["data"]) return undefined
    delete appv1["data"][getStoragePrefixDel(k)]
    appv1["datetime"] = getDateTime()
    r = await storage_app.set(appk1, appv1)
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
storagedict.gets=async(prefix="")=>{
  let obj={}, appobj={}
  switch (prefix) {
    case "^":
      try {
        if(!gis.appName || gis.appName==="") return {}
        const datetime = await gis.readFile(`${gis.appName}.datetime.json.txt`)
        const data = await gis.readFile(`${gis.appName}.data.json.txt`)
        if (typeof(datetime)==="object" && typeof(data)==="object") {
          if(typeof(datetime["datetime"])==="string") {
              obj["^@"] = datetime["datetime"]
          }
          if(typeof(data)==="object") {
            for (let key of Object.keys(data)) {
              obj["^"+key] = data[key]
            }
          }
        }
      } catch(e) {
        console.log(`クラウドデータの一括取得に失敗しました。エラー内容: ${e}`)
        return {}
      }
      break
    case ".":
      obj[".@"] = await storage_info.get("datetime")
      for (let key of (await storage_info.keys())) {
        obj["."+key] = await storage_info.get(key)
      }
      break
    case "_":
      appobj = await storage_app()
      if (typeof(appobj.common)==="object") {
        if(typeof(appobj.common["datetime"])==="string") {
            obj["_@"] = appobj.common["datetime"]
        }
        if(typeof(appobj.common["data"])==="object") {
          for (let key of Object.keys(appobj.common["data"])) {
            obj["_"+key] = appobj.common["data"][key]
          }
        }
      }
      break
    default:
      appobj = await storage_app()
      const user = await storage_info.get("user")
      const userobj=(user)?appobj[user.id]:appobj.guest
      if (typeof(userobj)==="object") {
        if(typeof(userobj["datetime"])==="string") {
            obj["@"] = userobj["datetime"]
        }
        if(typeof(userobj["data"])==="object") {
          for (let key of Object.keys(userobj["data"])) {
            obj[key] = userobj["data"][key]
          }
        }
      }
      break
  }
  return obj
}
storagedict.sets=async(prefix="",obj={})=>{
  let res=true, appobj={}
  if (typeof(obj)!=="object") return false
  switch (prefix) {
    case "^":
      let data = {}
      for (let key of Object.keys(obj)) {
        const newkey = (key.slice(0,1)==="^")?key.slice(1):key
        data[newkey] = structuredClone(obj[key])
      }
      try {
        const datetime = {
          "datetime": (data["@"]) ? data["@"] : getDateTime()
        }
        delete data["@"]
        await gis.saveFile(`${gis.appName}.data.json.txt`, data)
        await gis.saveFile(`${gis.appName}.datetime.json.txt`, datetime)
      } catch(e) {
        console.log(`クラウドデータの一括取得に失敗しました。エラー内容: ${e}`)
        // console.log(`[storagedict.sets] ${e}`);
      }
      break
    case ".":
      let infoobj = {}
      for (let key of Object.keys(obj)) {
        const newkey = (key.slice(0,1)===".")?key.slice(1):key
        infoobj[newkey] = structuredClone(obj[key])
      }
      infoobj["datetime"] = (infoobj["@"]) ? infoobj["@"] : getDateTime()
      delete infoobj["@"]
      await storage_info(infoobj)
      break
    case "_":
      appobj = await storage_app()
      let commonobj=appobj["common"]
      if (typeof(commonobj)!=="object") commonobj={}
      commonobj["data"] = {}
      for (let key of Object.keys(obj)) {
        const newkey = (key.slice(0,1)==="_")?key.slice(1):key
        commonobj["data"][newkey] = structuredClone(obj[key])
      }
      commonobj["datetime"] = (commonobj["@"]) ? commonobj["@"] : getDateTime()
      delete commonobj["@"]
      appobj["common"] = {...commonobj}
      await storage_app(appobj)
      break
    default:
      appobj = await storage_app()
      const user = await storage_info.get("user")
      const userid = (user)?user.id:"guest"
      let userobj=appobj[userid]
      if (typeof(userobj)!=="object") userobj={}
      userobj["data"] = {}
      userobj["data"] = {...obj}
      userobj["datetime"] = (userobj["@"]) ? userobj["@"] : getDateTime()
      delete userobj["@"]
      appobj[userid] = {...userobj}
      await storage_app(appobj)
      break
  }
  return res
}
storagedict.getsAll=async()=>{
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
const storagefunc=async()=>{
  const obj_app = await storage_app()
  const obj_info = await storage_info()
  const obj = {
    "app":obj_app,
    "info":obj_info,
  }
  return obj
}
const storage=Object.assign(storagefunc, storagedict)

const initstorage=async()=>{
  await storage.clear()
}



/**
 * console.log hooks
 */

const addconsole=()=>{
  let consoleLogBackup=console.log
  Object.defineProperty(console, "log", {
    value: async(...args)=>{
      for (const arg of args) {
        consoleLogBackup(getDateTime() + "|" + arg)
        await storage.set(".log", arg)
      }
      if (isshow) viewlog()
    },
  })
}
addconsole()



/**
 * contents
 */

const p = "Console_js_"

const addcontents=async()=>{
const _settings = await storage.get(".settings")
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

.${p}str.${p}hide {
  display: none;
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
      <div id="${p}divli" class="${p}str">&ensp;<span id="${p}cmdli" class="${p}cmd">@li</span> google login</div>
      <div id="${p}divlo" class="${p}str ${p}hide">&ensp;<span id="${p}cmdlo" class="${p}cmd">@lo</span> google logout</div>
      <div id="${p}divsd" class="${p}str ${p}hide">&ensp;<span id="${p}cmdsd" class="${p}cmd">@sd</span> sync data with google drive</div>
      <div id="${p}divsl" class="${p}str ${p}hide">&ensp;<span id="${p}cmdsl" class="${p}cmd">@sl</span> send logs to google drive</div>
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



/**
 * events
 */

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
  let jo = await storage.getsAll()
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



let isshow=false, arr_viewer=[]
const viewlog=async()=>{
  let arr_sw=[]
  const jo_sw = await storage_logsw()
  for (let key in jo_sw) arr_sw.push(`<div class="${p}line"><div class="${p}str">${[key]}|${jo_sw[key]}</div></div>`)
  let arr_win=[]
  const jo_win = await storage_logwin()
  for (let key in jo_win) arr_win.push(`<div class="${p}line"><div class="${p}str">${[key]}|${jo_win[key]}</div></div>`)
  let arr_all=[]
  const viewmode = await storage.get(".viewmode")
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
  const viewmode = await storage.get(".viewmode")
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
    await gis.refreshInOut()
    isshow=(isshow)?false:true
    if (isshow) viewlog()
    const rapper = document.getElementById(`${p}console`)
    rapper.classList.toggle(`${p}hide`)
    //if (isshow) document.getElementById(`${p}cmd`).focus()
    const _settings = await storage.get(".settings")
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
        if (input!="@") await storage.set(".precmd", input)
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
              let viewmode = await storage.get(".viewmode")
              if (typeof(viewmode)==="undefined" || viewmode=="all") {
                viewmode = "other than sw"
              } else if (viewmode=="other than sw") {
                viewmode = "sw"
              } else if (viewmode=="sw") {
                viewmode = "all"
              }
              await storage.set(".viewmode", viewmode)
              document.getElementById(`${p}cmdclnow`).innerHTML = viewmode
              arr_viewer=[]
              console.log( "&ensp;<&ensp;" + `changed log view mode: ${viewmode}` )
              break
            case "@dl":
              await deletelog()
              break
            case "@li":
              gis.login()
              break
            case "@lo":
              await gis.logout()
              break
            case "@sd":
              await gis.sync()
              break
            case "@sl":
              await gis.sendLog()
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
        const precmd = await storage.get(".precmd")
        document.getElementById(`${p}cmd`).value = (typeof(precmd)==="undefined")?"":precmd
      }
    }
  })

}



/**
 * settings
 */

//globalThis.Console=Object.assign((args={})=>{
const settings=async(args={})=>{
  args.storage=(typeof(args.storage)!=="undefined")?args.storage:false
  if (args.storage) {
    await storagesinit(false)
    for (let k in globalThis[storageName]["app"]) storage_app.set(k, globalThis[storageName]["app"][k])
    for (let k in globalThis[storageName]["info"]) storage_info.set(k, globalThis[storageName]["info"][k])
    for (let k in globalThis[storageName]["logsw"]) storage_logsw.set(k, globalThis[storageName]["logsw"][k])
    for (let k in globalThis[storageName]["logwin"]) storage_logwin.set(k, globalThis[storageName]["logwin"][k])
    delete globalThis[storageName]
  }
  if (iswin) {
    args.show=(typeof(args.show)!=="undefined")?args.show:true
    args.pos=(typeof(args.pos)!=="undefined")?args.pos:"right-bottom" //"right-bottom"(default), "right-top", "left-bottom", "left-top"
    args.posx=(typeof(args.posx)!=="undefined")?args.posx:0
    args.posy=(typeof(args.posy)!=="undefined")?args.posy:0
    if (document.getElementById(`${p}console_container`)!==null) document.getElementById(`${p}console_container`).remove()
    await storage.set(".settings", args)
    await addcontents()
    await addevents()
    if (!args.show) hideToggle()
    if (args.gis) {
      console.log(`[settings] gis start`)
      if (!args.gis.appName || !args.gis.appEntry || !args.gis.clientId) {
        console.log(`[settings] gis setting error You must enter appName and appEntry and clientId. appName:${args.gis.appName}, appEntry:${args.gis.appEntry}, cliendId:${args.gis.clientId}`)
      } else {
        args.gis.isEncrypt=(typeof(args.gis.isEncrypt)!=="undefined")?args.gis.isEncrypt:false
        args.gis.isUseLoginDisp=(typeof(args.gis.isUseLoginDisp)!=="undefined")?args.gis.isUseLoginDisp:false
        args.gis.scope=(typeof(args.gis.scope)!=="undefined")?args.gis.scope:"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile"
        await storage.set(".settings", args)
        await gis.init(args.gis);
      }
      console.log(`[settings] gis end`)
    }
  }
  console.log(`Console.settings:${JSON.stringify(args)}, isWindow:${iswin}, isServiceWorker:${issw}, canBroadcastChannel:${canbcc}`)
}
await settings(args)



/**
 * public functions, properties
 */

Object.assign(globalThis.Console,{
  "datetime": getDateTime,
  "settings": settings,
  "storage": storage,
  "setfuncs": storageSetFuncs,
  "deletelog": deletelog,
  "gis": gis,
})
return storage
}
globalThis.Console.promise=Console()
