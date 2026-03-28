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

// 回答結果シートのヘッダー
const ANS_HEADERS = [
  'タイムスタンプ','名前（カタカナ）',
  'g1_1','g1_2','g1_3','g1_4','g1_5','g1_6','g1_7','g1_8','g1_9','g1_10',
  'g2_1','g2_2','g2_3','g2_4','g2_5','g2_6','g2_7','g2_8',
  'g3_1','g3_2','g3_3',
  'g4_1','g4_2','g4_3','g4_5','g4_6','g4_7','g4_8','g4_9','g4_10','g4_11',
  'g5_1','g5_2','g5_3','g5_4','g5_5','g5_6','g5_7','g5_8','g5_9','g5_10',
  'g5_11','g5_12','g5_13','g5_14','g5_15','g5_16','g5_17','g5_18','g5_19','g5_20',
  'b1_1','b1_2','b1_3','b1_4','b1_5a','b1_5b','b1_6a','b1_6b','b1_6c','b1_7',
  'b2_1','b2_2','b2_3','b2_4','b2_5',
  'b3_1','b3_2','b3_3','b3_4','b3_5',
  'b4_1','b4_2','b4_3','b4_4','b4_5',
  'b5_1','b5_2','b5_3','b5_4',
  'b6_1','b6_2','b6_3','b6_4','b6_5','b6_6',
  'b7_1','b7_2','b7_3','b7_4','b7_5','b7_6','b7_7','b7_8',
  'c1_1','c1_2','c2_1','c2_2','c3_1','c3_2','c4_1','c4_2','c5_1','c5_2',
  'c6_1a','c6_1b','c6_2a','c6_2b',
  'c7_1','c7_2',
  'c8_1p','c8_1c','c8_2p','c8_2c',
  'c9_1s','c9_1e','c9_1d','c9_2sa','c9_2ea','c9_2sb','c9_2eb','c9_2d',
  'c10_1','c10_2',
  'c11_1','c11_2','c11_3','c11_4','c11_5',
  'c12_1','c12_2','c12_3','c12_4',
  // 自動採点の内訳（GASが書き込む。先生は変更しない）
  '語彙自動点','文法自動点','聴解自動点',
  // 手動採点の追加点（先生が記入する）
  '語彙追加点','文法追加点','聴解追加点'
];

// 正解データ（null = 先生採点 = 黄、配列 = 複数正解）
const CORRECT = {
  // 語彙Q1
  g1_1:'ネクタイ', g1_2:'かさ', g1_3:'としょかん', g1_4:'しんぶん', g1_5:'くるま',
  g1_6:'とけい', g1_7:'かぎ', g1_8:'めいし', g1_9:'いしゃ', g1_10:'つくえ',
  // 語彙Q2
  g2_1:'てちょう', g2_2:'かばん', g2_3:'えんぴつ', g2_4:'でんわ',
  g2_5:'コンピューター', g2_6:'エレベーター', g2_7:'ワイン', g2_8:'コーヒー',
  // 語彙Q3（順不同・自動採点）
  g3_1:'ceh', g3_2:'bkl', g3_3:'gij',
  // 語彙Q4 曜日
  g4_1:'げつようび', g4_2:'かようび', g4_3:'すいようび',
  g4_5:'きんようび', g4_6:'どようび', g4_7:'にちようび',
  // 語彙Q4 日程
  g4_8:'おととい', g4_9:'きのう', g4_10:'あした', g4_11:'あさって',
  // 語彙Q5（自動採点・選択式）
  g5_1:'Số', g5_2:'Bệnh viện',
  g5_3:'Ngân hàng', g5_4:'Kết thúc',
  g5_5:'Nhân viên', g5_6:'Phim điện ảnh',
  g5_7:'Buổi sáng', g5_8:'Cái ô',
  g5_9:'Nhà vệ sinh', g5_10:'Thức dậy',
  g5_11:'Mỗi sáng', g5_12:'Nghỉ',
  g5_13:'Tầng hầm', g5_14:'Quầy lễ tân',
  g5_15:'Buổi chiều', g5_16:'Ngủ',
  g5_17:'Cầu thang', g5_18:'Xin lỗi',
  g5_19:'Giày', g5_20:'Từ điển',
  // 文法Q1
  b1_1:'に', b1_2:'も', b1_3:'の', b1_4:'が',
  b1_5a:'は', b1_5b:'の',
  b1_6a:'は', b1_6b:'から', b1_6c:'まで',
  b1_7:'と',
  // 文法Q2
  b2_1:'リン', b2_2:'おきました', b2_3:'はたらきます', b2_4:'あそこ', b2_5:'それ',
  // 文法Q3（先生採点）
  b3_1:null, b3_2:null, b3_3:null, b3_4:null, b3_5:null,
  // 文法Q4（複数正解）
  b4_1:['じゅうじよんじゅっぷん','じゅうじよんじっぷん'],
  b4_2:'ろくじはん',
  b4_3:'れいじにじゅっぷん',
  b4_4:['じゅうにまんごせんはっぴゃくよんじゅうえん'],
  b4_5:['ななまんよんせんきゅうじゅうえん'],
  // 文法Q5
  b5_1:'いいえ、はたらきません。',
  b5_2:'はい、よる7じにおわります。',
  b5_3:'まいばん11じにねます。',
  b5_4:'やすみはありません。',
  // 文法Q6
  b6_1:'トイレはどちらですか', b6_2:'こちらこそ',
  b6_3:'これはなんですか', b6_4:'なんじまでですか',
  b6_5:'やすみじゃありません', b6_6:'かいぎしつはなんかいですか',
  // 文法Q7（4択）
  b7_1:'①', b7_2:'②', b7_3:'③', b7_4:'④',
  b7_5:'②', b7_6:'③', b7_7:'④', b7_8:'③',
  // 聴解Q1（先生採点）
  c1_1:null, c1_2:null,
  // 聴解Q2
  c2_1:'71', c2_2:'26',
  // 聴解Q3,4,5,6（先生採点）
  c3_1:null, c3_2:null, c4_1:null, c4_2:null,
  c5_1:null, c5_2:null,
  c6_1a:null, c6_1b:null, c6_2a:null, c6_2b:null,
  // 聴解Q7
  c7_1:'h', c7_2:'c',
  // 聴解Q8
  c8_1p:'2800', c8_1c:'c', c8_2p:'18500', c8_2c:'a',
  // 聴解Q9（先生採点）
  c9_1s:null, c9_1e:null, c9_1d:null,
  c9_2sa:null, c9_2ea:null, c9_2sb:null, c9_2eb:null, c9_2d:null,
  // 聴解Q10
  c10_1:'336-8080', c10_2:'078-4211-3168',
  // 聴解Q11
  c11_1:'✕', c11_2:'✕', c11_3:'○', c11_4:'○', c11_5:'✕',
  // 聴解Q12（先生採点）
  c12_1:null, c12_2:null, c12_3:null, c12_4:null
};

// 正規化（空白・大文字小文字・長音統一）
function norm(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(/\s+/g, '').replace(/[　]/g, '').replace(/ー/g, 'ー');
}

// 正解チェック（null=先生採点、配列=複数正解）
function isCorrect(key, val) {
  const ans = CORRECT[key];
  if (ans === null || ans === undefined) return 'manual';
  const v = norm(val);
  if (!v) return 'wrong';
  // 語彙Q3：文字を抽出・トラップ除去・ソートして比較
  if (key.startsWith('g3_')) {
    const letters = v.split('').filter(function(c) { return /^[a-l]$/.test(c); });
    const cleaned = letters.filter(function(c) { return ['a','d','f'].indexOf(c) < 0; }).sort().join('');
    return cleaned === ans ? 'correct' : 'wrong';
  }
  if (Array.isArray(ans)) {
    return ans.some(function(a) { return norm(a) === v; }) ? 'correct' : 'wrong';
  }
  // b6: 部分一致（normalize後）
  if (key.startsWith('b6')) {
    const a = norm(ans);
    return (v.includes(a) || (a.includes(v) && v.length > 3)) ? 'correct' : 'wrong';
  }
  // c10: ハイフン統一
  if (key.startsWith('c10')) {
    return v.replace(/[ー\-]/g, '-') === norm(ans).replace(/[ー\-]/g, '-') ? 'correct' : 'wrong';
  }
  // c11: ○/✕/x 対応
  if (key.startsWith('c11')) {
    const a = norm(ans);
    return (v === a || (v === 'x' && a === '✕') || (v === '○' && a === '○')) ? 'correct' : 'wrong';
  }
  return v === norm(ans) ? 'correct' : 'wrong';
}

// 成績データのスコア列を色付け
function colorScoreRow_(sheet, rowNum, goii, bunpo, chokkai, total, result) {
  const scores = { '語彙点数': goii, '文法点数': bunpo, '聴解点数': chokkai, '合計点': total };
  HEADERS.forEach(function(h, idx) {
    const col = idx + 1;
    if (scores[h] !== undefined) {
      const cfg = SCORE_CONFIG[h];
      const pct = scores[h] / cfg.max;
      sheet.getRange(rowNum, col).setBackground(
        pct >= 0.6 ? '#d5f5e3' : pct >= 0.4 ? '#fff3cd' : '#fdecea'
      );
    }
    if (h === '判定') {
      sheet.getRange(rowNum, col).setBackground(result === '合格' ? '#d5f5e3' : '#fdecea');
      sheet.getRange(rowNum, col).setFontWeight('bold');
    }
  });
}

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

    sheet.appendRow([
      data.timestamp  || new Date().toISOString(),
      data.test_date  || '',
      data.name_kata  || '',
      data.name_latin || '',
      data.class_name || '',
      data.company    || '',
      goii, bunpo, chokkai, total, scaled, result,
      data.leave_count  || 0,
      data.free_answers || ''
    ]);

    const newRow = sheet.getLastRow();
    if (newRow <= 2 || newRow % 10 === 0) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    colorScoreRow_(sheet, newRow, goii, bunpo, chokkai, total, result);
    if ((data.leave_count || 0) > 0) {
      const leaveCol = HEADERS.indexOf('離席回数') + 1;
      sheet.getRange(newRow, leaveCol).setBackground('#fff3cd');
    }
    if ((data.free_answers || '').length > 5) {
      const freeCol = HEADERS.indexOf('自由記述回答（JSON）') + 1;
      sheet.getRange(newRow, freeCol).setBackground('#fff3cd');
    }

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
      if (key === 'タイムスタンプ')    return data.timestamp || '';
      if (key === '名前（カタカナ）')  return data.name_kata || '';
      if (key === '語彙自動点')        return goii;
      if (key === '文法自動点')        return bunpo;
      if (key === '聴解自動点')        return chokkai;
      if (key === '語彙追加点' || key === '文法追加点' || key === '聴解追加点') return '';
      return data[key] !== undefined ? data[key] : '';
    });
    aSheet.appendRow(ansRow);

    const aNewRow = aSheet.getLastRow();
    if (aNewRow <= 2 || aNewRow % 10 === 0) {
      aSheet.autoResizeColumns(1, ANS_HEADERS.length);
    }

    // 回答結果シートのセル色（正解=緑、不正解=赤、先生採点=黄）
    const bgColors = ANS_HEADERS.map(function(key) {
      if (key === 'タイムスタンプ' || key === '名前（カタカナ）') return null;
      if (['語彙自動点','文法自動点','聴解自動点','語彙追加点','文法追加点','聴解追加点'].indexOf(key) >= 0) return null;
      const status = isCorrect(key, data[key]);
      if (status === 'correct') return '#d5f5e3';
      if (status === 'wrong')   return '#fdecea';
      if (status === 'manual')  return '#fff3cd';
      return null;
    });
    aSheet.getRange(aNewRow, 1, 1, ANS_HEADERS.length).setBackgrounds([bgColors]);

    // 採点列ヘッダーを薄い青でハイライト（追加点列 = 先生記入欄）
    const addColStart = ANS_HEADERS.indexOf('語彙追加点') + 1;
    if (addColStart > 0 && aNewRow === 2) {
      // 初回のみヘッダーに書式
      aSheet.getRange(1, addColStart, 1, 3).setBackground('#cfe2f3');
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
 * 手動採点を成績データに反映する
 * 回答結果シートの「語彙追加点」「文法追加点」「聴解追加点」列を読み取り、
 * 成績データの対応する行を更新する（タイムスタンプで照合）。
 * 何度実行しても同じ結果になる（べき等）。
 */
function reflectManualScores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aSheet = ss.getSheetByName(ANSWERS_NAME);
  const sheet  = ss.getSheetByName(SHEET_NAME);

  if (!aSheet || !sheet) {
    SpreadsheetApp.getUi().alert('シートが見つかりません。');
    return;
  }

  const aData    = aSheet.getDataRange().getValues();
  const aHeaders = aData[0];
  const aTsIdx         = aHeaders.indexOf('タイムスタンプ');
  const aGoiiAutoIdx   = aHeaders.indexOf('語彙自動点');
  const aBunpoAutoIdx  = aHeaders.indexOf('文法自動点');
  const aChkAutoIdx    = aHeaders.indexOf('聴解自動点');
  const aGoiiAddIdx    = aHeaders.indexOf('語彙追加点');
  const aBunpoAddIdx   = aHeaders.indexOf('文法追加点');
  const aChkAddIdx     = aHeaders.indexOf('聴解追加点');

  if (aGoiiAddIdx < 0 || aGoiiAutoIdx < 0) {
    SpreadsheetApp.getUi().alert(
      '採点列が見つかりません。\n' +
      '新しいバージョンのGASが適用されていない可能性があります。\n' +
      '回答結果シートを削除して再提出してください。'
    );
    return;
  }

  const sData    = sheet.getDataRange().getValues();
  const sHeaders = sData[0];
  const sTsIdx      = sHeaders.indexOf('タイムスタンプ');
  const sGoiiIdx    = sHeaders.indexOf('語彙点数');
  const sBunpoIdx   = sHeaders.indexOf('文法点数');
  const sChkIdx     = sHeaders.indexOf('聴解点数');
  const sTotalIdx   = sHeaders.indexOf('合計点');
  const sScaledIdx  = sHeaders.indexOf('換算点(/3)');
  const sResultIdx  = sHeaders.indexOf('判定');

  // タイムスタンプ → 行番号 のマップを作成（高速化）
  const tsToRow = {};
  for (let j = 1; j < sData.length; j++) {
    tsToRow[String(sData[j][sTsIdx])] = j + 1; // 1-indexed sheet row
  }

  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < aData.length; i++) {
    const aRow = aData[i];
    const goiiAdd  = Number(aRow[aGoiiAddIdx])  || 0;
    const bunpoAdd = Number(aRow[aBunpoAddIdx]) || 0;
    const chkAdd   = Number(aRow[aChkAddIdx])   || 0;

    // 追加点が一つも入力されていない行はスキップ
    if (goiiAdd === 0 && bunpoAdd === 0 && chkAdd === 0) {
      skipped++;
      continue;
    }

    const ts    = String(aRow[aTsIdx]);
    const rowNum = tsToRow[ts];
    if (!rowNum) {
      // 成績データに対応行なし
      continue;
    }

    // 自動点 + 追加点 で再計算（べき等：何度実行しても同結果）
    const goiiAuto  = Number(aRow[aGoiiAutoIdx])  || 0;
    const bunpoAuto = Number(aRow[aBunpoAutoIdx]) || 0;
    const chkAuto   = Number(aRow[aChkAutoIdx])   || 0;

    const newGoii   = goiiAuto  + goiiAdd;
    const newBunpo  = bunpoAuto + bunpoAdd;
    const newChk    = chkAuto   + chkAdd;
    const newTotal  = newGoii + newBunpo + newChk;
    const newScaled = Math.round(newTotal / 3 * 10) / 10;
    const newResult = newScaled >= 60 ? '合格' : '不合格';

    // 成績データを更新
    sheet.getRange(rowNum, sGoiiIdx   + 1).setValue(newGoii);
    sheet.getRange(rowNum, sBunpoIdx  + 1).setValue(newBunpo);
    sheet.getRange(rowNum, sChkIdx    + 1).setValue(newChk);
    sheet.getRange(rowNum, sTotalIdx  + 1).setValue(newTotal);
    sheet.getRange(rowNum, sScaledIdx + 1).setValue(newScaled);
    sheet.getRange(rowNum, sResultIdx + 1).setValue(newResult);

    // セル色も更新
    colorScoreRow_(sheet, rowNum, newGoii, newBunpo, newChk, newTotal, newResult);

    updated++;
  }

  SpreadsheetApp.getUi().alert(
    updated + '件の成績を更新しました。\n' +
    '（追加点未入力: ' + skipped + '件）'
  );
}

/**
 * スプレッドシートを開いたときにカスタムメニューを追加
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('採点メニュー')
    .addItem('手動採点を成績に反映', 'reflectManualScores')
    .addToUi();
}

function doGet(e) {
  return ContentService
    .createTextOutput('みんなの日本語テスト GASは正常に動作しています。')
    .setMimeType(ContentService.MimeType.TEXT);
}
