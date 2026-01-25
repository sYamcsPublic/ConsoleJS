# Console.js (v2.1.0)

`Console.js` は、Webアプリケーションのデバッグを強力にサポートするライブラリです。
アプリケーション内に仮想コンソール画面を埋め込み、`console.log` をフックしてログを表示するだけでなく、Google Drive を利用したデータ同期やログのバックアップ、IndexedDB を活用したストレージ機能を提供します。

## デモ

<img src="./demo.gif" width="65%"/>

## サンプル

* [Console.js - 動作サンプル](https://syamcspublic.github.io/ConsoleJS/)
* [HTMLファイルへのシンプルな導入例](https://syamcspublic.github.io/ConsoleJS/simple.html)

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
  // 準備例 (アプリ起動時などに1度だけ実施)
  await Console.promise; const kv = Console.storage; // ライブラリの初期化完了を待機(必須)、ストレージを変数`kv`で参照できるようにします(任意)
  await Console.settings({storage:false}) // ライブラリの初期設定を実施します(任意 参考:storage:trueにするとIndexedDBを対象とします)

  // データの保存 (自動的に保存日時が内部に記録されます)
  await kv.set("key1", "text");
  await kv.set("key2", 100);
  await kv.set("key3", { name: "text", value: 100 });

  // データの取得
  const value1 = await kv.get("key1");
  const value2 = await kv.get("key2");
  const value3 = await kv.get("key3");

  // キーの接頭辞による分類
  const settings = await kv.get(".setting"); // "."開始：システム情報 (info領域)
  await kv.set("_commonData", "value1"); const commonData = await kv.get("_commonData"); // "_"開始：ユーザーを問わない共通データ (common領域)
  await kv.set("userData", "value2"); const userData = await kv.get("userData"); // 接頭辞なし：ログインしている場合はユーザー別の領域、ログインしていない場合はguest領域

  // キー一覧の取得
  const keys = await kv.keys(); // 
  console.log(`keys:${JSON.stringify(keys)}`)

  // keys&valuesの取得
  const KeysAndValues = await kv();
  console.log(`KeysAndValues:${JSON.stringify(KeysAndValues)}`)

  // ユーザ情報の取得
  const userinfo = await kv.get(".user");
  console.log(`keys:${(userinfo)?JSON.stringify(userinfo):userinfo}`)
}))
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

JavaScript側から直接呼び出し可能な関数やプロパティなどです。

* `await Console.promise`: ライブラリの初期化完了を待機します。
* `await Console.settings({})`: ライブラリの初期設定を行います。
* `await Console.deletelog()`: ログを削除します。
* `Console.storage`: ストレージ操作関数群を保有するオブジェクトです。
* `Console.login()`: Google ログイン画面を起動します。
* `await Console.authfetch(url, options={})`: 認証情報を使ってfetchします。
* `await Console.sync()`: Google Drive との同期を実行します。
* `await Console.logout()`: ログアウト処理を実行します。
* `Console.isproc()`: 通信中/処理中であれば `true` を返します。

## ライセンス
MIT License  
Author: sYamcs
