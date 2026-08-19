# Remotory

Remotory は、日本に拠点があり、フルリモートで働けるポジションを持つ企業を探すための企業ディレクトリです。

## コンセプト

求人情報そのものを大量に保持するのではなく、

- フルリモート勤務が可能か
- 全社か一部職種か
- 日本全国から勤務できるか
- 出社が必要か
- 現在フルリモート求人を募集しているか
- その情報を最後にいつ確認したか
- 何を根拠に判断したか

を分かりやすく提供し、最終的に企業の公式採用サイトへつなぎます。

## 技術方針

- Frontend: Next.js
- UI: HeroUI v3 を参考にしたシンプルなUI
- API: Next.js Route Handlers / Cloudflare Workers
- Database: Cloudflare D1
- Hosting: Cloudflare Workers
- 自動確認: Cloudflare Workflows
- 通常ページ取得: `fetch()`
- JSレンダリングが必要なページ: Cloudflare Browser Run
- AI判定: Workers AI
- 定期実行: Cron Triggers（MVP後）
- 一般ユーザー認証: MVPでは実装しない
- 管理者認証: MVPで必須
- 将来認証: Better Auth
- 将来課金: Stripe

## ドキュメント

- `docs/01_product_requirements.md` — サービス要件
- `docs/02_listing_rules.md` — 掲載・判定ルール
- `docs/03_pages_and_ui.md` — 画面・UI設計
- `docs/04_admin_and_auto_update.md` — 管理画面・自動更新仕様
- `docs/05_non_functional_requirements.md` — 非機能要件
- `docs/06_mvp_scope.md` — MVP範囲
- `docs/07_implementation_order.md` — 実装順序
- `docs/08_local_d1_development.md` — ローカルD1の利用方法
- `docs/09_cloudflare_access.md` — 管理画面のCloudflare Access設定
- `db/0001_initial_schema.sql` — D1初期スキーマ
- `AGENTS.md` — Codex向け常設指示
- `prompts/01_initial_codex_prompt.md` — Codexへの初回指示

## ローカルD1

```sh
npm run db:migrate:local
npm run db:seed:local
```

標準コマンドはローカルD1だけを対象とします。リモート環境との切り替え方は `docs/08_local_d1_development.md` を参照してください。
