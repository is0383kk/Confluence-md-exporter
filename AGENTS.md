# Repository Guidelines

## プロジェクト構成とモジュール
- `manifest.json`: Chrome MV3 の設定（権限、アクション、背景ページ）。
- `background.js`: サービスワーカー。スクリプト注入と Markdown ダウンロードを制御。
- `content.js`: ページ側で実行。メイン要素を見つけ、Turndown で HTML→Markdown 変換。
- `turndown.js`: 同梱の Turndown ライブラリ（グローバルとして読み込み）。
- `icon.png`: ツールバーアイコン。

## ビルド・テスト・開発コマンド
- ロード: `chrome://extensions` → デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ 本フォルダを選択。
- リロード: 変更後に拡張の「リロード」を押し、任意のページでアイコンをクリックして再確認。
- ビルドなし: 直接 `background.js` が `turndown.js` と `content.js` を注入。ツール導入時は MV3 と注入制約に合わせること。

## コーディング規約と命名
- 言語: モダン JavaScript (ES2020+)、MV3 API。
- インデント: 2スペース、セミコロン必須、ダブルクォート推奨（既存に合わせる）。
- 命名: 変数/関数は camelCase、クラスは PascalCase、ファイルは kebab-case。
- Lint/Format: 未設定。導入する場合は設定とコマンドを `README` に追記。

## テスト指針
- 現状は手動検証:
  - Confluence 等のページで拡張アイコンをクリックし、`.md` が保存されること。
  - ファイル名がページタイトル＋`pageId`（あれば）になること。
  - 見出し・リスト・コードフェンス・画像が期待通りか。コードブロックの言語が付与されるか。
  - DevTools コンソールに `[Exporter]` ログ/エラーが出るか確認。

## コミットとプルリク
- コミット: 可能なら Conventional Commits（例: `feat:`, `fix:`, `chore:`）。小さく論理的に分割。
- PR: 概要、再現手順、Before/After（または小さな Markdown 例）、関連 Issue を記載。
- バージョン: ユーザー影響のある変更は `manifest.json` の `version` を更新。

## セキュリティと設定
- 権限: `host_permissions`/`permissions` は最小化。開発中のワイルドカードは公開前に絞る。
- コンテンツスクリプト: `eval` やリモートコードは使用しない。外部ライブラリは同梱（`turndown.js` のように）。
- 文字コード: 文字列・コメントは UTF-8 を徹底し、文字化けを回避。
