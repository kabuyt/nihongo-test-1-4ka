/**
 * Google Apps Script — みんなの日本語 月間テスト 成績受信スクリプト
 *
 * ■ 設定方法
 * 1. このスクリプトをApps Scriptエディタに貼り付ける
 * 2. SHEET_NAME を実際のシート名に合わせる（デフォルト: "成績データ"）
 * 3. 「デプロイ」→「新しいデプロイ」→種類:ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 4. 表示されたURLをコピーして index.html の GAS_URL に貼り付ける
 */

const SHEET_NAME = '成績データ';

// ヘッダー行の定義
const HEADERS = [
  'タイムスタンプ',
  '受験日',
  '名前（カタカナ）',
  '名前（ローマ字）',
  'クラス',
  '会社・所属',
  '語彙点数',
  '文法点数',
  '聴解点数',
  '合計点',
  '換算点(/3)',
  '判定',
  '離席回数',
  '自由記述回答（JSON）'
];

// 各セクションの満点・合格ライン
const SCORE_CONFIG = {
  '語彙点数':  { max: 25, pass: 15 },
  '文法点数':  { max: 30, pass: 18 },
  '聴解点数':  { max: 20, pass: 12 },
  '合計点':    { max: 75, pass: 45 },
};

/**
 * POSTリクエストを受け取り、スプレッドシートに追記する
 */
function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = e.parameter;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // シートがなければ作成してヘッダーを追加
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4472C4');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    // 点数計算
    const goii    = Number(data.goii_auto)    || 0;
    const bunpo   = Number(data.bunpo_auto)   || 0;
    const chokkai = Number(data.chokkai_auto) || 0;
    const total   = goii + bunpo + chokkai;
    const scaled  = Math.round(total / 3 * 10) / 10;
    const result  = scaled >= 60 ? '合格' : '不合格';

    // 行データ作成
    const row = [
      data.timestamp    || new Date().toISOString(),
      data.test_date    || '',
      data.name_kata    || '',
      data.name_latin   || '',
      data.class_name   || '',
      data.company      || '',
      goii,
      bunpo,
      chokkai,
      total,
      scaled,
      result,
      data.leave_count  || 0,
      data.free_answers || ''
    ];

    sheet.appendRow(row);

    // 列幅の自動調整（初回 or 10行ごと）
    const newRow = sheet.getLastRow();
    if (newRow <= 2 || newRow % 10 === 0) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    // ---- セル別カラーリング ----
    const scores = {
      '語彙点数':  goii,
      '文法点数':  bunpo,
      '聴解点数':  chokkai,
      '合計点':    total,
    };

    HEADERS.forEach(function(h, idx) {
      const col = idx + 1;

      // スコアセル：合格ライン以上=緑、満点の60%以上=黄、それ未満=赤
      if (scores[h] !== undefined) {
        const cfg = SCORE_CONFIG[h];
        const val = scores[h];
        var color;
        if (val >= cfg.pass) {
          color = '#d5f5e3';  // 緑：合格
        } else if (val >= cfg.max * 0.4) {
          color = '#fff3cd';  // 黄：もう少し
        } else {
          color = '#fdecea';  // 赤：不合格
        }
        sheet.getRange(newRow, col).setBackground(color);
      }

      // 判定セル
      if (h === '判定') {
        sheet.getRange(newRow, col).setBackground(
          result === '合格' ? '#d5f5e3' : '#fdecea'
        );
        sheet.getRange(newRow, col).setFontWeight('bold');
      }

      // 離席回数セル：1回以上は黄
      if (h === '離席回数' && (data.leave_count || 0) > 0) {
        sheet.getRange(newRow, col).setBackground('#fff3cd');
      }

      // 自由記述回答セル：内容があれば黄（手動採点必要）
      if (h === '自由記述回答（JSON）') {
        const fa = data.free_answers || '';
        if (fa.length > 5) {
          sheet.getRange(newRow, col).setBackground('#fff3cd');
        }
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: newRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GETリクエスト（動作確認用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput('みんなの日本語テスト GASは正常に動作しています。')
    .setMimeType(ContentService.MimeType.TEXT);
}
