# AI判定基盤（Step 7）

## 責務と境界

`src/server/ai/` は、Step 6で取得・正規化された本文をWorkers AIへ渡し、フルリモート条件の構造化された判定結果を返す。

この層は次の処理を行わない。

- `companies` の更新
- `company_sources.last_content_hash` の更新
- 変更候補の作成・承認・却下
- `company_checks` の記録

変更候補への変換はStep 8、確認処理全体の記録と再試行はStep 9が担当する。AIの成功・失敗にかかわらず、この層から公開情報を直接更新しない。

## Workers AI

- binding: `AI`
- Wrangler binding mode: `remote: true`（Workers AIにはローカル推論がないため）
- model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- output: `response_format.type = json_schema`
- temperature: `0`
- streaming: 無効

ローカルテストは依存注入したfake clientを使い、Cloudflareアカウントや実AIへ接続しない。OpenNextの開発コンテキストでもremote bindingは既定無効で、`.env.local` の `REMOTORY_ENABLE_REMOTE_BINDINGS=true` を明示した場合だけ有効にする。Workers AIの実行にはCloudflareへのログインと利用料金が必要になるため、Step 7では実行用のAPIやUIを公開しない。

## 入力

AIへ渡すのは企業名、検証済み情報源URL、Step 6で正規化したテキストだけで、外部HTMLは渡さない。長文は先頭と、リモート・勤務地・出社・募集に関係する語の周辺を最大18,000文字まで抽出する。抜粋しかない場合は明記されていない内容を `unknown` とするよう指示する。

外部本文はプロンプト内で信頼できないデータとして扱い、本文内の命令に従わないようsystem promptで固定する。

## 出力検証

Workers AIのJSON Schema指定だけに依存せず、次をアプリ側で検証する。

- Zodによる型、enum、長さ、追加プロパティの拒否
- 地域制限と地域注記、出社必須と出社条件の整合性
- 判定済み項目に対応する根拠の存在
- 全項目が不明な場合に限った空の根拠配列
- `evidence.source_url` と入力URLの完全一致
- `evidence.text` とAIへ渡した本文抜粋の完全一致
- 信頼度 `0.75` 以上

## 失敗分類

- `AI_FAILED`: 入力不正、Workers AI実行失敗、不正JSON、schema不適合。実行失敗・応答形式不正は後続Workflowで再試行可能とする。
- `AI_UNCERTAIN`: 根拠URL不一致、根拠が本文にない、信頼度不足。自動反映や自動再試行をせず管理者確認へ回す。

エラーメッセージにはモデルの生レスポンス、外部本文、binding例外の詳細を含めない。
