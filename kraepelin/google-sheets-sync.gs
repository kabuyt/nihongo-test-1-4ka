const KRAEPELIN_SUPABASE_URL = 'https://ajmdpkwqyeyzemeoojwd.supabase.co';
const KRAEPELIN_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbWRwa3dxeWV5emVtZW9vandkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjIwMzAsImV4cCI6MjA5MDY5ODAzMH0.AfpGFcYvVrS25qTr9RTGWqsvWMKykU2QcXZPtiNxAqY';
const KRAEPELIN_SHEET_NAME = 'クレペリン結果';

function updateKraepelinResults() {
  const records = fetchKraepelinRecords_();
  const latestByCandidate = {};

  records.forEach(record => {
    const candidateNo = extractCandidateNo_(record.name);
    const interviewName = extractInterviewName_(record.name);
    if (!candidateNo) return;
    const key = interviewName + '||' + candidateNo;
    if (!latestByCandidate[key]) latestByCandidate[key] = record;
  });

  const rows = Object.keys(latestByCandidate)
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map(key => {
      const record = latestByCandidate[key];
      const candidateNo = extractCandidateNo_(record.name);
      const interviewName = extractInterviewName_(record.name);
      const summary = summarizeKraepelin_(record.results || []);
      return [
        interviewName,
        candidateNo,
        record.started_at || record.created_at || '',
        record.judgment_type || '',
        record.judgment_score || '',
        summary.firstCorrect,
        summary.secondCorrect,
        summary.totalCorrect,
        summary.avgCorrect,
        record.error_rate || '',
        record.id || '',
      ];
    });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(KRAEPELIN_SHEET_NAME) || ss.insertSheet(KRAEPELIN_SHEET_NAME);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 11).setValues([[
    '面接名',
    '候補者番号',
    '実施日時',
    '判定',
    '判定スコア',
    '前半正答数',
    '後半正答数',
    '合計正答数',
    '平均正答数',
    '誤答率',
    'record_id',
  ]]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  sheet.autoResizeColumns(1, 11);
}

function createKraepelinAutoUpdateTrigger() {
  ScriptApp.newTrigger('updateKraepelinResults')
    .timeBased()
    .everyMinutes(5)
    .create();
}

function fetchKraepelinRecords_() {
  const url = KRAEPELIN_SUPABASE_URL + '/rest/v1/kraepelin_results?select=*&order=started_at.desc.nullslast,created_at.desc';
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      apikey: KRAEPELIN_SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + KRAEPELIN_SUPABASE_ANON_KEY,
    },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Supabase読み込みエラー: ' + code + ' ' + res.getContentText());
  }
  return JSON.parse(res.getContentText());
}

function extractCandidateNo_(name) {
  const match = String(name || '').trim().match(/(?:^|\/\s*)No\.?\s*(.+)$/i);
  return match ? match[1].trim() : '';
}

function extractInterviewName_(name) {
  const match = String(name || '').trim().match(/^(.*?)\s*\/\s*No\.?\s*.+$/i);
  return match ? match[1].trim() : '';
}

function summarizeKraepelin_(results) {
  const rows = Array.isArray(results) ? results : [];
  let firstCorrect = 0;
  let secondCorrect = 0;
  rows.forEach(row => {
    const correct = (row.answers || []).filter(answer => answer && answer.isCorrect).length;
    if (row.phase === 'first') firstCorrect += correct;
    if (row.phase === 'second') secondCorrect += correct;
  });
  const totalCorrect = firstCorrect + secondCorrect;
  const avgCorrect = rows.length ? Math.round((totalCorrect / rows.length) * 100) / 100 : '';
  return { firstCorrect, secondCorrect, totalCorrect, avgCorrect };
}
