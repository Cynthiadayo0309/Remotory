# 10. ページ取得基盤

## Step 6の責務

Step 6は、登録済みの公式情報源を安全に取得し、正規化本文とSHA-256ハッシュを返す。

AI解析、変更候補作成、企業の公開状態変更、最終確認日時更新、一括実行は行わない。

## 取得制限

- `http` は80番、`https` は443番ポートのみ
- 全体タイムアウト15秒
- 最大レスポンス2 MiB
- 最大5リダイレクト
- `text/html`、`application/xhtml+xml`、`text/plain`のみ
- リダイレクトは自動追跡せず、遷移先を毎回検証
- Step 6内ではリトライしない

## SSRF対策

- URL内の認証情報を拒否
- localhost系ホスト名を拒否
- URLがIPアドレスの場合は直接検証
- ドメインはA/AAAAを解決し、すべての結果が公開IPの場合だけ許可
- IPv4/IPv6のprivate、loopback、link-local、予約済み範囲等を拒否
- 外部へCookie、Authorization、Cloudflare Accessヘッダーを転送しない

Cloudflare Workersの外向きプロキシによる制限にも依存するが、アプリケーション側の検証を省略しない。

## ハッシュと状態記録

ハッシュは、不要要素を除去して空白を安定化した本文のSHA-256とする。

- 初回取得: `last_content_hash` にbaselineを保存
- 変更なし: 成功日時を更新し、連続失敗回数を0へ戻す
- 変更あり: 新しいhashを呼び出し元へ返すが、baselineは上書きしない
- 失敗: `consecutive_failures` を1増加

3回連続失敗、または企業情報の最終確認から6か月経過した場合は要確認相当とする。ただし、`publication_status` は自動変更しない。
