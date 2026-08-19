# 04. 管理画面・企業情報自動更新仕様

## 目的

登録企業の公式情報を継続的に確認し、古いフルリモート情報を放置しない。

通常運用では月1回程度の確認を想定する。
6か月は更新頻度ではなく「更新忘れの安全装置」とする。

## MVP

管理者が管理画面から `全企業の情報を更新` を実行する。

Cronによる自動実行はPhase 1.5。

## 更新フロー

1. 公開対象企業を取得
2. `company_sources` の有効URLを取得
3. 通常 `fetch()` でHTML取得
4. 必要なテキストを正規化
5. コンテンツハッシュを生成
6. 前回ハッシュと比較
7. 変更なし → 最終確認日時更新
8. 変更あり → AI解析
9. 現在の企業データと比較
10. 差分を `company_change_candidates` に保存
11. 管理者レビュー
12. 承認後に `companies` を更新

## JSサイト

通常fetchで有効本文を取得できない場合のみ Browser Run を利用する。

全サイトでBrowser Runを利用しない。

## AI判定対象

AIには以下を判定させる。

- フルリモート勤務可能か
- 全社 / 一部職種 / 不明
- 日本全国勤務可能か
- 地域制限
- 出社有無
- 出社条件
- フルリモート求人の現在募集状況

返却形式は構造化JSONとする。

例:

```json
{
  "full_remote": true,
  "remote_scope": "partial",
  "work_location_scope": "nationwide",
  "work_location_note": null,
  "office_required": true,
  "office_note": "年2回の全社会議への参加が必要",
  "recruiting_status": "open",
  "confidence": 0.94,
  "evidence": [
    {
      "field": "office_note",
      "text": "年2回の全社会議を実施しています",
      "source_url": "https://example.com/recruit"
    }
  ]
}
```

## AIの扱い

AIは変更候補を作るだけ。

公開データを直接更新しない。

例外:
ページ取得成功かつ変更なしの場合の最終確認日時更新。

## 確認日時

内部では分ける。

- `last_verified_at`
- `remote_verified_at`
- `recruiting_verified_at`

ユーザー画面は原則 `last_verified_at` を表示。

## 取得失敗

1回の失敗だけで掲載停止しない。

状態例:

- `FETCH_FAILED`
- `PAGE_NOT_FOUND`
- `TIMEOUT`
- `CONTENT_EMPTY`
- `AI_FAILED`
- `AI_UNCERTAIN`

管理画面で確認できるようにする。

複数回失敗、または6か月以上検証できない場合は `needs_review` 候補とする。

## 将来

Phase 1.5:

- Cron Triggers
- 月1回自動確認
- 手動実行ボタンは残す

さらに将来:

- 採用状況は週1回
- リモート条件は月1回

のように確認頻度を分離可能な設計を目指す。
