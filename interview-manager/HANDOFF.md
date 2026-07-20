# Mac Codex 引き継ぎメモ

## プロジェクト

- GitHub Pages: https://kabuyt.github.io/nihongo-test-1-4ka/
- 管理サイト: https://kabuyt.github.io/nihongo-test-1-4ka/interview-manager/index.html
- ローカルWindows側リポジトリ: `C:\Users\kabuyamat\Desktop\Webテスト_公開用`
- 対象フォルダ: `interview-manager`

## 現在できていること

- 面接ごとに候補者を管理
- 候補者ごとに写真、氏名（カタカナ・LATIN NAMEを2段入力）、数学、ベトナム国語、日本語単語、ピンボードを入力
- クレペリン結果をSupabaseから取り込み
- 総合順位をWeb上で表示
- PDF印刷用の集計表を表示
- 候補者ごとのQR受験票を表示、印刷
- 候補者別QR受験票にはクレペリンとベトナム国語テストのQRを表示
- QR受験票は全員分または候補者1人分を印刷でき、各受験URLもコピー可能
- 送り出し担当として `BARAEN`, `AKANE`, `VJC` を面接に登録
- Supabase AuthでGROP管理者、BARAEN、AKANE、VJCがログイン
- RLSで送り出し別にDBの閲覧・更新範囲を制限
- QR受験はログイン不要のまま、専用DB関数で点数・結果だけを保存

## 現在のログイン

| アカウント | ログインID | パスワード |
|---|---|---|
| GROP管理者 | `grop` | `grop2026` |
| BARAEN | `baraen` | `baraen2026` |
| AKANE | `akane` | `akane2026` |
| VJC | `vjc` | `vjc2026` |

ログイン画面は入力式で、送り出し会社の一覧を表示しない。
送り出しでログインした場合、面接画面にも他の送り出し会社の選択肢を表示しない。

## 現在の権限

- GROP管理者だけが面接を新規作成できる
- GROP管理者だけが全面接一覧を見られる
- GROP管理者だけが面接削除と送り出し変更をできる
- 各送り出しは、自分の担当面接だけ見られる
- 各送り出しは、担当面接の候補者情報や点数を入力できる
- PDF・CSV・候補者削除はGROP管理者だけが利用できる
- 候補者削除はRLSでもGROP管理者だけに制限
- ピンボードは各回をプルダウンで◎・○・△・×の4段階評価
- 管理画面に各評価の判断基準と順位ルールを表示
- ◎・○・△の場合は時間を入力し、評価合計、2回目の評価、時間の順でピン順位を計算（×は時間不要）
- 未ログイン状態では面接、候補者、クレペリン結果を直接読めない
- 株式会社オオタ面接の送り出しは `BARAEN`

## Supabase Auth + RLS

2026-07-20に本番適用・公開・確認済み。

- `interview-manager/enable-auth-rls.sql` を本番DBへ適用済み
- GROP / BARAEN / AKANE / VJCのAuthアカウントを作成済み
- GROPとBARAENは株式会社オオタ面接を取得
- AKANE、VJC、未ログイン状態は同面接を取得できない
- 公開管理画面でGROPとBARAENのログイン表示を確認済み

送り出しスタッフ用のPDF・CSV・候補者削除系UI整理は2026-07-20に完了。

## 関連ファイル

- `interview-manager/index.html`: 管理画面HTML
- `interview-manager/app.js`: 管理画面ロジック
- `interview-manager/style.css`: 管理画面CSS
- `interview-manager/supabase-schema.sql`: 新規構築用SQL
- `interview-manager/add-sender-org.sql`: 既存DBへ送り出し列を追加するSQL
- `interview-manager/enable-auth-rls.sql`: Auth・RLS・匿名受験用DB関数
- `interview-manager/restrict-sender-candidate-delete.sql`: 既存DBの候補者削除権限を管理者限定にするSQL
- `interview-manager/AUTH-SETUP.md`: AuthとRLSの設定・確認手順
- `interview-manager/TODO.md`: 残タスク
- `vietnamese-language-test/`: ベトナム国語テスト
- `kraepelin/interview.html`: 面接用クレペリン受験画面

## 注意

- 未追跡ファイルが他フォルダにあることがある。今回の面接管理作業では、関係するファイルだけをstage/commitする。
- 公開後はGitHub Pagesの反映待ちが必要。`gh -R kabuyt/nihongo-test-1-4ka run watch <run_id> --exit-status` で確認していた。
- 権限変更SQLと対応するJavaScriptは、公開時に必ず同じ版へ揃える。
