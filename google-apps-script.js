/**
 * みんなの日本語 月間テスト — Google Apps Script
 *
 * 【設置手順】
 *  1. Google スプレッドシートを新規作成する
 *  2. 拡張機能 → Apps Script を開く
 *  3. このファイルの内容を全選択してコード.gs に貼り付ける
 *  4. 保存（Ctrl+S）
 *  5. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *     - 説明：任意（例: テスト回答受信）
 *     - 次のユーザーとして実行：自分
 *     - アクセスできるユーザー：全員
 *  6. 「デプロイ」ボタンを押して URL をコピー
 *  7. index.html の先頭近くにある
 *       const GAS_URL = 'YOUR_GAS_URL_HERE';
 *     を、コピーした URL に書き換える
 */

// シート名（変更可）
const SHEET_NAME = '回答結果';

// ヘッダー行の定義（スプレッドシートの列順）
const HEADERS = [
  'timestamp','test_date','name_kata','name_latin','class_name','company',
  'goii_auto','bunpo_auto','chokkai_auto',
  // 語彙
  'g1_1','g1_2','g1_3','g1_4','g1_5','g1_6','g1_7','g1_8','g1_9','g1_10',
  'g2_1','g2_2','g2_3','g2_4','g2_5','g2_6','g2_7','g2_8',
  'g3_1','g3_2','g3_3',
  'g4_1','g4_2','g4_3','g4_5','g4_6','g4_7','g4_8','g4_9','g4_10','g4_11',
  'g5_1','g5_2','g5_3','g5_4','g5_5','g5_6','g5_7','g5_8','g5_9','g5_10',
  'g5_11','g5_12','g5_13','g5_14','g5_15','g5_16','g5_17','g5_18','g5_19','g5_20',
  // 文法
  'b1_1','b1_2','b1_3','b1_4','b1_5a','b1_5b','b1_6a','b1_6b','b1_6c','b1_7',
  'b2_1','b2_2','b2_3','b2_4','b2_5',
  'b3_1','b3_2','b3_3','b3_4','b3_5',
  'b4_1','b4_2','b4_3','b4_4','b4_5',
  'b5_1','b5_2','b5_3','b5_4',
  'b6_1','b6_2','b6_3','b6_4','b6_5','b6_6',
  'b7_1','b7_2','b7_3','b7_4',
  // 聴解
  'c1_1','c1_2',
  'c2_1','c2_2',
  'c3_1a','c3_1b','c3_1c','c3_2a','c3_2b','c3_2c',
  'c4_1','c4_2',
  'c5_1','c5_2',
  'c6_1a','c6_1b','c6_2a','c6_2b',
  'c7_1','c7_2',
  'c8_1p','c8_1c','c8_2p','c8_2c',
  'c9_1s','c9_1e','c9_1d','c9_2sa','c9_2ea','c9_2sb','c9_2eb','c9_2d',
  'c10_1','c10_2',
  'c11_1','c11_2','c11_3','c11_4','c11_5',
  'c12_1','c12_2','c12_3','c12_4',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // ヘッダー行がなければ挿入
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      // ヘッダー行を太字・背景色で装飾
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold').setBackground('#1a5276').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // HEADERS の順番通りに値を並べて行追加
    const row = HEADERS.map(h => (data[h] !== undefined && data[h] !== null) ? data[h] : '');
    sheet.appendRow(row);

    // セルの色付け（一括処理：自動採点正解=緑、不正解=赤、先生採点=黄）
    const statusMap = data.field_status || {};
    const bgColors = [HEADERS.map(h => {
      const s = statusMap[h];
      if (s === 'correct') return '#d5f5e3';
      if (s === 'wrong')   return '#fdecea';
      if (s === 'manual')  return '#fff3cd';
      return null;
    })];
    sheet.getRange(sheet.getLastRow(), 1, 1, HEADERS.length).setBackgrounds(bgColors);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * テスト用：スクリプトエディタで直接 testDoPost() を実行してシートへの書き込みを確認できます
 */
function testDoPost() {
  const dummy = {
    postData: {
      contents: JSON.stringify({
        timestamp: '2026/03/27 10:00:00',
        test_date: '2026-03-27',
        name_kata: 'テストタロウ',
        name_latin: 'Test Taro',
        class_name: 'A1',
        company: 'ABC',
        goii_auto: 85,
        bunpo_auto: 70,
        chokkai_auto: 60,
        g1_1: 'h', g1_2: 'g',
      })
    }
  };
  const result = doPost(dummy);
  Logger.log(result.getContent());
}
