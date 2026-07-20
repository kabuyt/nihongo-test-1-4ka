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
  const sessionMatch = raw.match(/^session:([^/]+)\s*\/\s*No\.?\s*(.+)$/i);
  if (sessionMatch) {
    return { sessionId: sessionMatch[1].trim(), interviewName: '', candidateNo: sessionMatch[2].trim() };
  }
  const match = raw.match(/^(.*?)\s*\/\s*No\.?\s*(.+)$/i);
  if (match) return { sessionId: '', interviewName: match[1].trim(), candidateNo: match[2].trim() };
  const noOnly = raw.match(/^No\.?\s*(.+)$/i);
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

function summarizeKraepelin(record) {
  const results = Array.isArray(record?.results) ? record.results : [];
  const first = results.filter(row => row.phase === 'first').reduce((sum, row) => sum + rowStats(row), 0);
  const second = results.filter(row => row.phase === 'second').reduce((sum, row) => sum + rowStats(row), 0);
  return { first, second, total: first + second };
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
      kraepelinTotal: kSummary?.total ?? null,
      math: numeric(score.math),
      vietnamese: numeric(score.vietnamese),
      japanese: numeric(score.japanese),
    };
  });

  const kRank = rankValues(enriched, row => row.kraepelinTotal, 'desc');
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

function scoreInput(row, field, type = 'number') {
  const value = row.score[field] ?? '';
  return `<input class="score-input" data-id="${row.id}" data-field="${field}" type="${type}" value="${String(value).replace(/"/g, '&quot;')}">`;
}

function renderTable(interview) {
  const rows = buildRows(interview);
  const body = $('#score-body');
  body.innerHTML = rows.map(row => {
    const pin = pinSummary(row.score);
    const rankClass = row.finalRank <= 3 ? 'rank top' : 'rank';
    return `
      <tr>
        <td><span class="${rankClass}">${row.finalRank}</span></td>
        <td>${candidateLabel(row)}</td>
        <td><input class="candidate-name" data-id="${row.id}" value="${(row.name || '').replace(/"/g, '&quot;')}"></td>
        <td>${row.kraepelinTotal == null ? '<span class="status-pill missing">未取得</span>' : `<span class="status-pill ok">${row.kraepelinTotal}</span><div class="mini">順位 ${row.ranks.k}</div>`}</td>
        <td><a class="link-btn" href="${kraepelinUrl(interview, row)}" target="_blank" rel="noopener">開く</a></td>
        <td>${scoreInput(row, 'math')}</td>
        <td>${scoreInput(row, 'vietnamese')}</td>
        <td>${scoreInput(row, 'japanese')}</td>
        <td>${scoreInput(row, 'pin1Ok')}</td>
        <td>${scoreInput(row, 'pin1Time')}</td>
        <td>${scoreInput(row, 'pin2Ok')}</td>
        <td>${scoreInput(row, 'pin2Time')}</td>
        <td>${row.ranks.pin}<div class="mini">${pin.ok}/2 ${pin.complete ? pin.time.toFixed(2) + '秒' : ''}</div></td>
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
  $('#export-csv').disabled = !hasInterview;
  $('#interview-form button[type="submit"]').disabled = !state.dbReady;
  if (hasInterview) renderTable(interview);
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
  const next = toDbNumber(value);
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
  const { data, error } = await supabase
    .from('kraepelin_results')
    .select('*')
    .order('started_at', { ascending: false, nullsFirst: false });
  if (error) {
    alert('クレペリン結果の取得に失敗しました: ' + error.message);
    return;
  }
  state.kraepelinRecords = data || [];
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

function exportCsv() {
  const interview = activeInterview();
  if (!interview) return;
  const headers = ['総合順位', '候補者番号', '氏名・メモ', 'クレペリン', '数学', 'ベトナム国語', '日本語単語', 'ピン成功数', 'ピン時間', 'ピン順位', '順位合計'];
  const rows = buildRows(interview).map(row => {
    const pin = pinSummary(row.score);
    return [row.finalRank, row.no, row.name || '', row.kraepelinTotal ?? '', row.math ?? '', row.vietnamese ?? '', row.japanese ?? '', pin.ok, pin.complete ? pin.time.toFixed(2) : '', row.ranks.pin, row.rankSum];
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
  $('#export-csv').addEventListener('click', exportCsv);
}

bindEvents();
loadData();
