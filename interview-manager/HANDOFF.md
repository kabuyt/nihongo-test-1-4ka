# Mac Codex 引き継ぎメモ

## プロジェクト

- GitHub Pages: https://kabuyt.github.io/nihongo-test-1-4ka/
- 管理サイト: https://kabuyt.github.io/nihongo-test-1-4ka/interview-manager/index.html
- ローカルWindows側リポジトリ: `C:\Users\kabuyamat\Desktop\Webテスト_公開用`
- 対象フォルダ: `interview-manager`

## 現在できていること

- 面接ごとに候補者を管理
- 候補者ごとに写真、氏名（カタカナ・LATIN NAMEを2段入力）、数学、ベトナム国語、日本語単語、ピンボードを入力
- クレペリン結果をSupabaseから取り込み（面接を開いている間は30秒ごとに自動取得。タブが前面のときだけ動き、最終取得時刻を画面に表示）
- 数学テストはQR受験の全問選択式アプリ（`math-test/`）で自動採点し、点を自動取り込み（ベトナム国語と同じ方式）。数学検定5級第1回の30問。図つき3問は画像を assets/ に同梱。管理表の点欄は手入力での上書きも可
- 総合順位をWeb上で表示。各科目を100点満点に揃えた得点の合計で決定（クレペリン=独自100点、数学=自動採点100点、ベトナム国語=100点満点、日本語単語=30問を100換算、ピンボード=下記）
- 科目別順位は同点なら同順位。未入力の科目は順位を出さず、合計にも加えない
- PDF印刷用の集計表を表示
- 候補者ごとのQR受験票を表示、印刷
- 候補者別QR受験票には、面接で有効にしたクレペリン・数学・ベトナム国語・行動選択テストのQRを表示
- 面接ごとにクレペリン、数学、ベトナム国語、日本語単語、ピンボード、行動選択テストの実施有無を設定
- QR受験票・管理表・報告書・CSVには、その面接で実施するテストだけを表示
- 行動選択テストは候補者専用URLで自動紐付けし、回答傾向を参考資料として表示（総合順位には不算入）
- 行動選択テストは6問の回答から、設問を知らない読み手にも判断内容が伝わる面接用の一言コメントを自動表示
- 実施しない採点科目は総合順位から除外し、実施予定科目が未入力の間は総合順位を「集計中」と表示
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
- 管理画面に各評価の判断基準と得点の計算式を表示
- ◎・○・△・×すべてで時間を入力し、ピンボードを100点満点に換算（評価点90点×（◎3・○2・△1・×0の2回合計÷6）＋時間点10点×（面接内の最速者の合計時間÷本人の合計時間））
- ピン順位はこの得点順。評価が1段階違うと15点差になるため、時間の速さだけで評価の高い候補者を上回ることはない
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
- `interview-manager/add-test-settings-behavior.sql`: 企業別テスト設定と行動選択テスト統合を追加するSQL
- `interview-manager/AUTH-SETUP.md`: AuthとRLSの設定・確認手順
- `interview-manager/TODO.md`: 残タスク
- `vietnamese-language-test/`: ベトナム国語テスト
- `kraepelin/interview.html`: 面接用クレペリン受験画面

## 注意

- 未追跡ファイルが他フォルダにあることがある。今回の面接管理作業では、関係するファイルだけをstage/commitする。
- 公開後はGitHub Pagesの反映待ちが必要。`gh -R kabuyt/nihongo-test-1-4ka run watch <run_id> --exit-status` で確認していた。
- 権限変更SQLと対応するJavaScriptは、公開時に必ず同じ版へ揃える。
