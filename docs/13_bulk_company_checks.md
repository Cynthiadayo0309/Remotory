# 一括確認（Step 9）

## 対象と開始方法

管理者が `/admin/update` から手動で開始する。開始APIと状態取得APIは `/api/admin/update-runs` にまとめ、既存のCloudflare Access認証境界で保護する。

開始時点で `publication_status = published` の企業IDをD1へスナップショットし、実行中に公開状態が変わっても対象集合を変えない。同時に実行できる一括確認は1件だけとする。CronはPhase 1.5まで追加しない。

## Cloudflare Workflows

OpenNextの生成Workerを `worker.ts` から再利用し、同じWorkerから `CompanyUpdateWorkflow` をnamed exportする。`wrangler.jsonc` の `COMPANY_UPDATE_WORKFLOW` bindingを管理APIから呼び出す。

Workers Freeの1instanceあたり1,024 steps上限に収めるため、1instanceは `company_update_run_checks.processed_at IS NULL` の企業を最大250社だけ処理する。未処理企業が残る場合は同じWorkflow bindingから次のinstanceを開始する。

- 初回instance ID: run UUID
- 初回params: `{ runId, part: 1 }`
- 継続instance ID: `{runId}-part-{連番}`
- 継続params: `{ runId, part: 連番 }`

継続instanceを作る前に決定的なIDで `get(id).status()` を確認する。`unknown` のときだけ作成し、Workflow再開時に同じinstanceを二重作成しない。`errored` または `terminated` の継続instance、あるいは継続開始自体の失敗はrun全体を安全な固定メッセージで `failed` にする。最後のpartだけがrunを `completed` にする。

各企業では次を行う。

1. 対象企業とcheckをD1で対応付ける
2. 有効な情報源を通常fetchで取得する
3. baseline hashと比較する
4. 変更時だけWorkers AIで構造化解析する
5. 根拠付き変更候補を保存する
6. 有効な解析と候補保存が完了した情報源だけbaselineを確定する
7. checkと実行進捗を保存する

Cloudflare公式の現行仕様に従い、`step.do()` の結果を耐久化する。取得・AIリクエスト・一時的な内部障害は合計3attempt（初回 + 最大2回の再試行）、10秒からのexponential backoff、各attempt 2分timeoutとする。

全250社が企業確認に失敗した場合は、企業ごとの準備・確認・失敗記録で750 steps、part制御を含めて通常754 stepsとなる。異常終了記録まで含む保守的な上限を755 stepsとしてコードとテストで固定し、Free上限を超えないようにする。

- [Cloudflare Workflows Workers API](https://developers.cloudflare.com/workflows/build/workers-api/)
- [Cloudflare Workflowsの再試行](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/)
- [Cloudflare Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/)
- [Cloudflare Workflows local development](https://developers.cloudflare.com/workflows/build/local-development/)
- [OpenNext custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker)

## 安全側の状態遷移

- 全情報源が取得成功し、変更なしまたは有効な解析で差分なし: `success`
- 根拠付き候補あり: `changed`
- `AI_UNCERTAIN`、根拠不足、`full_remote = false`、情報源間の候補競合、3回連続取得失敗: `needs_review`
- 取得・AI・Workflow stepが最終attemptまで失敗: `failed`

`needs_review` と `failed` でも `companies.publication_status` は自動変更しない。AIは `companies` を更新せず、変更候補を作成するだけである。全情報源が変更なしの場合だけ企業の確認日時を自動更新する。候補の承認時はレビュー日時ではなく、候補を作ったcheckの `completed_at` を確認日時に使う。

## 冪等性と進捗

`company_update_runs` が実行全体の件数と状態を持ち、`company_update_run_checks` が対象企業・check・結果を対応付ける。

- Workflow再開時も同じ企業には同じcheckを使う
- check・field・情報源が同じ候補は重複作成しない
- 進捗記録には一意なtokenを使い、同じcheckを二重集計しない
- 情報源が異なる候補は自動統合せず、根拠別に保存する

管理画面は3秒ごとにD1の最新状態を取得し、処理社数、変更なし、候補あり、要確認、失敗、候補件数を表示する。

Next.js単体の `npm run dev` では同一Worker内のWorkflow bindingを利用できない。画面の通常開発には使えるが、一括確認を実際に開始するローカル結合確認にはCloudflare公式対応の `wrangler dev` を使用する。実Workers AIを含む結合確認はStep 11のpreview環境で行う。bindingがない環境で開始APIを呼んでも、失敗runを作らず `503 workflow_unavailable` を返す。

## Browser Run

Step 10まではStep 6のSSRF対策済み通常fetchだけを使い、Browser bindingやSDKは追加しない。JS描画不足は `failed` または `needs_review` として管理者に表示し、公開情報を変更しない。

Step 11のpreview環境で、架空企業向けに管理された公開URLを使って本文不足が再現した場合だけBrowser Runの追加を判断する。追加する場合もQuick Actionsへ任意URLを直接渡さず、Browser Sessionの全リクエストをinterceptし、安全なfetchを通したレスポンスだけをbrowserへ渡す。

- [Browser Run Quick Actions](https://developers.cloudflare.com/browser-run/quick-actions/)
- [Cloudflare Playwright](https://developers.cloudflare.com/browser-run/playwright/)
