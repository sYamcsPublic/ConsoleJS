
# ConsoleJS

`Console.js` は、Webアプリケーションのデバッグを強力にサポートするライブラリです。
アプリケーション内に仮想コンソール画面を埋め込み、`console.log` をフックしてログを表示するだけでなく、Google Drive を利用したデータ同期やログのバックアップ、IndexedDB を活用したストレージ機能を提供します。

## デモ

<img src="./demo.gif" width="65%"/>

## サンプル

* [動作サンプル](https://syamcspublic.github.io/ConsoleJS/)

* [シンプル導入した際の動作サンプル](https://syamcspublic.github.io/ConsoleJS/simple.html)

* [動作サンプルのHTMLファイル - index.html](../index.html)

* [シンプル導入サンプルのHTMLファイル - simple.html](../simple.html)

* [サービスワーカー導入時のJSファイル例 - sw.js](../sw.js)

## 主な機能

1. **コンソール・フック**: `console.log` を自動的にキャッチし、専用のGUI画面に表示・保存します。

2. **高度なストレージ管理**: IndexedDB またはメモリ上のオブジェクトを、共通のAPI（get/set）で透過的に操作できます。

3. **Google Drive 同期**: アプリケーションデータ（JSON形式）を Google Drive と双方向同期（最新日時優先）します。

4. **リモートログ出力**: デバッグログをテキストファイルとして Google Drive のマイドライブ直下に保存できます。

5. **PWA/Service Worker 対応**: Service Worker 内でのログ記録にも対応しています。

## 導入方法

HTMLファイルで以下のように読み込みます。

```html
<script defer src="./Console.js"></script>

```

画面右下に表示される「＋」ボタンをタップするとコンソールが開きます。下部の入力欄からコマンド（`@`で始まる命令）を実行可能です。

また、初期設定、ストレージ機能などの具体的な実装方法は`index.html`をご参照ください。以下、代表例を示します。


## 初期設定 (Console.settings)

ライブラリの挙動をカスタマイズするには、読み込み後に一度だけ `Console.settings` を呼び出します。

```javascript
(async()=>{
  await Console.promise;  // ライブラリの初期化完了を待機 (以下の設定や他機能を利用するのであれば必須、ボタン表示のみ希望であれば不要)
  await Console.settings({
    storage: true,             // trueでIndexedDBを使用、falseで一時メモリ (任意 省略時はfalse)
    show: true,                // 右下の「＋」ボタンを表示するか (任意 省略時はtrue)
    pos: "right-bottom",       // ボタン位置 (right-top, left-bottom 等) (任意 省略時はright-bottom)
    posx: 65,                  // ボタン位置横補正 (px単位) (任意 省略時は0)
    posy: 65,                  // ボタン位置縦補正 (px単位) (任意 省略時は0)
    gis: {  // 利用は任意 (省略時はundefined)
      appName: "MyWebApp",     // Google Drive上のファイル名に使用 (gis利用時は必須)
      appEntry: initApp,       // ログイン完了後に実行されるエントリーポイント (gis利用時は必須)
      isUseLoginDisp: true,    // アプリで実装したログイン画面の起動時に利用可否(任意 省略時はfalse)
      clientId: "YOUR_CLIENT_ID.apps.googleusercontent.com", // GCPで取得したクライアントID(gis利用時は必須)
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile" // GCPで取得したクライアントIDのスコープ(任意 省略時は左記の値)
    }
  });
})();
```

## ストレージ機能 (Console.storage)

`Console.storage` を通じて、IndexedDB（またはメモリ）へのデータの読み書きが可能です。

```javascript
(async()=>{

    console.log(`データの保存（自動的に保存日時が内部に記録されます）`)
    await kv.set("key1", "text");
    await kv.set("key2", 100);
    await kv.set("key3", { name: "text", value: 100 });

    console.log(`データの取得`)
    const value1 = await kv.get("key1");
    const value2 = await kv.get("key2");
    const value3 = await kv.get("key3");
    console.log(`value1:${value1}, value2:${value2}, value3:${JSON.stringify(value3)}`)

    console.log(`キーの接頭辞による分類`)
    await kv.set(".infoData", "value2"); const settings = await kv.get(".infoData"); // "."開始：システム情報 (info領域) ※機能としては作成しているが、挙動が不安定になる可能性がある利用には注意
    await kv.set("_commonData", "value3"); const commonData = await kv.get("_commonData"); // "_"開始：ユーザーを問わない共通データ (common領域)
    await kv.set("userData", "value4"); const userData = await kv.get("userData"); // 接頭辞なし：ログインしている場合はユーザー別の領域、ログインしていない場合はguest領域

    console.log(`各領域の保存日時を取得`)
    const datetimeInfo = await kv.get(".@"); // info領域
    const datetimeCommon = await kv.get("_@"); // common領域
    const datetimeUser = await kv.get("@"); // user/guest領域
    console.log(`datetime info:${datetimeInfo}, common:${datetimeCommon}, user:${datetimeUser}`)

    console.log(`[欄外]各領域の保存日時を強制設定`)
    await kv.set("@", "3037-14-56T87:65:43.217"); // user/guest領域
    const datetimeUserAf = await kv.get("@"); // user/guest領域
    await kv.set("_@", "4037-14-56T87:65:43.218"); // common領域
    const datetimeCommonAf = await kv.get("_@"); // common領域
    await kv.set(".@", "5037-14-56T87:65:43.219"); // info領域
    const datetimeInfoAf = await kv.get(".@"); // info領域
    console.log(`datetime info:${datetimeInfoAf}, common:${datetimeCommonAf}, user:${datetimeUserAf}`)
    console.log(`※info領域は強制設定後に実時間で処理が正しい値に上書きする仕様`)

    console.log(`データの一括取得`)
    console.log(`"^"でdrive領域から取得が可能、省略時は""(user/guest領域)扱い`)
    const driveDatas = await kv.gets("^"); // drive領域
    console.log(`driveDatas:${JSON.stringify(driveDatas)}`)
    const infoDatas = await kv.gets("."); // info領域
    console.log(`infoDatas:${JSON.stringify(infoDatas)}`)
    const commonDatas = await kv.gets("_"); // common領域
    console.log(`commonDatas:${JSON.stringify(commonDatas)}`)
    const userDatas = await kv.gets(""); // user/guest領域
    console.log(`userDatas:${JSON.stringify(userDatas)}`)

    console.log(`データの一括設定`)
    console.log(`"^"でdrive領域への設定が可能、省略時は""(user/guest領域)扱い`)
    console.log(`※一括設定時に指定するオブジェクトの最も浅いキーへの各領域の接頭辞付与は任意(付与していたら保存時に先頭一文字を自動削除する)`)
    console.log(`@キーで保存日時を強制設定することも可能。@キーで指定しなければ処理時間で自動設定する。`)
    await kv.sets("^", {  // drive領域
      // "@": "3026-34-56T78:90:12.345", // user/common/info領域と同様に指定は任意
      driveKey1: "driveValue1",
      driveKey2: 200,
      driveKey3: {
        name: "foo", value: 200
      },
    });
    // await kv.sets(".", {  // info領域 ※機能としては作成しているが、挙動が不安定になる可能性がある利用には注意
    //   "@": "3026-34-56T78:90:12.345",
    //   infoKey1: "infoValue1",
    //   infoKey2: 300,
    //   infoKey3: {
    //     name: "bar", value: 300
    //   },
    // });
    await kv.sets("_", {  // common領域
      "@": "3026-34-56T78:90:12.345", // "@"キーで強制的に保存日時を指定することが可能
      commonKey1: "commonValue1",
      commonKey2: 400,
      commonKey3: {
        name: "biz", value: 400
      },
    });
    await kv.sets("", {  // user/guest領域
      // "@": "3026-34-56T78:90:12.345", // "@"キーを省略すると処理日時が自動的に保存される
      userKey1: "userValue1",
      userKey2: 500,
      userKey3: {
        name: "qux", value: 500
      },
    });

    console.log(`キー一覧の取得`)
    console.log(`"^"でdrive領域から取得が可能、省略時は""(user/guest領域)扱い`)
    const driveKeys = await kv.keys("^"); // drive領域
    console.log(`driveKeys:${JSON.stringify(driveKeys)}`) // driveKeys:["^@","^driveKey1","^driveKey2","^driveKey3"]
    const infoKeys = await kv.keys("."); // info領域
    console.log(`infoKeys:${JSON.stringify(infoKeys)}`) // infoKeys:[".@",".datetime",".infoData",".settings",".user"]
    const commonKeys = await kv.keys("_"); // common領域
    console.log(`commonKeys:${JSON.stringify(commonKeys)}`) // commonKeys:["_@","_commonKey1","_commonKey2","_commonKey3"]
    const userKeys = await kv.keys(""); // user/guest領域
    console.log(`userKeys:${JSON.stringify(userKeys)}`) // userKeys:["@","userKey1","userKey2","userKey3"]

    console.log(`ログインユーザ情報の取得`)
    const userinfo = await kv.get(".user");
    console.log(`userinfo:${(userinfo)?JSON.stringify(userinfo):userinfo}`)

})
```

## コンソールコマンド

コンソール画面の入力欄から以下のコマンドを実行できます。

| コマンド | 内容 | 補足 |
| --- | --- | --- |
| `@` | 直前に実行したコマンドを呼び出し |  |
| `@vw` | Service Worker を表示 |  |
| `@dw` | Service Worker を削除 |  |
| `@vc` | キャッシュの表示 |  |
| `@dc` | キャッシュの削除 |  |
| `@vs` | ストレージ内容の確認（JSON表示） |  |
| `@ds` | ストレージ内容の削除 |  |
| `@cl` | ログ表示モードの切替 (All / Service Worker / ブラウザ) |  |
| `@dl` | ログの消去 |  |
| `@li` | Google ログインの実行 | Console.settings.gis設定時、かつログアウト状態のときに表示 |
| `@lo` | Google ログアウト（トークンの失効とローカルデータの削除） | Console.settings.gis設定時、かつログイン状態のときに表示 |
| `@sd` | Google Drive とのアプリデータ同期 | Console.settings.gis設定時、かつログイン状態のときに表示 |
| `@sl` | Google Drive へ現在のログを送信 | Console.settings.gis設定時、かつログイン状態のときに表示 |
| `@ra` | アプリのリロード |  |

## 公開API

JavaScript側から直接呼び出し可能な関数などの一例です。

* `await Console.promise`: ライブラリの初期化完了を待機します。
* `await Console.settings({})`: ライブラリの初期設定を行います。
* `await Console.deletelog()`: ログを削除します。
* `Console.storage`: ストレージ操作関数群を保有するオブジェクトです。
* `Console.gis.login()`: Google ログイン画面を起動します。
* `await Console.gis.logout()`: Google ログアウト処理を実行します。
* `await Console.gis.sync()`: Google Drive との同期を実行します。
* `await Console.gis.authfetch(url, options={})`: 認証情報を使ってfetchします。
* `Console.gis.isProcessing`: 通信中/処理中であれば `true` を返します。

## ライセンス
MIT License  
Author: sYamcs
