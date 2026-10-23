# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

Confluence ページの本文をワンクリックで Markdown 形式にエクスポートする Chrome / Microsoft Edge 拡張機能（Manifest V3）。ビルド工程はなく、ソースをそのまま「パッケージ化されていない拡張機能」として読み込む。

## 開発コマンド

ビルド・パッケージ管理・テストランナーは存在しない（純粋な JS + MV3）。

- **読み込み**: `chrome://extensions`（Edge は `edge://extensions/`）→ デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ 本フォルダを選択。
- **リロード**: コード変更後は拡張機能の「リロード」ボタンを押し、任意のページでアイコンをクリックして再確認する。
- **デバッグ**: DevTools コンソールで `[Exporter]` プレフィックスのログ・エラーを確認する。Service Worker のログは `chrome://extensions` の「Service Worker」リンクから、content script のログはページ側の DevTools から見る。
- **テスト**: 自動テストなし。手動検証のみ（`.md` がダウンロードされるか、ファイル名がタイトル+pageId になるか、見出し・リスト・コードフェンス・画像・コードブロック言語が正しく変換されるか）。

## アーキテクチャ

処理は「アイコンクリック → スクリプト注入 → 抽出・変換 → メッセージ経由でダウンロード」という一方向フローで、3 つのファイルにまたがる。全体像を掴むには 3 ファイルを合わせて読む必要がある。

1. **background.js**（Service Worker）
   - `chrome.action.onClicked` でアイコンクリックを受け、`http(s)` ページに対してのみ `turndown.js` → `content.js` の順で（`allFrames: true`）注入する。注入順序が重要: `content.js` は `TurndownService` グローバルに依存する。
   - `chrome.runtime.onMessage` で `downloadMd` を受け、本文を **base64 DataURL** に変換して `chrome.downloads.download` を呼ぶ。Service Worker では `URL.createObjectURL` が使えないため DataURL 方式を採用している（この制約を崩さないこと）。

2. **content.js**（ページ側で実行）
   - `selectors` 配列で Confluence 系の本文要素（`.ak-renderer-document`, `.wiki-content`, `#main-content` 等）を優先順に探索。見つからなければトップフレームの iframe 内を走査し、最終フォールバックは `<body>`。
   - ファイル名は `document.title` + URL の `pageId` クエリから生成し、ファイル名に使えない文字をサニタイズする。
   - `TurndownService` を設定し、カスタムルールを追加して変換。結果を `chrome.runtime.sendMessage({ action: "downloadMd" })` で background に送る。カスタムルールは以下の 5 つ:
     - `preserveBr`: `<br>` を Markdown の改行（半角スペース 2 つ + 改行）に変換。
     - `imageWithAlt`: 画像 src を `location.origin` 基準で絶対 URL 化。
     - `confluencePrismCodeBlock`: Atlassian/DS のコードブロック（`span[data-ds--code--code-block]` / `code[style*="white-space: pre"]`）を、`class="language-xxx"` や `data-code-lang` から言語推定した言語付きフェンスに変換。
     - `confluenceTable`: `<table>` を Markdown テーブルに変換。sticky/floating な複製ヘッダー（`display:none` や `.tableFloatingHeader`）を除外し、セル内のブロック要素・`<br>` を `<br>` 区切りに、`|` をエスケープする。`thead` が無い場合は先頭行を見出しに転用。
     - `drawioMacro`: `.drawio-macro`（draw.io マクロ）内のインライン `<svg>` をそのまま Markdown に埋め込む。元 SVG は `viewBox` を持たず CSS でサイズ指定されるため、親マクロ／SVG の `min-width`/`min-height`・`width`/`height` から `viewBox` と `width`/`height` を補正し、`width:100%` 等の inline style を除去する。**この方式ではインライン SVG なので、GitHub など SVG をサニタイズするビューアでは図が表示されない**（VS Code プレビューやブラウザでは表示される）。SVG 内の文字は `<foreignObject>` 内の HTML で、同じ理由で data URL 画像化すると消えやすいため、インライン埋め込みを採用している。

   変換は `el.innerHTML` を直接渡すのではなく、**`cloneNode(true)` したコピーに対して掃除を施してから `turndown()` に渡す**（ページ側 DOM を壊さないため）。掃除の内容は 2 つ:
   - **UI コントロール除去**: `.codeHeader, .expand-control, button, span[hidden]` を削除。コードブロックのタイトル・「ソースを展開」・ツールバーボタン（「折り返しをオン」「テキストとしてコピー」等。クラス名が動的ハッシュのため要素名 `button` で除去）・ツールチップの複製 `span[hidden]` が本文に混入するのを防ぐ。
   - **draw.io 図を囲む強調のアンラップ**: `.drawio-macro` の祖先をたどり `strong`/`b`/`em`/`i` をアンラップする。図（ブロック）が強調（インライン）で囲まれると `**` が図の前後に浮いて Markdown が壊れるため。

3. **turndown.js**: 同梱の Turndown ライブラリ。グローバル `TurndownService` として読み込まれる（改変しない前提のベンダーファイル）。

### 変換ロジックを変更するとき
Confluence の DOM 構造への対応は `content.js` の `selectors` と `turndownService.addRule(...)` に集約されている。新しい Confluence レイアウトやコードブロック形式に対応する場合はここを拡張する。

## 注意点

- `AGENTS.md` にコーディング規約（2 スペース / セミコロン必須 / ダブルクォート、camelCase・PascalCase・kebab-case）、コミット規約（Conventional Commits）、セキュリティ方針が記載されている。あわせて参照すること。
- ユーザー影響のある変更時は `manifest.json` の `version` を更新する。
- `host_permissions` は現状 `*://*/*` のワイルドカード。公開前には最小化する方針。
- `eval` やリモートコードは使用しない。外部ライブラリは `turndown.js` のように同梱する。
