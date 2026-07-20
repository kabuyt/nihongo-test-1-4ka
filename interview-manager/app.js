const ACTIVE_KEY = 'interviewManager.activeId.v2';

const state = {
  interviews: [],
  activeId: '',
  kraepelinRecords: [],
  dbReady: false,
  loading: false,
  error: '',
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function activeInterview() {
  return state.interviews.find(item => item.id === state.activeId) || null;
}

function formatInterviewName(interview) {
  if (!interview) return '';
  return `${interview.date} ${interview.company}面接`;
}

function normalizeNo(value) {
  return String(value || '').trim().replace(/^No\.?\s*/i, '');
}

function ensureScore(candidate) {
  if (!candidate.score) candidate.score = {};
  return candidate.score;
}

function candidateLabel(candidate) {
  return `No.${candidate.no}`;
}

function kraepelinSessionName(interview, candidate) {
  return `session:${interview.id} / No.${candidate.no}`;
}

function kraepelinUrl(interview, candidate) {
  const url = new URL('../kraepelin/interview.html', window.location.href);
  url.searchParams.set('session', interview.id);
  url.searchParams.set('no', candidate.no);
  return url.href;
}

function parseKraepelinName(name) {
  const raw = String(name || '').trim();
  const sessionMatch = raw.match(/^session:([^/]+)\s*\/\s*(?:No\.?|候補者)\s*(.+)$/i);
  if (sessionMatch) {
    return { sessionId: sessionMatch[1].trim(), interviewName: '', candidateNo: sessionMatch[2].trim() };
  }
  const match = raw.match(/^(.*?)\s*\/\s*(?:No\.?|候補者)\s*(.+)$/i);
  if (match) return { sessionId: '', interviewName: match[1].trim(), candidateNo: match[2].trim() };
  const noOnly = raw.match(/^(?:No\.?|候補者)\s*(.+)$/i);
  return noOnly ? { sessionId: '', interviewName: '', candidateNo: noOnly[1].trim() } : { sessionId: '', interviewName: '', candidateNo: '' };
}

function toDbNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowStats(row) {
  const answers = Array.isArray(row?.answers) ? row.answers : [];
  return answers.filter(answer => answer && answer.isCorrect).length;
}

function answerStats(row) {
  const answers = Array.isArray(row?.answers) ? row.answers : [];
  const correct = answers.filter(answer => answer && answer.isCorrect).length;
  return { total: answers.length, correct };
}

function summarizeKraepelin(record) {
  const results = Array.isArray(record?.results) ? record.results : [];
  const first = results.filter(row => row.phase === 'first').reduce((sum, row) => sum + rowStats(row), 0);
  const second = results.filter(row => row.phase === 'second').reduce((sum, row) => sum + rowStats(row), 0);
  const allAnswers = results.reduce((sum, row) => {
    const stats = answerStats(row);
    return { total: sum.total + stats.total, correct: sum.correct + stats.correct };
  }, { total: 0, correct: 0 });
  const total = numeric(record?.total_correct) ?? first + second;
  const errorRate = numeric(record?.error_rate) ?? (allAnswers.total > 0 ? (allAnswers.total - allAnswers.correct) / allAnswers.total : null);
  const typicalityScore = numeric(record?.judgment_score);
  return {
    first,
    second,
    total,
    errorRate,
    typicalityScore,
    judgment: record?.judgment_label || record?.judgment_type || '',
  };
}

function kraepelinEvaluation(summary, maxTotal) {
  if (!summary || summary.total == null) return null;
  const work = maxTotal > 0 ? (summary.total / maxTotal) * 45 : 0;
  const errorRate = summary.errorRate == null ? 1 : Math.max(0, summary.errorRate);
  const accuracy = Math.max(0, 1 - (errorRate / 0.2)) * 35;
  const stability = summary.typicalityScore == null ? 0 : Math.max(0, Math.min(100, summary.typicalityScore)) / 100 * 20;
  return {
    total: Number((work + accuracy + stability).toFixed(1)),
    work: Number(work.toFixed(1)),
    accuracy: Number(accuracy.toFixed(1)),
    stability: Number(stability.toFixed(1)),
  };
}

function formatPercent(value) {
  return value == null ? '-' : `${(value * 100).toFixed(1)}%`;
}

function formatScore(value) {
  return value == null ? '-' : Number(value).toFixed(Number.isInteger(value) ? 0 : 1);
}

function japaneseTo100(value) {
  const raw = numeric(value);
  if (raw == null) return null;
  return Number(Math.min(100, Math.max(0, raw / 30 * 100)).toFixed(1));
}

function judgmentLabel(value) {
  const labels = {
    typical: '定型',
    'near-typical': '準定型',
    atypical: '非定型',
    incomplete: '判定不可',
  };
  return labels[value] || value || '-';
}

function kraepelinComment(summary, evaluation) {
  if (!summary || !evaluation) return '';
  const comments = [];
  const errorRate = summary.errorRate ?? 1;
  const first = summary.first || 0;
  const second = summary.second || 0;
  const total = summary.total || 0;

  if (second > first * 1.15 && second - first >= 10) {
    comments.push('後半に調子が上がるタイプです');
  } else if (first > second * 1.2 && first - second >= 10) {
    comments.push('後半に疲れが出やすい傾向があります');
  } else if (evaluation.stability >= 14) {
    comments.push('安定して作業できています');
  } else if (evaluation.stability <= 6 && total > 0) {
    comments.push('作業の波が大きい傾向があります');
  }

  if (errorRate >= 0.3) {
    comments.push('ミスが多く、注意がそれやすい傾向があります');
  } else if (errorRate >= 0.15) {
    comments.push('作業は進みますが、ミスに注意が必要です');
  } else if (evaluation.work >= 35) {
    comments.push('作業量はしっかり出ています');
  } else if (evaluation.work <= 22) {
    comments.push('慎重ですが、作業量は少なめです');
  } else if (errorRate <= 0.05) {
    comments.push('落ち着いて正確に作業できています');
  }

  return [...new Set(comments)].slice(0, 2).join('。') + (comments.length ? '。' : '');
}

function candidateFromDb(row) {
  return {
    id: row.id,
    no: row.candidate_no,
    name: row.name || '',
    score: {
      math: row.math_score ?? '',
      vietnamese: row.vietnamese_score ?? '',
      japanese: row.japanese_score ?? '',
      pin1Ok: row.pin1_ok ?? '',
      pin1Time: row.pin1_time ?? '',
      pin2Ok: row.pin2_ok ?? '',
      pin2Time: row.pin2_time ?? '',
    },
  };
}

function interviewFromDb(row, candidatesByInterview) {
  return {
    id: row.id,
    date: row.interview_date,
    company: row.company,
    notes: row.notes || '',
    createdAt: row.created_at,
    candidates: (candidatesByInterview.get(row.id) || []).map(candidateFromDb),
  };
}

async function loadData() {
  state.loading = true;
  state.error = '';
  render();

  if (typeof supabase === 'undefined') {
    state.loading = false;
    state.dbReady = false;
    state.error = 'Supabase設定を読み込めません。';
    render();
    return;
  }

  const [sessionsResp, candidatesResp] = await Promise.all([
    supabase.from('interview_sessions').select('*').order('interview_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('interview_candidates').select('*').order('candidate_no', { ascending: true }),
  ]);

  if (sessionsResp.error || candidatesResp.error) {
    state.loading = false;
    state.dbReady = false;
    const message = sessionsResp.error?.message || candidatesResp.error?.message || 'Supabase読み込みエラー';
    state.error = `面接管理テーブルが未作成の可能性があります。interview-manager/supabase-schema.sql をSupabase SQL Editorで実行してください。詳細: ${message}`;
    render();
    return;
  }

  const candidatesByInterview = new Map();
  (candidatesResp.data || []).forEach(candidate => {
    if (!candidatesByInterview.has(candidate.interview_id)) candidatesByInterview.set(candidate.interview_id, []);
    candidatesByInterview.get(candidate.interview_id).push(candidate);
  });

  state.interviews = (sessionsResp.data || []).map(row => interviewFromDb(row, candidatesByInterview));
  state.activeId = localStorage.getItem(ACTIVE_KEY) || state.interviews[0]?.id || '';
  if (!state.interviews.some(item => item.id === state.activeId)) state.activeId = state.interviews[0]?.id || '';
  state.dbReady = true;
  state.loading = false;
  render();
}

function saveActiveId() {
  if (state.activeId) localStorage.setItem(ACTIVE_KEY, state.activeId);
}

async function createCandidate(interviewId, no, name = '') {
  const { data, error } = await supabase
    .from('interview_candidates')
    .insert({ interview_id: interviewId, candidate_no: no, name })
    .select('*')
    .single();
  if (error) throw error;
  return candidateFromDb(data);
}

function getKraepelinFor(candidate, interview) {
  const expected = formatInterviewName(interview);
  const sessionExact = state.kraepelinRecords.find(record => {
    const parsed = parseKraepelinName(record.name);
    return parsed.sessionId === interview.id && parsed.candidateNo === String(candidate.no);
  });
  if (sessionExact) return sessionExact;

  const exact = state.kraepelinRecords.find(record => {
    const parsed = parseKraepelinName(record.name);
    return parsed.interviewName === expected && parsed.candidateNo === String(candidate.no);
  });
  if (exact) return exact;

  return state.kraepelinRecords.find(record => {
    const parsed = parseKraepelinName(record.name);
    return !parsed.sessionId && !parsed.interviewName && parsed.candidateNo === String(candidate.no);
  }) || null;
}

function pinSummary(score) {
  const ok1 = Number(score.pin1Ok || 0);
  const ok2 = Number(score.pin2Ok || 0);
  const time1 = numeric(score.pin1Time);
  const time2 = numeric(score.pin2Time);
  return {
    ok: ok1 + ok2,
    time: (time1 || 0) + (time2 || 0),
    complete: time1 != null && time2 != null,
  };
}

function rankValues(items, getter, direction = 'desc') {
  const values = items.map(item => getter(item));
  const valid = [...new Set(values.filter(value => value != null))].sort((a, b) => direction === 'desc' ? b - a : a - b);
  return new Map(items.map((item, index) => {
    const value = values[index];
    return [item.no, value == null ? items.length + 1 : valid.indexOf(value) + 1];
  }));
}

function pinRanks(items) {
  const sorted = [...items].sort((a, b) => {
    const pa = pinSummary(ensureScore(a));
    const pb = pinSummary(ensureScore(b));
    if (pa.ok !== pb.ok) return pb.ok - pa.ok;
    if (pa.complete !== pb.complete) return pa.complete ? -1 : 1;
    return pa.time - pb.time;
  });
  return new Map(sorted.map((item, index) => [item.no, index + 1]));
}

function buildRows(interview) {
  const candidates = interview.candidates || [];
  const enriched = candidates.map(candidate => {
    const score = ensureScore(candidate);
    const kraepelin = getKraepelinFor(candidate, interview);
    const kSummary = kraepelin ? summarizeKraepelin(kraepelin) : null;
    return {
      ...candidate,
      score,
      kraepelin,
      kSummary,
      kraepelinTotal: kSummary?.total ?? null,
      math: numeric(score.math),
      vietnamese: numeric(score.vietnamese),
      japaneseRaw: numeric(score.japanese),
      japanese: japaneseTo100(score.japanese),
    };
  });
  const maxKraepelinTotal = Math.max(...enriched.map(row => row.kraepelinTotal ?? 0), 0);
  enriched.forEach(row => {
    row.kraepelinEval = kraepelinEvaluation(row.kSummary, maxKraepelinTotal);
  });

  const kRank = rankValues(enriched, row => row.kraepelinEval?.total ?? null, 'desc');
  const mathRank = rankValues(enriched, row => row.math, 'desc');
  const vietnameseRank = rankValues(enriched, row => row.vietnamese, 'desc');
  const japaneseRank = rankValues(enriched, row => row.japanese, 'desc');
  const pinRank = pinRanks(enriched);

  const ranked = enriched.map(row => {
    const rankSum = kRank.get(row.no) + mathRank.get(row.no) + vietnameseRank.get(row.no) + japaneseRank.get(row.no) + pinRank.get(row.no);
    return { ...row, ranks: { k: kRank.get(row.no), math: mathRank.get(row.no), vietnamese: vietnameseRank.get(row.no), japanese: japaneseRank.get(row.no), pin: pinRank.get(row.no) }, rankSum };
  });

  const finalRank = rankValues(ranked, row => -row.rankSum, 'desc');
  return ranked.map(row => ({ ...row, finalRank: finalRank.get(row.no) })).sort((a, b) => a.finalRank - b.finalRank || Number(a.no) - Number(b.no));
}

function renderStatus() {
  const existing = document.querySelector('.status-banner');
  if (existing) existing.remove();
  if (!state.error && !state.loading) return;
  const banner = document.createElement('div');
  banner.className = `status-banner ${state.error ? 'error' : ''}`;
  banner.textContent = state.error || '読み込み中...';
  document.querySelector('.main').prepend(banner);
}

function renderInterviews() {
  const list = $('#interview-list');
  list.innerHTML = state.interviews.map(interview => `
    <button class="interview-item ${interview.id === state.activeId ? 'active' : ''}" data-id="${interview.id}">
      <strong>${formatInterviewName(interview)}</strong>
      <span>${interview.candidates.length}人</span>
    </button>
  `).join('');

  list.querySelectorAll('.interview-item').forEach(button => {
    button.addEventListener('click', () => {
      state.activeId = button.dataset.id;
      saveActiveId();
      render();
    });
  });
}

function renderMetrics(interview, rows) {
  $('#metric-candidates').textContent = interview.candidates.length;
  $('#metric-kraepelin').textContent = rows.filter(row => row.kraepelin).length;
  $('#metric-math').textContent = rows.filter(row => row.math != null).length;
  $('#metric-pinboard').textContent = rows.filter(row => pinSummary(row.score).complete).length;
}

function subjectScoreCell(row, field, value, rank, options = {}) {
  const rawValue = row.score[field] ?? '';
  const max = options.max ?? 100;
  const placeholder = options.placeholder ?? '0-100';
  const doneClass = value == null ? 'missing-input' : 'done-input';
  const note = value == null
    ? '未入力'
    : (options.note ? options.note(value, rawValue) : `${formatScore(value)}点`);
  return `
    <div class="score-cell">
      <input class="score-input ${doneClass}" data-id="${row.id}" data-field="${field}" type="number" min="0" max="${max}" step="1" placeholder="${placeholder}" value="${String(rawValue).replace(/"/g, '&quot;')}">
      <div class="mini">${note} / 順位 ${rank}</div>
    </div>
  `;
}

function scoreInput(row, field, type = 'number') {
  const value = row.score[field] ?? '';
  return `<input class="score-input" data-id="${row.id}" data-field="${field}" type="${type}" value="${String(value).replace(/"/g, '&quot;')}">`;
}

function rankSummary(row) {
  return `ク${row.ranks.k} 数${row.ranks.math} 国${row.ranks.vietnamese} 日${row.ranks.japanese} ピ${row.ranks.pin}`;
}

function renderPrintReport(interview, rows) {
  const report = $('#print-report');
  if (!report || !interview) return;
  const today = new Date().toLocaleDateString('ja-JP');
  report.innerHTML = `
    <div class="print-header">
      <div>
        <div class="print-label">事前テスト集計</div>
        <h1>${escapeHtml(formatInterviewName(interview))}</h1>
      </div>
      <div class="print-date">出力日 ${today}</div>
    </div>
    <table class="print-table">
      <thead>
        <tr>
          <th>総合</th>
          <th>No.</th>
          <th>氏名・メモ</th>
          <th>クレペリン</th>
          <th>数学</th>
          <th>ベトナム国語</th>
          <th>日本語単語</th>
          <th>ピン</th>
          <th>科目順位</th>
          <th>順位合計</th>
          <th>備考</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const pin = pinSummary(row.score);
          return `
            <tr>
              <td>${row.finalRank}</td>
              <td>${escapeHtml(candidateLabel(row))}</td>
              <td>${escapeHtml(row.name || '')}</td>
              <td>${row.kraepelinEval ? `${formatScore(row.kraepelinEval.total)}点<br>正答 ${row.kraepelinTotal}<br>誤答 ${formatPercent(row.kSummary.errorRate)}` : '未取得'}</td>
              <td>${row.math == null ? '-' : `${formatScore(row.math)}点`}</td>
              <td>${row.vietnamese == null ? '-' : `${formatScore(row.vietnamese)}点`}</td>
              <td>${row.japanese == null ? '-' : `${row.japaneseRaw}/30<br>${formatScore(row.japanese)}点`}</td>
              <td>${pin.complete ? `${pin.ok}/2<br>${pin.time.toFixed(2)}秒` : `${pin.ok}/2`}</td>
              <td>${escapeHtml(rankSummary(row))}</td>
              <td>${row.rankSum}</td>
              <td>${escapeHtml(kraepelinComment(row.kSummary, row.kraepelinEval))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderTable(interview) {
  const rows = buildRows(interview);
  const body = $('#score-body');
  body.innerHTML = rows.map(row => {
    const pin = pinSummary(row.score);
    const rankClass = row.finalRank <= 3 ? 'rank top' : 'rank';
    const kraepelinCell = row.kraepelinEval == null
      ? '<span class="status-pill missing">未取得</span>'
      : `<span class="status-pill ok">${row.kraepelinEval.total}</span>
         <div class="mini">順位 ${row.ranks.k} / 正答 ${row.kraepelinTotal} / 誤答 ${formatPercent(row.kSummary.errorRate)}</div>
         <div class="mini">作業 ${row.kraepelinEval.work}・正確 ${row.kraepelinEval.accuracy}・安定 ${row.kraepelinEval.stability} / ${judgmentLabel(row.kSummary.judgment)}</div>
         <div class="comment-text">${kraepelinComment(row.kSummary, row.kraepelinEval)}</div>`;
    return `
      <tr>
        <td><span class="${rankClass}">${row.finalRank}</span></td>
        <td>${candidateLabel(row)}</td>
        <td><input class="candidate-name" data-id="${row.id}" value="${escapeHtml(row.name || '')}"></td>
        <td class="kraepelin-cell">${kraepelinCell}</td>
        <td><a class="link-btn" href="${kraepelinUrl(interview, row)}" target="_blank" rel="noopener">開く</a></td>
        <td>${subjectScoreCell(row, 'math', row.math, row.ranks.math)}</td>
        <td>${subjectScoreCell(row, 'vietnamese', row.vietnamese, row.ranks.vietnamese)}</td>
        <td>${subjectScoreCell(row, 'japanese', row.japanese, row.ranks.japanese, { max: 30, placeholder: '0-30', note: (value, raw) => `${raw || 0}/30 → ${formatScore(value)}点` })}</td>
        <td>${scoreInput(row, 'pin1Ok')}</td>
        <td>${scoreInput(row, 'pin1Time')}</td>
        <td>${scoreInput(row, 'pin2Ok')}</td>
        <td>${scoreInput(row, 'pin2Time')}</td>
        <td>${row.ranks.pin}<div class="mini">${pin.ok}/2 ${pin.complete ? pin.time.toFixed(2) + '秒' : ''}</div></td>
        <td><span class="rank-list">${rankSummary(row)}</span></td>
        <td><strong>${row.rankSum}</strong></td>
        <td><button class="icon-btn danger remove-candidate" data-id="${row.id}" title="削除"><i data-lucide="x"></i></button></td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('change', () => updateScore(input.dataset.id, input.dataset.field, input.value));
  });
  body.querySelectorAll('.candidate-name').forEach(input => {
    input.addEventListener('change', () => updateCandidateName(input.dataset.id, input.value));
  });
  body.querySelectorAll('.remove-candidate').forEach(button => {
    button.addEventListener('click', () => removeCandidate(button.dataset.id));
  });

  renderMetrics(interview, rows);
  renderPrintReport(interview, rows);
}

function render() {
  renderStatus();
  renderInterviews();
  const interview = activeInterview();
  const hasInterview = !!interview;
  $('#empty-state').classList.toggle('hidden', hasInterview);
  $('#workspace').classList.toggle('hidden', !hasInterview);
  $('#active-title').textContent = hasInterview ? formatInterviewName(interview) : '面接を作成してください';
  $('#delete-interview').disabled = !hasInterview || !state.dbReady;
  $('#open-kraepelin').disabled = !hasInterview;
  $('#refresh-kraepelin').disabled = !hasInterview;
  $('#print-pdf').disabled = !hasInterview;
  $('#export-csv').disabled = !hasInterview;
  $('#interview-form button[type="submit"]').disabled = !state.dbReady;
  if (hasInterview) renderTable(interview);
  else if ($('#print-report')) $('#print-report').innerHTML = '';
  if (window.lucide) lucide.createIcons();
}

async function createInterview(event) {
  event.preventDefault();
  if (!state.dbReady) return;
  const date = $('#interview-date').value;
  const company = $('#interview-company').value.trim();
  const count = Math.max(1, Number($('#candidate-count').value || 1));

  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({ interview_date: date, company })
    .select('*')
    .single();
  if (error) {
    alert('面接作成に失敗しました: ' + error.message);
    return;
  }

  const interview = interviewFromDb(data, new Map());
  for (let i = 1; i <= count; i++) {
    interview.candidates.push(await createCandidate(interview.id, String(i)));
  }

  state.interviews.unshift(interview);
  state.activeId = interview.id;
  saveActiveId();
  event.target.reset();
  $('#candidate-count').value = 8;
  render();
}

async function addCandidate(event) {
  event.preventDefault();
  const interview = activeInterview();
  if (!interview || !state.dbReady) return;
  const no = normalizeNo($('#candidate-no').value || String(interview.candidates.length + 1));
  if (!no) return;
  if (interview.candidates.some(candidate => candidate.no === no)) {
    alert('同じ候補者番号があります');
    return;
  }
  try {
    const candidate = await createCandidate(interview.id, no, $('#candidate-name').value.trim());
    interview.candidates.push(candidate);
    $('#candidate-no').value = '';
    $('#candidate-name').value = '';
    render();
  } catch (error) {
    alert('候補者追加に失敗しました: ' + error.message);
  }
}

function findCandidateById(id) {
  const interview = activeInterview();
  return interview?.candidates.find(item => item.id === id) || null;
}

async function updateScore(id, field, value) {
  const candidate = findCandidateById(id);
  if (!candidate) return;
  const columnByField = {
    math: 'math_score',
    vietnamese: 'vietnamese_score',
    japanese: 'japanese_score',
    pin1Ok: 'pin1_ok',
    pin1Time: 'pin1_time',
    pin2Ok: 'pin2_ok',
    pin2Time: 'pin2_time',
  };
  const column = columnByField[field];
  let next = toDbNumber(value);
  if (next != null) {
    const maxByField = {
      math: 100,
      vietnamese: 100,
      japanese: 30,
      pin1Ok: 1,
      pin2Ok: 1,
    };
    const max = maxByField[field];
    if (max != null) next = Math.min(max, Math.max(0, next));
    if (field === 'pin1Time' || field === 'pin2Time') next = Math.max(0, next);
  }
  const { error } = await supabase.from('interview_candidates').update({ [column]: next }).eq('id', id);
  if (error) {
    alert('保存に失敗しました: ' + error.message);
    return;
  }
  ensureScore(candidate)[field] = next ?? '';
  render();
}

async function updateCandidateName(id, value) {
  const candidate = findCandidateById(id);
  if (!candidate) return;
  const name = value.trim();
  const { error } = await supabase.from('interview_candidates').update({ name }).eq('id', id);
  if (error) {
    alert('保存に失敗しました: ' + error.message);
    return;
  }
  candidate.name = name;
}

async function removeCandidate(id) {
  const interview = activeInterview();
  if (!interview || !confirm('この候補者を削除しますか。')) return;
  const { error } = await supabase.from('interview_candidates').delete().eq('id', id);
  if (error) {
    alert('削除に失敗しました: ' + error.message);
    return;
  }
  interview.candidates = interview.candidates.filter(candidate => candidate.id !== id);
  render();
}

async function renumberCandidates() {
  const interview = activeInterview();
  if (!interview || !confirm('候補者番号を1から振り直しますか。')) return;
  const sorted = [...interview.candidates].sort((a, b) => Number(a.no) - Number(b.no));
  for (let i = 0; i < sorted.length; i++) {
    const nextNo = String(i + 1);
    const { error } = await supabase.from('interview_candidates').update({ candidate_no: nextNo }).eq('id', sorted[i].id);
    if (error) {
      alert('番号更新に失敗しました: ' + error.message);
      return;
    }
    sorted[i].no = nextNo;
  }
  render();
}

async function deleteInterview() {
  const interview = activeInterview();
  if (!interview) return;
  if (!confirm(`${formatInterviewName(interview)}を削除しますか。`)) return;
  const { error } = await supabase.from('interview_sessions').delete().eq('id', interview.id);
  if (error) {
    alert('削除に失敗しました: ' + error.message);
    return;
  }
  state.interviews = state.interviews.filter(item => item.id !== interview.id);
  state.activeId = state.interviews[0]?.id || '';
  saveActiveId();
  render();
}

async function fetchKraepelin() {
  if (typeof supabase === 'undefined') {
    alert('Supabase設定を読み込めません');
    return;
  }
  const interview = activeInterview();
  if (!interview) return;
  const columns = 'id,name,started_at,rows_per_half,results,judgment_type,judgment_score,avg_correct,error_rate';
  const candidateNames = interview.candidates.flatMap(candidate => [
    `No.${candidate.no}`,
    `No. ${candidate.no}`,
    `No ${candidate.no}`,
    `候補者 ${candidate.no}`,
  ]);

  const [sessionResp, legacyResp, unassignedResp] = await Promise.all([
    supabase
      .from('kraepelin_results')
      .select(columns)
      .ilike('name', `session:${interview.id} / %`)
      .order('started_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('kraepelin_results')
      .select(columns)
      .ilike('name', `${formatInterviewName(interview)} / %`)
      .order('started_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('kraepelin_results')
      .select(columns)
      .in('name', candidateNames)
      .order('started_at', { ascending: false, nullsFirst: false }),
  ]);
  const error = sessionResp.error || legacyResp.error || unassignedResp.error;
  if (error) {
    alert('クレペリン結果の取得に失敗しました: ' + error.message);
    return;
  }
  const byId = new Map();
  [...(sessionResp.data || []), ...(legacyResp.data || []), ...(unassignedResp.data || [])].forEach(record => {
    byId.set(record.id, record);
  });
  state.kraepelinRecords = [...byId.values()];
  await attachUnassignedKraepelin();
  render();
}

async function attachUnassignedKraepelin() {
  const interview = activeInterview();
  if (!interview || typeof supabase === 'undefined') return;
  const updates = [];
  interview.candidates.forEach(candidate => {
    const current = getKraepelinFor(candidate, interview);
    if (!current) return;
    const parsed = parseKraepelinName(current.name);
    if (!parsed.sessionId) {
      updates.push({ record: current, name: kraepelinSessionName(interview, candidate) });
    }
  });
  for (const item of updates) {
    const { error } = await supabase.from('kraepelin_results').update({ name: item.name }).eq('id', item.record.id);
    if (!error) item.record.name = item.name;
  }
}

function openKraepelin() {
  window.open('../kraepelin/interview.html', '_blank', 'noopener');
}

function printPdf() {
  const interview = activeInterview();
  if (!interview) return;
  renderPrintReport(interview, buildRows(interview));
  window.print();
}

function exportCsv() {
  const interview = activeInterview();
  if (!interview) return;
  const headers = ['総合順位', '候補者番号', '氏名・メモ', 'クレペリン評価点', 'クレペリン正答数', 'クレペリン誤答率', 'クレペリン判定', 'クレペリン備考', '数学', '数学順位', 'ベトナム国語', 'ベトナム国語順位', '日本語単語正答数', '日本語単語100点換算', '日本語単語順位', 'ピン成功数', 'ピン時間', 'ピン順位', '科目順位', '順位合計'];
  const rows = buildRows(interview).map(row => {
    const pin = pinSummary(row.score);
    return [
      row.finalRank,
      row.no,
      row.name || '',
      row.kraepelinEval?.total ?? '',
      row.kraepelinTotal ?? '',
      row.kSummary?.errorRate == null ? '' : formatPercent(row.kSummary.errorRate),
      judgmentLabel(row.kSummary?.judgment),
      kraepelinComment(row.kSummary, row.kraepelinEval),
      row.math ?? '',
      row.ranks.math,
      row.vietnamese ?? '',
      row.ranks.vietnamese,
      row.japaneseRaw ?? '',
      row.japanese ?? '',
      row.ranks.japanese,
      pin.ok,
      pin.complete ? pin.time.toFixed(2) : '',
      row.ranks.pin,
      rankSummary(row),
      row.rankSum,
    ];
  });
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formatInterviewName(interview)}_事前テスト集計.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  $('#interview-form').addEventListener('submit', createInterview);
  $('#candidate-form').addEventListener('submit', addCandidate);
  $('#renumber-candidates').addEventListener('click', renumberCandidates);
  $('#delete-interview').addEventListener('click', deleteInterview);
  $('#refresh-kraepelin').addEventListener('click', fetchKraepelin);
  $('#open-kraepelin').addEventListener('click', openKraepelin);
  $('#print-pdf').addEventListener('click', printPdf);
  $('#export-csv').addEventListener('click', exportCsv);
}

bindEvents();
loadData();
