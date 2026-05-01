# まるごと入門A1 月例テスト — 引き継ぎメモ

最終更新: 2026-05-01

> Windows / Mac 両方で作業する場合、**最初にこのファイルをClaude Codeに読ませてください**。
> 直近の状態・既知の問題・命名規則をすべて把握できます。

## 📍 プロジェクト情報

| 項目 | 値 |
|---|---|
| リポジトリ | https://github.com/kabuyt/nihongo-test-1-4ka |
| Mac ローカルパス | `/Users/kabu/Desktop/Webテスト_公開用/marugoto-nyumon/` |
| Windows ローカルパス | `%USERPROFILE%\Desktop\nihongo-test-1-4ka\marugoto-nyumon\` |
| 技術スタック | HTML/CSS/Vanilla JS（フレームワーク・外部ライブラリ不使用） |
| 対象 | ベトナム人実習生向け、A1学習者 |
| 教材 | まるごと 日本のことばと文化 入門A1（かつどう＋りかい） |

## 🎯 プロジェクト概要

『まるごと入門A1』全18課を **4回（5+5+4+4）の月例テスト** でカバーする計画。
- 各回 **語彙100点・文法100点・聴解100点 = 300点**
- 第1回（L1-L5）完成済み、第2-4回未着手

## 📁 ファイル構成

```
marugoto-nyumon/
├── HANDOFF.md                      # このファイル
├── 第1回/
│   ├── index.html                  # アプリ本体（約500行、依存ゼロ）
│   ├── test1_questions.json        # 110問の問題データ
│   └── images/                     # 画像SVG 20枚（v5用）
├── 第2回/                          # 未作成
├── 第3回/                          # 未作成
└── 第4回/                          # 未作成

audio/marugoto-nyumon/              # ★Git管理外（.gitignore）★
├── Lesson01-18/                    # まるごと公式音源（273MB / 426ファイル）
└── transcripts/
    └── L01_L05.json                # Whisper転写（管理用、git管理対象）
```

## 🚀 Windowsでセットアップ

### 1. リポジトリをクローン
```cmd
cd %USERPROFILE%\Desktop
git clone https://github.com/kabuyt/nihongo-test-1-4ka.git
cd nihongo-test-1-4ka
```

### 2. 音声ファイルを配置（git管理外）

`MarugotoStarterActivitiesMp3.zip` を入手して展開:
- 入手元: 国際交流基金 公式（Macで持っているなら転送）
- 展開先: `audio\marugoto-nyumon\`
- 結果: `audio\marugoto-nyumon\Lesson01\`〜`Lesson18\` フォルダができればOK

```cmd
:: フォルダ名のリネーム（"MarugotoStarterActivitiesMp3Lesson01" → "Lesson01"）
cd audio\marugoto-nyumon
for /d %d in (MarugotoStarterActivitiesMp3Lesson*) do ren "%d" "Lesson%d:~38%"
```

### 3. ローカルサーバー起動
```cmd
:: Node.js が入っていれば
npx http-server . -p 8080 -c-1

:: または Python
python -m http.server 8080
```

### 4. ブラウザで確認
```
http://localhost:8080/marugoto-nyumon/第1回/
```

## 📚 参考資料（ローカルに別途保存）

| ファイル | 用途 | サイズ |
|---|---|---|
| `MarugotoStarterWordbook_VN.pdf` | 語彙範囲チェック用（必須）| 5MB |
| `starter_activities_contents.pdf` | かつどう目次 | 126KB |
| `starter_competences_contents.pdf` | りかい目次 | 194KB |
| `1028480109-...かつどう.pdf` | かつどう本体（画像） | 13MB |
| `まるごとA1.pdf` | A1総合本体（画像） | 20MB |
| `MarugotoStarterActivitiesMp3.zip` | 公式音源 | 285MB |

→ Windowsへ全部コピー推奨（特にWordbookは語彙監査スクリプトで必須）。

## 🧪 テスト構成（第1回 = 110問・300点）

### 語彙セクション（60問・100点）
| 問 | 内容 | 問数 | 配点 |
|---|---|---|---|
| 問1 | ひらがな表記 → ベトナム語 | 10 | 20 |
| 問2 | カタカナ表記 → ベトナム語 | 10 | 20 |
| 問3-A | 漢字読み（魚・肉・卵・水）| 5 | 10 |
| 問3-B | 漢字 → ベトナム語意味 | 5 | 10 |
| 問4 | ベトナム語 → 日本語 | 10 | 20 |
| 問5 | 画像 → 語彙 | 20 | 20 |

### 文法セクション（25問・100点）
| 問 | 内容 | 問数 | 配点 |
|---|---|---|---|
| 問1 | 助詞穴埋め (は・が・を・も・の・と・に) | 10 | 40 |
| 問2 | 〜です/じゃないです・ます/ません | 5 | 20 |
| 問3 | 並び替え（4択）| 5 | 20 |
| 問4 | 文型理解・対話 | 5 | 20 |

### 聴解セクション（25問・100点）
| 問 | テーマ | 問数 | 配点 | 音源範囲 |
|---|---|---|---|---|
| 問1 | あいさつ・場面 | 5 | 20 | L1 sa002-006 |
| 問2 | 教室の会話 | 5 | 20 | L2 sa011-018 |
| 問3 | 自己紹介・国・仕事 | 5 | 20 | L3 sa029-043 |
| 問4 | 家族 | 5 | 20 | L4 sa047-056 |
| 問5 | 好きなもの・食事 | 5 | 20 | L5 sa061-073 |

## ⚠️ 厳守すべき言語仕様（重要）

A1学習者向けなので **「習わない漢字を含めない」** が絶対ルール:

| 制約 | 内容 |
|---|---|
| **第1回 使用可漢字** | `魚・肉・卵・水` + `問`（テストラベル）のみ |
| **未習語禁止** | 全語彙が `MarugotoStarterWordbook_VN.pdf` に存在することを確認 |
| **教科書表現に準拠** | 例: ✓「どちらから」、✗「どこから」（教科書では使わない）|
| **聴解の質問文** | 日本語のみ（VN訳は載せない=聴解として機能維持）|
| **語彙・文法の選択肢** | バイリンガル（日本語＋ベトナム語）|
| **固有名詞** | 日本人名はひらがな（たなか/やまだ等）、外国人名はカタカナ（カーラ/ワン等）|

### 過去にやらかした変換ミス（再発防止）

| 誤 | 正 | 原因 |
|---|---|---|
| だちゅうさん | たなかさん | 田中の自動読み変換ミス |
| あんべさん | あべさん | 安倍の自動読み変換ミス |
| ちゅうごくひと | ちゅうごくじん | 〜人 (じん vs ひと) 誤判定 |
| おあねさん | あね or おねえさん | お+姉(あね)+さん → 単純連結ミス |
| たべこと | しょくじ | 食事の漢字単独変換 |
| すききな | すきな | 好き(すき)+な → すきき+な ミス |
| かいはなし | かいわ | 会話の単独変換ミス |

→ 漢字置換スクリプトを作る場合は **複合語を先に登録**、最後に単漢字フォールバック。

## 🎧 音声ファイル仕様

- 形式: MP3、16kHz mono または 44.1kHz stereo（公式音源）
- ファイル名: `saXXX.mp3` または `saXXX_Y.mp3`（X=活動番号、Y=パート番号）
- レッスン別フォルダ: `Lesson01/sa001.mp3` など
- 配置場所: `audio/marugoto-nyumon/Lesson01-18/`
- **重要**: 1つの音源は1問でしか使わない（**1回再生制限**との整合）

## 🛠 開発・動作確認

### Windowsで開く
```cmd
:: 直接ブラウザ
start chrome %USERPROFILE%\Desktop\nihongo-test-1-4ka\marugoto-nyumon\第1回\index.html

:: ローカルサーバー経由
cd %USERPROFILE%\Desktop\nihongo-test-1-4ka
npx http-server . -p 8080 -c-1
start chrome http://localhost:8080/marugoto-nyumon/第1回/
```

### 漢字監査スクリプト（Python）
```python
# 範囲外漢字チェック
import json, re
with open('marugoto-nyumon/第1回/test1_questions.json') as f:
    d = json.load(f)
ALLOWED = set('魚肉卵水問')
# ... (HANDOFF.md内の audit script を参照)
```

→ Mac側 `/tmp/fix_test.py` の汎用版が必要なら別途取得。

## 📋 次にやりたいこと

- [ ] 第2回（L6-L10）作成 — かんじ追加: 食・飲・大・小・新・古・時・分・半・曜日
- [ ] 第3回（L11-L14）作成 — かんじ追加: 言・話・読・見・聞・書・数字一〜十・東西南北
- [ ] 第4回（L15-L18）作成 — 過去形（〜ました/〜かったです）導入
- [ ] 画像差し替え — SVG → 実写真 or いらすとや
- [ ] GAS結果送信統合
- [ ] Supabase認証統合（既存みん日テストとの連携）
- [ ] 管理者ダッシュボード（成績集計）

## 🔄 同期方法（Mac ⇔ Windows）

### Mac側（作業終了時）
```bash
cd /Users/kabu/Desktop/Webテスト_公開用
git add marugoto-nyumon/
git commit -m "marugoto: <変更内容>"
git push
```

### Windows側（作業開始時）
```cmd
cd %USERPROFILE%\Desktop\nihongo-test-1-4ka
git pull
:: Claude Code に "marugoto-nyumon/HANDOFF.md を読んで状況把握して" と伝える
```

## 🎓 既存みん日テストとの違い

| 観点 | みん日テスト（既存）| まるごとテスト（新規）|
|---|---|---|
| UI | [common/](../common/) を共有、3画面構成 | 単一HTML、1問1画面 |
| 認証 | Supabase（[login.html](../login.html)）| なし（Phase 1）|
| 結果送信 | GAS→スプレッドシート | localStorage（Phase 1）|
| 画像問題 | なし | 20問（Marugoto特性）|
| 音源 | mp3、共通 audio/ | mp3、`marugoto-nyumon/Lesson*/` |
| 範囲 | 50課を8回 | 18課を4回 |

将来的にバックエンド統合する場合は [common/](../common/) を流用検討。

## 📝 メモリファイル（Claude Code内）

- Mac: `/Users/kabu/.claude/projects/-Users-kabu-Desktop-Web-------/memory/project_marugoto_nyumon.md`
- Windows: `%USERPROFILE%\.claude\projects\<sanitized-cwd>\memory\project_marugoto_nyumon.md`
- 内容: 4回の分割計画、参照ファイルパス、進捗

→ メモリは端末ローカル。**Windows初回は「project_marugoto_nyumon.md を作って」とClaude Codeに依頼**してこのHANDOFF.mdをベースに作成してもらう。
