# SEO・アクセシビリティ・E2E（Step 10）

## SEO

Next.js App RouterのMetadata APIとmetadata file conventionを使用する。

- ルートでタイトルtemplate、説明、Open Graph、`metadataBase`を設定
- 公開ページごとにcanonical URLを設定
- 企業詳細は公開企業の名前・説明・canonical URLを動的生成
- `sitemap.ts`は固定公開ページと `publication_status = published` の企業だけをD1から取得
- `/admin/*`、`/api/admin/*`、非公開企業はsitemapへ含めない
- `robots.ts`は明示的に本番indexingを許可するまでサイト全体をクロール不可にする

本番ホスト名はStep 11で `REMOTORY_SITE_URL` に設定する。previewとローカルでは `REMOTORY_ALLOW_INDEXING=false` を維持し、レビュー済みの本番ホストだけ `true` にする。

- [Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)

## アクセシビリティ

- 公開・管理レイアウトにキーボード操作可能な「本文へスキップ」を追加
- `main`を明示し、スキップ後にフォーカスを移せるようにする
- Playwrightとaxeで主要公開・管理画面のWCAG 2.0/2.1 A・AA違反を検査
- 色だけで状態を伝えない既存方針を維持

自動検査だけでは検出できない問題があるため、Step 11 previewでもキーボード操作と表示内容を目視確認する。

- [Playwright Accessibility testing](https://playwright.dev/docs/accessibility-testing)

## E2Eとスクリーンショット

`npm run test:e2e` はローカルD1 migrationと架空seedを適用し、Next.js development serverを起動する。PC幅1,440pxとモバイル幅390pxのChromium projectで次を確認する。

- 公開検索条件がURLへ保持され、再読み込み後も維持される
- 公開企業詳細と公式CTA
- sitemap・robots・canonical・title
- 主要公開画面と管理画面のWCAG自動検査
- キーボードによるスキップリンク
- 横方向overflowがないこと
- 主要公開画面と管理画面のfull-page screenshot

スクリーンショットとHTML reportはGit管理せず、`test-results/`と`playwright-report/`へ生成する。Step 11 previewを検査する場合は `PLAYWRIGHT_BASE_URL` にpreview URLを渡し、ローカルserver起動を無効化する。

- [Playwright web server](https://playwright.dev/docs/test-webserver)
- [Playwright screenshots](https://playwright.dev/docs/screenshots)
