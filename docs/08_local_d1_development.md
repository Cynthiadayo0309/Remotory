# 08. ローカルD1開発

## ローカル環境

通常の開発では `wrangler.jsonc` の `remotory-local` を利用する。
このbindingは `remote: false` と無効なダミーdatabase IDを持つため、標準コマンドが本番D1へ接続することはない。

```sh
npm run db:migrate:local
npm run db:seed:local
```

ローカルD1データは `.wrangler/` に保存され、Git管理されない。

## リモート環境

本番D1を作成するStepまで、リモート設定は行わない。
将来リモートD1を利用する場合のみ、`wrangler.remote.example.jsonc` を `wrangler.remote.jsonc` にコピーし、実際のdatabase IDを設定する。

リモート操作では必ず次の両方を明示する。

- `--config wrangler.remote.jsonc`
- `--remote`

`wrangler.remote.jsonc` はGit管理されない。標準のnpm scriptsはローカルD1だけを対象とする。
