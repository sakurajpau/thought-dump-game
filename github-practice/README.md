# さわって覚えるGitHub（練習アプリ）

Claude Code講座の受講生向けに、GitHubのしくみをボタン操作で体験できる練習アプリです。
HTML / CSS / JavaScript だけで動き、本物のGitHubには接続しません。

## 使い方

`index.html` をブラウザで開くだけで動きます（サーバー不要）。

## ステージ

| # | テーマ | 状態 |
|---|--------|------|
| 1 | リポジトリ | 公開中 |
| 2 | コミット | 公開中 |
| 3 | プッシュ | 準備中 |
| 4 | プル | 準備中 |
| 5 | ブランチとマージ | 準備中 |
| 6 | コンフリクト | 準備中 |

各ステージは「説明 → ボタンで操作 → 図が動く → 対応するgitコマンド表示 → 確認問題」の流れで進みます。
クリア状況はブラウザに保存されます（保存できない環境でも動作します）。

## ファイル構成

```
github-practice/
├── index.html                 … 入口
├── css/style.css              … 見た目（色は :root の変数で管理、ダークモード対応）
└── js/
    ├── app.js                 … 土台（画面切り替え・進み具合の保存・ステージ共通の流れ）
    └── stages/
        ├── stage1-repository.js
        └── stage2-commit.js
```

## ステージの追加方法

1. `js/stages/stage3-push.js` のようなファイルを作り、`GitPractice.registerStage({ id: 3, ... })` で登録します。
2. `index.html` の末尾に `<script src="js/stages/stage3-push.js"></script>` を追加します。

登録する内容（`stage2-commit.js` が見本です）：

| 項目 | 内容 |
|------|------|
| `lead` | ステージ見出しの下の一文 |
| `intro` | 説明パートのHTML |
| `initialState()` | 図の最初の状態を返す関数 |
| `render(state)` | 状態から図のHTMLを作る関数。`data-key` をつけた部品は、新しく現れたときにアニメーションします |
| `steps` | 操作ステップの配列。`mission`（指示）、`button`、`apply(state, input)`（状態を変える）、`command` / `output` / `parts`（コマンドとその読み方）、`note`（いま起きたこと）。GitHub画面での操作は `command` の代わりに `webop` を使います。`input` を指定すると入力欄が出ます |
| `quiz` | 確認問題の配列。`q`、`choices`、`answer`（正解の番号、0から）、`hint`（不正解時）、`explain`（正解時） |
| `learned` | クリア画面に出す「出てきたコマンド」の一覧 |
| `clearMessage` | クリア画面のメッセージ |

`command` / `output` / `note` などは、文字列のかわりに関数 `(ctx) => ...` も書けます（`ctx.state`、`ctx.input`、`ctx.result` が使えます）。
