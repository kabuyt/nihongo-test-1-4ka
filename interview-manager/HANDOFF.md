# Mac Codex 引き継ぎメモ

## プロジェクト

- GitHub Pages: https://kabuyt.github.io/nihongo-test-1-4ka/
- 管理サイト: https://kabuyt.github.io/nihongo-test-1-4ka/interview-manager/index.html
- ローカルWindows側リポジトリ: `C:\Users\kabuyamat\Desktop\Webテスト_公開用`
- 対象フォルダ: `interview-manager`

## 現在できていること

- 面接ごとに候補者を管理
- 候補者ごとに写真、名前、数学、ベトナム国語、日本語単語、ピンボードを入力
- クレペリン結果をSupabaseから取り込み
- 総合順位をWeb上で表示
- PDF印刷用の集計表を表示
- 候補者ごとの受験リンク一覧を表示、印刷
- 受験リンク一覧にはクレペリンとベトナム国語テストのQRを表示
- 送り出し担当として `BARAEN`, `AKANE`, `VJC` を面接に登録
- 簡易ログインで送り出し別に表示を絞り込み

## 現在のログイン

- GROP管理者: `grop2026`
- BARAEN: `baraen2026`
- AKANE: `akane2026`
- VJC: `vjc2026`

## 現在の権限

- GROP管理者だけが面接を新規作成できる
- GROP管理者だけが全面接一覧を見られる
- GROP管理者だけが面接削除と送り出し変更をできる
- 各送り出しは、自分の担当面接だけ見られる
- 各送り出しは、担当面接の候補者情報や点数を入力できる

## 重要な残タスク

現在の送り出し別ログインは、静的サイト上で表示を絞る簡易スクリーニング。
スタッフに本格運用で渡す前に、Supabase AuthとRLSでDB側からも他社データを読めない形にする。

次にやる候補:

1. Supabaseで `interview-manager/add-sender-org.sql` を実行する
2. オオタ面接の送り出し担当を画面で設定する
3. BARAEN / AKANE / VJCでログインし、表示される面接が分かれるか確認する
4. Supabase Auth + RLSに移行する
5. 送り出しスタッフ用に、不要なPDF/CSV/削除系のUIをさらに整理する

## 関連ファイル

- `interview-manager/index.html`: 管理画面HTML
- `interview-manager/app.js`: 管理画面ロジック
- `interview-manager/style.css`: 管理画面CSS
- `interview-manager/supabase-schema.sql`: 新規構築用SQL
- `interview-manager/add-sender-org.sql`: 既存DBへ送り出し列を追加するSQL
- `interview-manager/TODO.md`: 残タスク
- `vietnamese-language-test/`: ベトナム国語テスト
- `kraepelin/interview.html`: 面接用クレペリン受験画面

## 注意

- 未追跡ファイルが他フォルダにあることがある。今回の面接管理作業では、関係するファイルだけをstage/commitする。
- 公開後はGitHub Pagesの反映待ちが必要。`gh -R kabuyt/nihongo-test-1-4ka run watch <run_id> --exit-status` で確認していた。
- 静的サイトの簡易ログインは、画面上の表示制御であり、本格的なデータ保護ではない。
