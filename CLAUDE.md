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
   - `TurndownService` を設定し、カスタムルール（`preserveBr` / `imageWithAlt` で画像 src を絶対 URL 化 / `confluencePrismCodeBlock` で Atlassian のコードブロックを言語付きフェンスに変換）を追加して変換。結果を `chrome.runtime.sendMessage({ action: "downloadMd" })` で background に送る。

3. **turndown.js**: 同梱の Turndown ライブラリ。グローバル `TurndownService` として読み込まれる（改変しない前提のベンダーファイル）。

### 変換ロジックを変更するとき
Confluence の DOM 構造への対応は `content.js` の `selectors` と `turndownService.addRule(...)` に集約されている。新しい Confluence レイアウトやコードブロック形式に対応する場合はここを拡張する。

## 注意点

- `AGENTS.md` にコーディング規約（2 スペース / セミコロン必須 / ダブルクォート、camelCase・PascalCase・kebab-case）、コミット規約（Conventional Commits）、セキュリティ方針が記載されている。あわせて参照すること。
- ユーザー影響のある変更時は `manifest.json` の `version` を更新する。
- `host_permissions` は現状 `*://*/*` のワイルドカード。公開前には最小化する方針。
- `eval` やリモートコードは使用しない。外部ライブラリは `turndown.js` のように同梱する。
