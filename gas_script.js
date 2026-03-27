/**
 * Google Apps Script — みんなの日本語 月間テスト 成績受信スクリプト
 */

const SHEET_NAME   = '成績データ';
const ANSWERS_NAME = '回答結果';

// 成績データシートのヘッダー
const HEADERS = [
  'タイムスタンプ','受験日','名前（カタカナ）','名前（ローマ字）',
  'クラス','会社・所属','語彙点数','文法点数','聴解点数',
  '合計点','換算点(/3)','判定','離席回数','自由記述回答（JSON）'
];

// 各セクションの満点・合格ライン
const SCORE_CONFIG = {
  '語彙点数':  { max: 100, pass: 60 },
  '文法点数':  { max: 65,  pass: 39 },
  '聴解点数':  { max: 44,  pass: 26 },
  '合計点':    { max: 209, pass: 125 },
};

// 回答結果シートのヘッダー（個別回答列）
const ANS_HEADERS = [
  'タイムスタンプ','名前（カタカナ）',
  // 語彙Q1
  'g1_1','g1_2','g1_3','g1_4','g1_5','g1_6','g1_7','g1_8','g1_9','g1_10',
  // 語彙Q2
  'g2_1','g2_2','g2_3','g2_4','g2_5','g2_6','g2_7','g2_8',
  // 語彙Q3
  'g3_1','g3_2','g3_3',
  // 語彙Q4
  'g4_1','g4_2','g4_3','g4_5','g4_6','g4_7','g4_8','g4_9','g4_10','g4_11',
  // 語彙Q5
  'g5_1','g5_2','g5_3','g5_4','g5_5','g5_6','g5_7','g5_8','g5_9','g5_10',
  'g5_11','g5_12','g5_13','g5_14','g5_15','g5_16','g5_17','g5_18','g5_19','g5_20',
  // 文法Q1
  'b1_1','b1_2','b1_3','b1_4','b1_5a','b1_5b','b1_6a','b1_6b','b1_6c','b1_7',
  // 文法Q2
  'b2_1','b2_2','b2_3','b2_4','b2_5',
  // 文法Q3（並べ替え）
  'b3_1','b3_2','b3_3','b3_4','b3_5',
  // 文法Q4
  'b4_1','b4_2','b4_3','b4_4','b4_5',
  // 文法Q5
  'b5_1','b5_2','b5_3','b5_4',
  // 文法Q6
  'b6_1','b6_2','b6_3','b6_4','b6_5','b6_6',
  // 文法Q7
  'b7_1','b7_2','b7_3','b7_4',
  // 聴解Q1
  'c1_1','c1_2',
  // 聴解Q2
  'c2_1','c2_2',
  // 聴解Q3
  'c3_1','c3_2',
  // 聴解Q4
  'c4_1','c4_2',
  // 聴解Q5
  'c5_1','c5_2',
  // 聴解Q6
  'c6_1a','c6_1b','c6_2a','c6_2b',
  // 聴解Q7
  'c7_1','c7_2',
  // 聴解Q8
  'c8_1p','c8_1c','c8_2p','c8_2c',
  // 聴解Q9
  'c9_1s','c9_1e','c9_1d','c9_2sa','c9_2ea','c9_2sb','c9_2eb','c9_2d',
  // 聴解Q10
  'c10_1','c10_2',
  // 聴解Q11
  'c11_1','c11_2','c11_3','c11_4','c11_5',
  // 聴解Q12
  'c12_1','c12_2','c12_3','c12_4'
];

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = e.parameter;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ===== 成績データシート =====
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      const hr = sheet.getRange(1, 1, 1, HEADERS.length);
      hr.setFontWeight('bold');
      hr.setBackground('#4472C4');
      hr.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    const goii    = Number(data.goii_auto)    || 0;
    const bunpo   = Number(data.bunpo_auto)   || 0;
    const chokkai = Number(data.chokkai_auto) || 0;
    const total   = goii + bunpo + chokkai;
    const scaled  = Math.round(total / 3 * 10) / 10;
    const result  = scaled >= 60 ? '合格' : '不合格';

    const row = [
      data.timestamp  || new Date().toISOString(),
      data.test_date  || '',
      data.name_kata  || '',
      data.name_latin || '',
      data.class_name || '',
      data.company    || '',
      goii, bunpo, chokkai, total, scaled, result,
      data.leave_count  || 0,
      data.free_answers || ''
    ];
    sheet.appendRow(row);

    const newRow = sheet.getLastRow();
    if (newRow <= 2 || newRow % 10 === 0) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    // セル別カラーリング
    const scores = { '語彙点数': goii, '文法点数': bunpo, '聴解点数': chokkai, '合計点': total };
    HEADERS.forEach(function(h, idx) {
      const col = idx + 1;
      if (scores[h] !== undefined) {
        const cfg = SCORE_CONFIG[h];
        const pct = scores[h] / cfg.max;
        const color = pct >= 0.6 ? '#d5f5e3' : pct >= 0.4 ? '#fff3cd' : '#fdecea';
        sheet.getRange(newRow, col).setBackground(color);
      }
      if (h === '判定') {
        sheet.getRange(newRow, col).setBackground(result === '合格' ? '#d5f5e3' : '#fdecea');
        sheet.getRange(newRow, col).setFontWeight('bold');
      }
      if (h === '離席回数' && (data.leave_count || 0) > 0) {
        sheet.getRange(newRow, col).setBackground('#fff3cd');
      }
      if (h === '自由記述回答（JSON）' && (data.free_answers || '').length > 5) {
        sheet.getRange(newRow, col).setBackground('#fff3cd');
      }
    });

    // ===== 回答結果シート =====
    let aSheet = ss.getSheetByName(ANSWERS_NAME);
    if (!aSheet) {
      aSheet = ss.insertSheet(ANSWERS_NAME);
      aSheet.appendRow(ANS_HEADERS);
      const ahr = aSheet.getRange(1, 1, 1, ANS_HEADERS.length);
      ahr.setFontWeight('bold');
      ahr.setBackground('#4472C4');
      ahr.setFontColor('#FFFFFF');
      aSheet.setFrozenRows(1);
    }

    // 個別回答行を作成
    const ansRow = ANS_HEADERS.map(function(key) {
      if (key === 'タイムスタンプ') return data.timestamp || '';
      if (key === '名前（カタカナ）') return data.name_kata || '';
      return data[key] !== undefined ? data[key] : '';
    });
    aSheet.appendRow(ansRow);

    if (aSheet.getLastRow() <= 2 || aSheet.getLastRow() % 10 === 0) {
      aSheet.autoResizeColumns(1, ANS_HEADERS.length);
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

function doGet(e) {
  return ContentService
    .createTextOutput('みんなの日本語テスト GASは正常に動作しています。')
    .setMimeType(ContentService.MimeType.TEXT);
}
