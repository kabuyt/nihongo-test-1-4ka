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
  '自由記述回答（JSON）'
];

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
      // ヘッダー行を太字・背景色設定
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4472C4');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    // 点数計算
    const goii   = Number(data.goii_auto)   || 0;
    const bunpo  = Number(data.bunpo_auto)  || 0;
    const chokkai = Number(data.chokkai_auto) || 0;
    const total  = goii + bunpo + chokkai;
    const scaled = Math.round(total / 3 * 10) / 10;
    const result = scaled >= 60 ? '合格' : '不合格';

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
      data.free_answers || ''
    ];

    sheet.appendRow(row);

    // 列幅の自動調整（初回のみ重い処理なので10行ごとに実行）
    const lastRow = sheet.getLastRow();
    if (lastRow <= 2 || lastRow % 10 === 0) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    // 合否に応じて行の背景色を設定
    const newRow = sheet.getLastRow();
    const rowRange = sheet.getRange(newRow, 1, 1, HEADERS.length);
    if (result === '合格') {
      rowRange.setBackground('#D9EAD3'); // 薄緑
    } else {
      rowRange.setBackground('#FCE5CD'); // 薄オレンジ
    }

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
