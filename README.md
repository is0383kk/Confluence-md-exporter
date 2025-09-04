# Confluence → Markdown Exporter

Confluence ページの本文をワンクリックで Markdown 形式にエクスポートできる Chrome／Microsoft Edge 拡張機能です。

## 機能

- ツールバーアイコンをクリックするだけで、現在のページを Markdown ファイルとしてダウンロード
- Confluence ページのタイトルとページ ID を使用した自動ファイル命名
- HTML 要素を Markdown 記法に変換（見出し、リスト、コードブロック、画像など）
- Chrome Manifest V3 対応

## インストール

1. このリポジトリをクローンまたはダウンロード
2. Chrome の場合は `chrome://extensions` を開く／Edge の場合は`edge://extensions/`を開く
3. 「デベロッパーモード（開発者モード）」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む／展開して読み込み」をクリック
5. ダウンロードしたフォルダ（confluence-md-exporter）を選択

## 使用方法

1. Confluence ページを開く
2. ブラウザのツールバーにある拡張機能アイコンをクリック
3. Markdown ファイルが自動的にダウンロードされます

## ファイル構成

```
confluence-md-exporter/
├── manifest.json      # Chrome拡張の設定ファイル
├── background.js      # サービスワーカー（メイン処理）
├── content.js         # コンテンツスクリプト（ページ内実行）
├── turndown.js        # HTML→Markdown変換ライブラリ
├── icon.png          # 拡張機能アイコン
└── README.md         # このファイル
```

## 開発

### リロード

コードを変更した後：

1. `chrome://extensions` で拡張機能の「リロード」ボタンをクリック
2. 任意のページでアイコンをクリックして動作確認

### テスト

現在は手動テストで検証：

- Confluence ページでアイコンをクリックし、`.md`ファイルがダウンロードされること
- ファイル名がページタイトル+ページ ID（存在する場合）になること
- 見出し、リスト、コードブロック、画像が適切に変換されること
- DevTools コンソールで`[Exporter]`のログ・エラーを確認

## 技術仕様

- **Manifest Version**: 3
- **言語**: JavaScript (ES2020+)
- **必要な権限**:
  - `scripting`: コンテンツスクリプトの注入
  - `downloads`: ファイルダウンロード
  - `activeTab`: アクティブタブへのアクセス
- **対応 URL**: すべての HTTP/HTTPS サイト（`*://*/*`）

## ライセンス

MIT License
