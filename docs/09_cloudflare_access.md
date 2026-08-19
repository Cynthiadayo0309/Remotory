# Cloudflare Access 管理者認証

Remotoryの公開画面は認証不要とし、`/admin`、`/admin/*`、`/api/admin`、`/api/admin/*` だけをCloudflare Accessとアプリケーション側JWT検証の二重で保護する。

## Cloudflare側の設定

1. Zero Trustで使用するTeam Domainを確認する。
2. One-time PINをIdentity Providerとして有効化する。
3. Self-hosted applicationを1つ作成する。
4. 同じApplication Audienceを使うよう、次のパスを同じアプリケーションへ追加する。
   - `<production-host>/admin`
   - `<production-host>/admin/*`
   - `<production-host>/api/admin`
   - `<production-host>/api/admin/*`
5. Allow policyは `Include > Emails` で指定した管理者メールアドレスだけを許可する。
6. Login methodはOne-time PINだけを選択する。
7. Application settingsからApplication Audience (AUD) Tagを控える。

`Include > Login Methods > One-time PIN` だけのAllow policyは、有効なメールアドレスを持つ全員を許可し得るため使用しない。

## Workerの実行時環境変数

Cloudflare dashboardのWorker設定へ次を登録する。Git管理する設定ファイルには実値を書かない。

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`: `https://<team-name>.cloudflareaccess.com` 形式のTeam Domain
- `CLOUDFLARE_ACCESS_AUD`: Access applicationのApplication Audience Tag
- `REMOTORY_ADMIN_EMAIL`: Access policyで許可した管理者メールアドレスと同じ値

Workers Buildsを使う場合は、ビルド時に必要な環境変数もBuild Variables and Secretsへ登録する。実行時のJWT検証に使う値はWorkerのRuntime variablesにも必ず登録する。

## アプリケーション側検証

リクエストの `Cf-Access-Jwt-Assertion` headerを使用する。`CF_Authorization` cookieには依存しない。

検証内容:

- Team Domainの `/cdn-cgi/access/certs` から取得したJWKSによるRS256署名検証
- `iss` が設定済みTeam Domainと一致
- `aud` がApplication Audienceと一致
- `exp` が存在し、有効期限内
- `sub` と `email` claimが存在
- `email` が `REMOTORY_ADMIN_EMAIL` と一致

検証失敗、header欠落、設定不足はfail closedで403を返す。管理APIの403応答には内部の失敗理由を含めない。

保護対象のパス判定はNext.js Middlewareで行う。Next.js 16ではProxyが標準だが、現在のOpenNext CloudflareはNode.js Proxyを未サポートのため、WorkersでサポートされるEdge Middlewareを認証境界として使用する。各管理APIも共通の `withAdminAuth` でJWTを再検証する。

## ローカル開発

標準状態ではローカルでも認証はfail closedになる。Accessなしで管理画面を開発する場合だけ、`.env.example` を参考にignored対象の `.env.local` を作成する。

```dotenv
REMOTORY_AUTH_DEV_BYPASS=true
```

バイパスは `NODE_ENV=development` と上記の値が同時に成立する場合だけ有効になる。`production`、`test`、未設定環境ではこのフラグを指定しても有効にならない。

Worker previewではignored対象の `.dev.vars` を使い、`NEXTJS_ENV=development` と明示的なバイパスフラグを設定する。本番環境には `REMOTORY_AUTH_DEV_BYPASS=true` を登録しない。
