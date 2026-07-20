# 面接事前テスト管理 残タスク

## 重要: Supabase側への適用と動作確認

Supabase Auth + RLS対応コードは実装済み。`AUTH-SETUP.md` の手順で本番DBへ適用し、
4アカウントと匿名受験の動作を確認する。

- Supabase Authに4ユーザーを作る
- `add-sender-org.sql` と `enable-auth-rls.sql` を実行する
- 既存面接の送り出し担当を確認・修正する
- GROP / BARAEN / AKANE / VJCで閲覧範囲と操作権限を確認する
- QR経由のベトナム国語・クレペリン結果保存を確認する
