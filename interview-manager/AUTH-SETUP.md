# Supabase Auth + RLS 設定

## 1. Authユーザーを作る

Supabase Dashboard の `Authentication` → `Users` → `Add user` で、次の4件を作成する。
`Auto Confirm User` はオンにする。

| 画面表示 | Email | Password |
|---|---|---|
| GROP管理者 | `grop-admin@nihongo-test.local` | `grop2026` |
| BARAEN | `baraen@nihongo-test.local` | `baraen2026` |
| AKANE | `akane@nihongo-test.local` | `akane2026` |
| VJC | `vjc@nihongo-test.local` | `vjc2026` |

これらのEmailはログインIDとしてだけ使い、メール送信には使わない。

## 2. SQLを実行する

既存DBでは、Supabase SQL Editorで次の順に実行する。

1. `add-sender-org.sql`（まだ実行していない場合）
2. `enable-auth-rls.sql`

`enable-auth-rls.sql` の最後に4アカウントが表示されることを確認する。
4件未満なら不足しているAuthユーザーを作り、SQL全体をもう一度実行する。

## 3. 面接の送り出しを設定する

GROP管理者で管理画面に入り、既存の各面接に `BARAEN`、`AKANE`、`VJC` のいずれかを設定する。
`sender_org` 追加時の既定値は `BARAEN` なので、特に既存面接を必ず確認する。

## 4. 権限を確認する

別々のプライベートブラウザウィンドウを使い、次を確認する。

- GROP管理者: 全面接を閲覧でき、面接作成・削除・送り出し変更ができる
- BARAEN / AKANE / VJC: 自社の面接だけを閲覧・入力できる
- 各送り出し: 他社の面接UUIDをURLやAPIに指定してもデータを取得できない
- QRからのベトナム国語テスト: ログインなしで点数が保存される
- QRからのクレペリン: ログインなしで結果が保存され、担当送り出しとGROPだけが取得できる

## ロールバックについて

本SQLは旧「public can ...」ポリシーを削除する。公開後に旧JavaScriptへ戻すと管理画面からDBを読めなくなるため、
`enable-auth-rls.sql` と対応するJavaScriptは必ず同時に公開する。
