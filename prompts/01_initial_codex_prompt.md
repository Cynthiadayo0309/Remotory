# Codex 初回指示 — Remotory

このリポジトリで `Remotory` のMVP開発を開始してください。

最初に必ず以下を読み、仕様を把握してください。

1. `AGENTS.md`
2. `README.md`
3. `docs/01_product_requirements.md`
4. `docs/02_listing_rules.md`
5. `docs/03_pages_and_ui.md`
6. `docs/04_admin_and_auto_update.md`
7. `docs/05_non_functional_requirements.md`
8. `docs/06_mvp_scope.md`
9. `docs/07_implementation_order.md`
10. `db/0001_initial_schema.sql`

## 最重要ルール

- MVP外の機能を勝手に実装しないでください。
- 一般ユーザー向けログイン、お気に入り、保存検索、課金、閲覧履歴はまだ作りません。
- AIが企業の公開情報を直接更新する設計は禁止です。
- 自動確認で変更があった場合は変更候補を作り、管理者承認後に反映してください。
- HeroUI v3を参考に、シンプルで情報が読みやすいUIにしてください。
- 巨大な単一ファイルへ実装を集約しないでください。
- D1、外部ページ取得、AI判定、UIを疎結合にしてください。
- SSRFを含む外部URL取得の安全対策を必ず考慮してください。

## 技術確認

実装開始前に、以下の現在の公式ドキュメントを確認してください。

- Next.js
- HeroUI v3
- Cloudflare Workers
- Cloudflare D1
- Cloudflare Workflows
- Workers AI
- Cloudflare Browser Run

古い知識だけでバージョンや設定方法を決めないでください。

## 最初に行うこと

いきなり全機能を実装しないでください。

まず以下を実施してください。

1. 現在のリポジトリ状態を確認
2. 要件ファイルを読む
3. 最新公式ドキュメントを確認
4. 採用する具体的な構成を提案
5. ディレクトリ構造を提案
6. MVP実装を小さなマイルストーンへ分割
7. 不明点・技術上のリスクを明示

その後、**Step 1: プロジェクト初期化**から着手してください。

## 期待する最初の回答

以下の形式で簡潔に報告してください。

### 理解したプロダクト
Remotoryの目的を3〜5行。

### 採用構成
Frontend / DB / Deploy / UI / Update / AI。

### ディレクトリ案
主要ディレクトリのみ。

### 実装マイルストーン
Stepごと。

### リスク・確認事項
実装前に確認すべき点のみ。

その後、実装を開始してください。
