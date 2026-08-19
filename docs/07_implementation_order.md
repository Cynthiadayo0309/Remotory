# 07. 実装順序

Codexは一度に全機能を作らず、以下の順に進めること。

## Step 0: 現行技術の確認

最新の公式ドキュメントで以下を確認。

- Next.js
- Cloudflare Workers
- D1
- HeroUI v3
- Workflows
- Workers AI
- Browser Run

バージョンを推測しない。

## Step 1: プロジェクト初期化

- Next.js
- TypeScript
- Tailwind
- HeroUI v3
- lint / format
- test
- Cloudflare Workers対応

## Step 2: D1

- schema migration
- repository layer
- seed
- local / remote DB切り替え

## Step 3: 公開画面

- Header / Footer
- `/`
- 検索
- filter
- CompanyCard
- `/companies/[slug]`
- `/criteria`
- `/about`

## Step 4: 管理者認証

MVP用の安全な管理者認証を実装。
一般ユーザー認証は作らない。

## Step 5: 企業管理

- dashboard
- list
- create
- edit
- publication status
- sources

## Step 6: ページ取得基盤

- fetch
- SSRF protection
- normalize
- hash
- failure handling

最初はAIなしで確認可能にする。

## Step 7: AI判定

- structured output
- parser
- validation
- evidence
- confidence
- AI failure handling

## Step 8: 変更レビュー

- candidate generation
- diff
- approve
- reject
- companies update

## Step 9: 一括確認

- Workflow
- progress
- retry
- dashboard result

## Step 10: SEO / Accessibility / Test

- metadata
- sitemap
- robots
- accessibility
- E2E

## Step 11: Cloudflare deploy

- preview
- production
- D1
- Secrets
- logs

## Phase 1.5

MVPの運用確認後、Cron Triggerを追加。
