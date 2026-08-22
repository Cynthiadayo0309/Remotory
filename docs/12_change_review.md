# 変更候補レビュー（Step 8）

## 責務

Step 8は、検証済みのAI判定を現在の企業情報と比較し、根拠付き変更候補を作成する。管理者が候補を承認した場合だけ、該当する1フィールドを `companies` へ反映する。

AI解析、ページ取得、一括処理、再試行はこの層では実行しない。

## 候補生成

候補対象は既存スキーマの次の6フィールドに限定する。

- `remote_scope`
- `work_location_scope`
- `work_location_note`
- `office_required`
- `office_note`
- `recruiting_status`

`full_remote` は整合性確認に使うが、`companies` に対応列がないため候補として保存しない。`false` の場合は管理者確認が必要なissueとして返す。

安全側の規則:

- 現在値と同じ値は候補にしない
- AIの `unknown` で既存の確定値を消さない
- 各候補に該当する原文根拠がなければ候補にしない
- 地域注記を消す場合は「全国勤務可」の根拠を使う
- 出社注記を消す場合は「出社不要」の根拠を使う
- 同じcheck・field・情報源で再実行されても既存候補を返し、重複作成しない
- 同じfieldでも情報源が異なる候補は統合せず、根拠別にレビューできるよう保持する

候補生成後のbaseline hash確定はStep 9のオーケストレーションが担当する。AI失敗・根拠不足・候補保存失敗時はbaselineを更新しない。

## レビュー

管理画面 `/admin/reviews` はpending候補を企業単位でまとめ、次を表示する。

- 変更対象
- 現在値
- 候補値
- 根拠テキスト
- 情報源URL
- AI信頼度
- 承認 / 却下

管理画面と `/api/admin/reviews/*` は既存のCloudflare Access認証境界で保護する。

## 承認の整合性

承認はD1のtransactional batchで処理する。

1. 候補が `pending` であることを確認
2. `companies` の現在値が候補の `old_value` と一致することを確認
3. 候補を `approved` に変更
4. 対象企業の該当1フィールドだけを更新

旧値が一致しない場合は候補をpendingのまま残し、`409 stale_value` を返す。すでに承認・却下済みの場合も `409 already_reviewed` とし、二重反映しない。

却下時は候補を `rejected` にするだけで、企業情報を更新しない。
