# Cloudflare preview環境（Step 11）

本番デプロイ前の検証専用環境として、Cloudflare上に次の資源を分離して作成する。

- Worker: `remotory-preview`
- URL: `https://remotory-preview.teyontt0309.workers.dev`
- D1: `remotory-preview`（APAC）
- Workflow: `remotory-company-update-preview`
- Workers AI binding: `AI`

本番Worker、本番D1、custom domain、Cron、Browser RunはこのStepでは作成しない。

## 安全設定

preview環境では以下を固定する。

- `REMOTORY_AUTH_DEV_BYPASS=false`
- `REMOTORY_ENABLE_REMOTE_BINDINGS=false`
- `REMOTORY_ALLOW_INDEXING=false`
- `REMOTORY_SITE_URL=https://remotory-preview.teyontt0309.workers.dev`

`robots.txt`は全体をDisallowし、HTML metadataにも`noindex, nofollow`を出す。公開ページへは認証を要求しない。管理画面と管理APIは、Cloudflare AccessのJWTがなければアプリケーション側でも403にする。

Accessの実値はGitへ保存せず、preview Workerのencrypted Secretsへ次のキーだけを登録する。

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`
- `CLOUDFLARE_ACCESS_AUD`
- `REMOTORY_ADMIN_EMAIL`

## D1 migrationとseed

対象をdatabase nameとenvironmentの両方で明示し、本番D1への誤操作を避ける。

```bash
npm run db:migrate:preview
npm run db:seed:preview
```

seedは`db/seed.sql`の架空企業だけを使用する。migration適用後のpreview D1は、公開企業1社、`needs_review`企業1社、情報源2件、pending変更候補1件となる。

## preview deploy

ignored対象の`.env.local`、または実行プロセスの環境変数へAccess用3キーを設定してから実行する。

```bash
npm run deploy:preview
```

`scripts/deploy-preview.mjs`はAccess用3キーが欠けていれば開始前に停止する。ビルド時のcanonicalをpreview URLへ固定し、indexingと開発用認証バイパスを必ず無効化してから、`--env preview`でデプロイする。secret値は標準出力へ表示しない。

## Cloudflare Access

previewのworkers.devホストには、既存AUDを維持したhostname/pathベースのAccess applicationを関連付ける。公開ページを認証必須にしないため、Worker全体の「All traffic」は使用しない。

- `remotory-preview.teyontt0309.workers.dev/admin`
- `remotory-preview.teyontt0309.workers.dev/admin/*`
- `remotory-preview.teyontt0309.workers.dev/api/admin`
- `remotory-preview.teyontt0309.workers.dev/api/admin/*`

Allow policyは指定管理者メールだけ、認証方法はOne-time PINとする。Access policy、Worker Secret、ignored対象の`.env.local`では、同じ管理者メールアドレスを使用する。実値はGit管理しない。

2026-08-22に次を確認済み。

- 公開ページはAccessログインなしで表示
- `/admin/*`と`/api/admin/*`は未認証時にAccessログインへリダイレクト
- One-time PINで許可済み管理者としてログイン
- Access JWTのissuer、AUD、署名、有効期限、メールアドレスをアプリケーション側でも検証
- JWT検証後に管理ダッシュボードを表示

## 検証項目

- 公開トップ、掲載基準、About、公開企業詳細が200
- `needs_review`企業詳細が404
- Access設定前はJWTなしの`/admin`と`/api/admin/session`がアプリケーション側で403
- Access設定後は未認証の管理パスがAccessログインへ302リダイレクト
- OTPログイン後はアプリケーション側JWT検証を通過して管理画面を表示
- canonicalがpreview URL
- `robots.txt`とmetadataがnoindex
- sitemapに固定公開ページとpublished企業だけを含む
- D1 migration 2件と架空seedをremote previewへ適用
- WorkflowがD1、外部取得、進捗集約を通して完了
- Workers AIを実行し、低信頼度結果を`needs_review`として安全側に分類
- Workers Logsで公開・企業詳細・管理画面requestが例外なく完了
- Playwright E2EがPC 1,440px・mobile 390pxで28件成功

通常fetchで管理された公開HTMLを取得してWorkers AIまで処理できたため、Browser Run bindingは追加しない。将来、実在の検証対象でJavaScript描画不足が再現した場合だけ、`docs/10_page_fetching.md`のSSRF境界を維持する方式で再検討する。

結合試験で作成した一時run、check、候補は試験後に削除し、D1は元の架空seed状態へ戻す。Workflow instanceの実行履歴はCloudflareの監査用履歴として残る。
