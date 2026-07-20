const ACTIVE_KEY = 'interviewManager.activeId.v2';
const AUTH_EMAIL_DOMAIN = 'nihongo-test.local';
const SENDERS = ['BARAEN', 'AKANE', 'VJC'];
const PIN_GRADES = [
  { value: 3, symbol: '◎', label: '正確に完了' },
  { value: 2, symbol: '○', label: '自力で修正' },
  { value: 1, symbol: '△', label: '一部ミス' },
  { value: 0, symbol: '×', label: '継続困難' },
];

const state = {
  user: null,
  interviews: [],
  activeId: '',
  kraepelinRecords: [],
  dbReady: false,
  loading: false,
  error: '',
};

const $ = (selector) => document.querySelector(selector);

function isAuthed() {
  return !!currentUser();
}

function currentUser() {
  return state.user;
}

function isAdminUser() {
  return currentUser()?.role === 'admin';
}

function showAuthScreen() {
  $('#auth-screen').classList.remove('hidden');
  $('#admin-app').classList.add('hidden');
  $('#auth-account').focus();
}

function showAdminApp() {
  $('#auth-screen').classList.add('hidden');
  $('#admin-app').classList.remove('hidden');
}

async function handleAuth(event) {
  event.preventDefault();
  const loginId = $('#auth-account').value.trim().toLowerCase();
  const account = loginId === 'grop' ? 'grop-admin' : loginId;
  const input = $('#auth-password');
  const button = event.submitter || event.target.querySelector('button[type="submit"]');
  button.disabled = true;
  $('#auth-error').classList.add('hidden');

  if (!/^[a-z0-9-]+$/.test(account)) {
    $('#auth-error').textContent = 'ログインIDまたはパスワードが違います。';
    $('#auth-error').classList.remove('hidden');
    button.disabled = false;
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${account}@${AUTH_EMAIL_DOMAIN}`,
    password: input.value,
  });
  if (error || !data.session || !(await loadCurrentUser())) {
    await supabase.auth.signOut();
    state.user = null;
    $('#auth-error').textContent = error?.message === 'Invalid login credentials'
      ? 'ログインIDまたはパスワードが違います。'
      : 'このアカウントには管理画面の権限がありません。';
    $('#auth-error').classList.remove('hidden');
    input.select();
    button.disabled = false;
    return;
  }
  $('#auth-error').classList.add('hidden');
  $('#auth-account').value = '';
  input.value = '';
  button.disabled = false;
  showAdminApp();
  await loadData();
}

async function loadCurrentUser() {
  const { data, error } = await supabase
    .from('manager_accounts')
    .select('display_name,role,sender_org')
    .single();
  if (error || !data) return false;
  state.user = {
    label: data.display_name,
    role: data.role,
    sender: data.sender_org || '',
  };
  return true;
}

async function logout() {
  await supabase.auth.signOut();
  state.user = null;
  $('#auth-account').value = '';
  $('#auth-password').value = '';
  state.interviews = [];
  state.activeId = '';
  state.kraepelinRecords = [];
  state.dbReady = false;
  state.loading = false;
  state.error = '';
  showAuthScreen();
}

async function initializeAuth() {
  if (typeof supabase === 'undefined') {
    showAuthScreen();
    $('#auth-error').textContent = 'Supabase設定を読み込めません。';
    $('#auth-error').classList.remove('hidden');
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session && await loadCurrentUser()) {
    showAdminApp();
    await loadData();
    return;
  }
  if (data.session) await supabase.auth.signOut();
  showAuthScreen();
}

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

function formatSender(value) {
  return SENDERS.includes(value) ? value : '未設定';
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

function normalizeLatinName(value) {
  return String(value || '')
    .trim()
    .replace(/[Đđ]/g, char => char === 'Đ' ? 'D' : 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function splitCandidateName(value) {
  const raw = String(value || '').trim();
  if (!raw.includes('/')) {
    const looksLatin = /[A-Za-z]/.test(raw) && !/[\u3040-\u30ff\u3400-\u9fff]/.test(raw);
    return looksLatin ? { kana: '', latin: normalizeLatinName(raw) } : { kana: raw, latin: '' };
  }
  const [kana, ...latinParts] = raw.split('/');
  return {
    kana: kana.trim(),
    latin: normalizeLatinName(latinParts.join('/')),
  };
}

function composeCandidateName(kana, latin) {
  const cleanKana = String(kana || '').trim();
  const cleanLatin = normalizeLatinName(latin);
  if (cleanKana && cleanLatin) return `${cleanKana} / ${cleanLatin}`;
  return cleanKana || cleanLatin;
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

function vietnameseTestUrl(interview, candidate) {
  const url = new URL('../vietnamese-language-test/index.html', window.location.href);
  url.searchParams.set('session', interview.id);
  url.searchParams.set('no', candidate.no);
  return url.href;
}

function qrImageUrl(targetUrl) {
  const url = new URL('https://api.qrserver.com/v1/create-qr-code/');
  url.searchParams.set('size', '150x150');
  url.searchParams.set('margin', '8');
  url.searchParams.set('data', targetUrl);
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
  if (value === '' || value == null) return null;
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

function vietnameseComment(score) {
  const value = numeric(score);
  if (value == null) return '未受験のため、ベトナム国語能力は未評価です。';
  if (value >= 85) return '得点から、文法・語彙・文構造をバランスよく理解していると考えられます。';
  if (value >= 70) return '基礎的な文法と語彙は概ね理解しています。複雑な文構造では確認が必要です。';
  if (value >= 50) return '基本的な語彙は理解していますが、文法と文構造の正確さに課題があります。';
  return '基礎語彙・文法の理解に課題があり、文章理解を含めた継続的な学習が必要です。';
}

function overallComment(row) {
  const comments = [];
  const kraepelin = kraepelinComment(row.kSummary, row.kraepelinEval);
  if (kraepelin) comments.push(`【クレペリン】${kraepelin}`);
  comments.push(`【ベトナム国語】${vietnameseComment(row.vietnamese)}`);
  return comments.join(' ');
}

function candidateFromDb(row) {
  return {
    id: row.id,
    no: row.candidate_no,
    name: row.name || '',
    photo: row.memo || '',
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
    senderOrg: row.sender_org || 'BARAEN',
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

  const user = currentUser();
  let sessionsQuery = supabase
    .from('interview_sessions')
    .select('*')
    .order('interview_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (user?.role === 'sender') sessionsQuery = sessionsQuery.eq('sender_org', user.sender);

  const sessionsResp = await sessionsQuery;
  let candidatesResp = { data: [], error: null };
  const interviewIds = (sessionsResp.data || []).map(row => row.id);
  if (interviewIds.length) {
    candidatesResp = await supabase
      .from('interview_candidates')
      .select('*')
      .in('interview_id', interviewIds)
      .order('candidate_no', { ascending: true });
  }

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
  const grade1 = numeric(score.pin1Ok);
  const grade2 = numeric(score.pin2Ok);
  const time1 = numeric(score.pin1Time);
  const time2 = numeric(score.pin2Time);
  const grades = [grade1, grade2];
  const times = [time1, time2];
  const enteredCount = grades.filter(value => value != null).length;
  const requiredTimesComplete = grades.every((grade, index) => grade == null || grade < 1 || times[index] != null);
  return {
    grades,
    times,
    gradeTotal: grades.reduce((sum, value) => sum + (value ?? 0), 0),
    enteredCount,
    time: times.reduce((sum, value, index) => sum + (grades[index] >= 1 && value != null ? value : 0), 0),
    complete: enteredCount === 2 && requiredTimesComplete,
  };
}

function pinGradeInfo(value) {
  return PIN_GRADES.find(item => item.value === numeric(value)) || null;
}

function pinAttemptText(grade, time) {
  const info = pinGradeInfo(grade);
  if (!info) return '未入力';
  return `${info.symbol}${info.label}${info.value >= 1 && time != null ? ` ${Number(time).toFixed(2)}秒` : ''}`;
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
    if (pa.enteredCount !== pb.enteredCount) return pb.enteredCount - pa.enteredCount;
    if (pa.gradeTotal !== pb.gradeTotal) return pb.gradeTotal - pa.gradeTotal;
    const paSecond = pa.grades[1] ?? -1;
    const pbSecond = pb.grades[1] ?? -1;
    if (paSecond !== pbSecond) return pbSecond - paSecond;
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
  const user = currentUser();
  $('#interview-list-title').textContent = user?.role === 'admin' ? '面接一覧' : '担当面接';
  list.innerHTML = state.interviews.map(interview => `
    <button class="interview-item ${interview.id === state.activeId ? 'active' : ''}" data-id="${interview.id}">
      <strong>${formatInterviewName(interview)}</strong>
      <span>${formatSender(interview.senderOrg)} / ${interview.candidates.length}人</span>
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
      <div class="score-meta">${note} / 順位 ${rank}</div>
      <div class="score-link-slot">
        ${options.link ? `<a class="mini-link" href="${options.link}" target="_blank" rel="noopener">受験</a>` : ''}
      </div>
    </div>
  `;
}

function scoreInput(row, field, type = 'number') {
  const value = row.score[field] ?? '';
  return `<input class="score-input" data-id="${row.id}" data-field="${field}" type="${type}" value="${String(value).replace(/"/g, '&quot;')}">`;
}

function pinGradeControl(row, round) {
  const field = `pin${round}Ok`;
  const current = numeric(row.score[field]);
  const currentInfo = pinGradeInfo(current);
  return `
    <div class="score-cell pin-entry-cell">
      <select
        class="pin-grade-select grade-${current ?? 'empty'}"
        data-id="${row.id}"
        data-round="${round}"
        aria-label="ピンボード ${round}回目評価"
      >
        <option value="" ${current == null ? 'selected' : ''}>未入力</option>
        ${PIN_GRADES.map(grade => `
          <option value="${grade.value}" ${current === grade.value ? 'selected' : ''}>
            ${grade.symbol} ${grade.label}
          </option>
        `).join('')}
      </select>
      <div class="score-meta">${currentInfo ? `${currentInfo.symbol} ${currentInfo.label}` : '評価を選択'}</div>
      <div class="score-link-slot"></div>
    </div>
  `;
}

function pinTimeInput(row, round) {
  const grade = numeric(row.score[`pin${round}Ok`]);
  const field = `pin${round}Time`;
  const value = row.score[field] ?? '';
  const enabled = grade != null && grade >= 1;
  return `
    <div class="score-cell pin-entry-cell">
      <input
        class="score-input pin-time-input"
        data-id="${row.id}"
        data-field="${field}"
        type="number"
        min="0"
        step="0.01"
        placeholder="${enabled ? '秒' : '-'}"
        value="${enabled ? String(value).replace(/"/g, '&quot;') : ''}"
        ${enabled ? '' : 'disabled'}
        aria-label="ピンボード ${round}回目時間（秒）"
      >
      <div class="score-meta">${enabled ? (value === '' ? '秒数を入力' : `${Number(value).toFixed(2)}秒`) : (grade === 0 ? '×は入力不要' : '評価後に入力')}</div>
      <div class="score-link-slot"></div>
    </div>
  `;
}

function rankSummaryItems(row) {
  return [
    ['クレペリン', row.ranks.k],
    ['数学', row.ranks.math],
    ['ベトナム国語', row.ranks.vietnamese],
    ['日本語単語', row.ranks.japanese],
    ['ピンボード', row.ranks.pin],
  ];
}

function rankSummary(row) {
  return rankSummaryItems(row).map(([label, rank]) => `${label}：${rank}位`).join(' / ');
}

function rankSummaryHtml(row) {
  return rankSummaryItems(row)
    .map(([label, rank]) => `<span><b>${escapeHtml(label)}</b>${rank}位</span>`)
    .join('');
}

function renderPrintReport(interview, rows) {
  const report = $('#print-report');
  if (!report || !interview) return;
  const today = new Date().toLocaleDateString('ja-JP');
  const interviewDate = interview.date
    ? new Date(`${interview.date}T00:00:00`).toLocaleDateString('ja-JP')
    : '-';
  report.innerHTML = `
    <header class="print-header">
      <div class="print-brand">
        <img src="assets/grop-vietnam-logo.png" alt="GROP VIETNAM">
        <div class="print-title-block">
          <div class="print-label">PRE-INTERVIEW TEST RESULTS</div>
          <h1>事前テスト結果</h1>
          <div class="print-pin-legend" aria-label="ピンボード評価基準">
            <b>ピンボード評価</b>
            <span><strong>◎</strong> 正確に完了</span>
            <span><strong>○</strong> 自力で修正</span>
            <span><strong>△</strong> 一部ミス</span>
            <span><strong>×</strong> 継続困難</span>
          </div>
        </div>
      </div>
      <div class="print-document-meta">
        <span>社内資料</span>
        <strong>作成日 ${today}</strong>
      </div>
    </header>
    <section class="print-overview" aria-label="面接情報">
      <div><span>面接日</span><strong>${escapeHtml(interviewDate)}</strong></div>
      <div><span>受入企業</span><strong>${escapeHtml(interview.company || '-')}</strong></div>
      <div><span>送り出し機関</span><strong>${escapeHtml(formatSender(interview.senderOrg) || '-')}</strong></div>
      <div><span>候補者数</span><strong>${rows.length}名</strong></div>
    </section>
    <table class="print-table">
      <colgroup>
        <col class="print-col-rank">
        <col class="print-col-candidate">
        <col class="print-col-kraepelin">
        <col class="print-col-score">
        <col class="print-col-score">
        <col class="print-col-score">
        <col class="print-col-pin">
        <col class="print-col-subject-rank">
        <col class="print-col-note">
      </colgroup>
      <thead>
        <tr>
          <th>総合結果</th>
          <th>候補者</th>
          <th>クレペリン</th>
          <th>数学</th>
          <th>ベトナム国語</th>
          <th>日本語単語</th>
          <th>ピンボード</th>
          <th>科目順位</th>
          <th>総合所見</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const pin = pinSummary(row.score);
          return `
            <tr>
              <td class="print-rank"><strong>第${row.finalRank}位</strong></td>
              <td class="print-candidate">
                <div class="print-candidate-inner">
                  ${row.photo ? `<img class="print-photo" src="${escapeHtml(row.photo)}" alt="">` : '<div class="print-photo print-photo-empty">写真なし</div>'}
                  <div class="print-candidate-copy">
                    <span class="print-candidate-no">${escapeHtml(candidateLabel(row))}</span>
                    <strong>${escapeHtml(row.name || '氏名未入力')}</strong>
                  </div>
                </div>
              </td>
              <td class="print-kraepelin">${row.kraepelinEval ? `<strong>${formatScore(row.kraepelinEval.total)}点</strong><span>正答 ${row.kraepelinTotal} ／ 誤答 ${formatPercent(row.kSummary.errorRate)}</span>` : '<span>未取得</span>'}</td>
              <td class="print-score">${row.math == null ? '<span>-</span>' : `<strong>${formatScore(row.math)}</strong><span>点</span>`}</td>
              <td class="print-score">${row.vietnamese == null ? '<span>-</span>' : `<strong>${formatScore(row.vietnamese)}</strong><span>点</span>`}</td>
              <td class="print-score">${row.japanese == null ? '<span>-</span>' : `<strong>${formatScore(row.japanese)}</strong><span>点（${row.japaneseRaw}/30）</span>`}</td>
              <td class="print-pin">
                <span>1回目　${escapeHtml(pinAttemptText(pin.grades[0], pin.times[0]))}</span>
                <span>2回目　${escapeHtml(pinAttemptText(pin.grades[1], pin.times[1]))}</span>
              </td>
              <td class="print-subject-rank">${rankSummaryHtml(row)}</td>
              <td class="print-note">${escapeHtml(overallComment(row))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <footer class="print-footer">
      <span>評価基準：各科目およびピンボードの順位をもとに総合順位を算出</span>
      <span>${escapeHtml(formatInterviewName(interview))}</span>
    </footer>
  `;
}

function renderLinkSheet(interview) {
  const sheet = $('#link-sheet');
  if (!sheet || !interview) return;
  $('#link-sheet-title').textContent = formatInterviewName(interview);
  const candidates = [...(interview.candidates || [])].sort((a, b) => Number(a.no) - Number(b.no));
  $('#link-sheet-body').innerHTML = candidates.map(candidate => {
    const kUrl = kraepelinUrl(interview, candidate);
    const vUrl = vietnameseTestUrl(interview, candidate);
    return `
      <article class="link-card" data-candidate-id="${escapeHtml(candidate.id)}">
        <div class="link-card-head">
          <div class="link-candidate">
            ${candidate.photo ? `<img class="link-photo" src="${escapeHtml(candidate.photo)}" alt="">` : '<div class="link-photo empty-photo"></div>'}
            <div>
              <div class="link-no">${escapeHtml(candidateLabel(candidate))}</div>
              <h2>${escapeHtml(candidate.name || '氏名未入力')}</h2>
            </div>
          </div>
          <span class="candidate-ticket-label">候補者専用</span>
        </div>
        <p class="link-card-guide">上記の番号と氏名が本人のものか確認してから受験してください。</p>
        <div class="qr-pair">
          <div class="qr-box">
            <div class="qr-step"><span>1</span>クレペリン</div>
            <img src="${escapeHtml(qrImageUrl(kUrl))}" alt="クレペリンQR">
            <div class="qr-actions">
              <button class="qr-action copy-test-url" type="button" data-url="${escapeHtml(kUrl)}"><i data-lucide="copy"></i>URLコピー</button>
              <a class="qr-action" href="${escapeHtml(kUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>開く</a>
            </div>
          </div>
          <div class="qr-box">
            <div class="qr-step"><span>2</span>ベトナム国語</div>
            <img src="${escapeHtml(qrImageUrl(vUrl))}" alt="ベトナム国語QR">
            <div class="qr-actions">
              <button class="qr-action copy-test-url" type="button" data-url="${escapeHtml(vUrl)}"><i data-lucide="copy"></i>URLコピー</button>
              <a class="qr-action" href="${escapeHtml(vUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>開く</a>
            </div>
          </div>
        </div>
        <div class="link-card-footer">
          <span>この受験票は本人だけが使用してください。</span>
          <button class="btn print-candidate-ticket" type="button" data-id="${escapeHtml(candidate.id)}"><i data-lucide="printer"></i>この1人を印刷</button>
        </div>
      </article>
    `;
  }).join('');
  sheet.querySelectorAll('.copy-test-url').forEach(button => {
    button.addEventListener('click', () => copyTestUrl(button));
  });
  sheet.querySelectorAll('.print-candidate-ticket').forEach(button => {
    button.addEventListener('click', () => printCandidateLinkSheet(button.dataset.id));
  });
}

function renderTable(interview) {
  const rows = buildRows(interview);
  const body = $('#score-body');
  const canDeleteCandidates = isAdminUser();
  body.innerHTML = rows.map(row => {
    const pin = pinSummary(row.score);
    const rankClass = row.finalRank <= 3 ? 'rank top' : 'rank';
    const kraepelinCell = row.kraepelinEval == null
      ? '<span class="status-pill missing">未取得</span>'
      : `<span class="status-pill ok">${row.kraepelinEval.total}</span>
         <div class="mini">順位 ${row.ranks.k} / 正答 ${row.kraepelinTotal} / 誤答 ${formatPercent(row.kSummary.errorRate)}</div>
         <div class="mini">作業 ${row.kraepelinEval.work}・正確 ${row.kraepelinEval.accuracy}・安定 ${row.kraepelinEval.stability} / ${judgmentLabel(row.kSummary.judgment)}</div>
         <div class="comment-text">${kraepelinComment(row.kSummary, row.kraepelinEval)}</div>`;
    const nameParts = splitCandidateName(row.name);
    return `
      <tr>
        <td><span class="${rankClass}">${row.finalRank}</span></td>
        <td>${candidateLabel(row)}</td>
        <td class="photo-cell">
          ${row.photo ? `<img class="candidate-photo" src="${escapeHtml(row.photo)}" alt="">` : '<span class="photo-empty">未登録</span>'}
          <label class="photo-upload">
            写真
            <input class="photo-input" data-id="${row.id}" type="file" accept="image/*">
          </label>
        </td>
        <td class="cell-name">
          <div class="candidate-name-stack">
            <input class="candidate-name-input candidate-name-kana" data-id="${row.id}" data-field="kana" value="${escapeHtml(nameParts.kana)}" placeholder="カタカナ" aria-label="${escapeHtml(candidateLabel(row))} カタカナ氏名">
            <input class="candidate-name-input candidate-name-latin" data-id="${row.id}" data-field="latin" value="${escapeHtml(nameParts.latin)}" placeholder="LATIN NAME" aria-label="${escapeHtml(candidateLabel(row))} ラテン氏名">
          </div>
        </td>
        <td class="kraepelin-cell">${kraepelinCell}</td>
        <td><a class="link-btn" href="${kraepelinUrl(interview, row)}" target="_blank" rel="noopener">開く</a></td>
        <td>${subjectScoreCell(row, 'math', row.math, row.ranks.math)}</td>
        <td>${subjectScoreCell(row, 'vietnamese', row.vietnamese, row.ranks.vietnamese, { link: vietnameseTestUrl(interview, row) })}</td>
        <td>${subjectScoreCell(row, 'japanese', row.japanese, row.ranks.japanese, { max: 30, placeholder: '0-30', note: (value, raw) => `${raw || 0}/30 → ${formatScore(value)}点` })}</td>
        <td>${pinGradeControl(row, 1)}</td>
        <td>${pinTimeInput(row, 1)}</td>
        <td>${pinGradeControl(row, 2)}</td>
        <td>${pinTimeInput(row, 2)}</td>
        <td>
          ${row.ranks.pin}
          <div class="mini">
            ${pin.enteredCount}/2回入力
            ${pin.complete && pin.time > 0 ? ` / ${pin.time.toFixed(2)}秒` : ''}
          </div>
        </td>
        <td><span class="rank-list">${rankSummaryHtml(row)}</span></td>
        <td>${canDeleteCandidates ? `<button class="icon-btn danger remove-candidate" data-id="${row.id}" title="候補者を削除" aria-label="${escapeHtml(candidateLabel(row))} ${escapeHtml(row.name || '')}を削除"><i data-lucide="trash-2"></i></button>` : ''}</td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('change', () => updateScore(input.dataset.id, input.dataset.field, input.value));
  });
  body.querySelectorAll('.pin-grade-select').forEach(select => {
    select.addEventListener('change', () => updatePinGrade(select.dataset.id, Number(select.dataset.round), select.value));
  });
  body.querySelectorAll('.candidate-name-input').forEach(input => {
    input.addEventListener('change', () => updateCandidateName(input.dataset.id));
  });
  body.querySelectorAll('.photo-input').forEach(input => {
    input.addEventListener('change', () => updateCandidatePhoto(input.dataset.id, input.files?.[0]));
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
  const user = currentUser();
  const isAdmin = user?.role === 'admin';
  $('#empty-state').classList.toggle('hidden', hasInterview);
  $('#workspace').classList.toggle('hidden', !hasInterview);
  $('#active-meta').classList.toggle('hidden', !hasInterview);
  $('#interview-form').classList.toggle('hidden', !isAdmin);
  $('#active-title').textContent = hasInterview ? formatInterviewName(interview) : (isAdmin ? '面接を作成してください' : '担当面接がありません');
  $('#current-account').textContent = user ? `${user.label}でログイン中` : '';
  $('#interview-sender').value = user?.role === 'sender' ? user.sender : ($('#interview-sender').value || 'BARAEN');
  $('#interview-sender').disabled = user?.role === 'sender';
  $('#active-sender-control').classList.toggle('hidden', !isAdmin);
  $('#active-sender-display').classList.toggle('hidden', isAdmin || !hasInterview);
  $('#active-sender-name').textContent = !isAdmin && hasInterview ? user?.sender || '' : '';
  if (hasInterview) {
    $('#active-sender').value = interview.senderOrg || 'BARAEN';
    $('#active-sender').disabled = user?.role !== 'admin';
  }
  $('#delete-interview').classList.toggle('hidden', !isAdmin);
  $('#delete-interview').disabled = !hasInterview || !state.dbReady || !isAdmin;
  $('#open-kraepelin').disabled = !hasInterview;
  $('#refresh-kraepelin').disabled = !hasInterview;
  $('#open-link-sheet').disabled = !hasInterview;
  $('#print-pdf').classList.toggle('hidden', !isAdmin);
  $('#export-csv').classList.toggle('hidden', !isAdmin);
  $('#print-pdf').disabled = !hasInterview;
  $('#export-csv').disabled = !hasInterview;
  $('#interview-form button[type="submit"]').disabled = !state.dbReady || !isAdmin;
  if (hasInterview) renderTable(interview);
  else if ($('#print-report')) $('#print-report').innerHTML = '';
  if (window.lucide) lucide.createIcons();
}

async function createInterview(event) {
  event.preventDefault();
  if (!state.dbReady || !isAdminUser()) {
    alert('面接を作成できるのはGROP管理者だけです。');
    return;
  }
  const date = $('#interview-date').value;
  const company = $('#interview-company').value.trim();
  const count = Math.max(1, Number($('#candidate-count').value || 1));
  const user = currentUser();
  const senderOrg = user?.role === 'sender' ? user.sender : $('#interview-sender').value;

  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({ interview_date: date, company, sender_org: senderOrg })
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
  $('#interview-sender').value = user?.role === 'sender' ? user.sender : 'BARAEN';
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
    const name = composeCandidateName($('#candidate-name-kana').value, $('#candidate-name-latin').value);
    const candidate = await createCandidate(interview.id, no, name);
    interview.candidates.push(candidate);
    $('#candidate-no').value = '';
    $('#candidate-name-kana').value = '';
    $('#candidate-name-latin').value = '';
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
      pin1Ok: 3,
      pin2Ok: 3,
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

async function updatePinGrade(id, round, grade) {
  const candidate = findCandidateById(id);
  const nextGrade = grade === '' ? null : Number(grade);
  if (!candidate || ![1, 2].includes(round) || (nextGrade != null && !PIN_GRADES.some(item => item.value === nextGrade))) return;
  const gradeField = `pin${round}Ok`;
  const timeField = `pin${round}Time`;
  const gradeColumn = `pin${round}_ok`;
  const timeColumn = `pin${round}_time`;
  const update = { [gradeColumn]: nextGrade };
  if (nextGrade == null || nextGrade < 1) update[timeColumn] = null;

  const { error } = await supabase.from('interview_candidates').update(update).eq('id', id);
  if (error) {
    alert('ピン評価の保存に失敗しました: ' + error.message);
    return;
  }

  const score = ensureScore(candidate);
  score[gradeField] = nextGrade ?? '';
  if (nextGrade == null || nextGrade < 1) score[timeField] = '';
  render();
}

async function updateCandidateName(id) {
  const candidate = findCandidateById(id);
  if (!candidate) return;
  const row = [...document.querySelectorAll('.candidate-name-input')]
    .find(input => input.dataset.id === id)
    ?.closest('.candidate-name-stack');
  if (!row) return;
  const name = composeCandidateName(
    row.querySelector('.candidate-name-kana')?.value,
    row.querySelector('.candidate-name-latin')?.value
  );
  const { error } = await supabase.from('interview_candidates').update({ name }).eq('id', id);
  if (error) {
    alert('保存に失敗しました: ' + error.message);
    return;
  }
  candidate.name = name;
  render();
}

async function updateInterviewSender(value) {
  const interview = activeInterview();
  const user = currentUser();
  if (!interview || user?.role !== 'admin' || !SENDERS.includes(value)) return;
  const { error } = await supabase.from('interview_sessions').update({ sender_org: value }).eq('id', interview.id);
  if (error) {
    alert('送り出しの保存に失敗しました: ' + error.message);
    $('#active-sender').value = interview.senderOrg || 'BARAEN';
    return;
  }
  interview.senderOrg = value;
  render();
}

async function updateCandidatePhoto(id, file) {
  const candidate = findCandidateById(id);
  if (!candidate || !file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const photo = String(reader.result || '');
    const { error } = await supabase.from('interview_candidates').update({ memo: photo }).eq('id', id);
    if (error) {
      alert('写真の保存に失敗しました: ' + error.message);
      return;
    }
    candidate.photo = photo;
    render();
  };
  reader.readAsDataURL(file);
}

async function removeCandidate(id) {
  const interview = activeInterview();
  const candidate = findCandidateById(id);
  if (!isAdminUser()) {
    alert('候補者を削除できるのはGROP管理者だけです。');
    return;
  }
  if (!interview || !candidate) return;
  const label = `${candidateLabel(candidate)} ${candidate.name || '氏名未入力'}`;
  const confirmed = confirm(
    `候補者を削除します。\n\n${label}\n\n` +
    '写真・点数・ピンボード結果も削除されます。\n' +
    'この操作は取り消せません。\n\n削除してよろしいですか？'
  );
  if (!confirmed) return;
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
  if (!isAdminUser()) {
    alert('面接を削除できるのはGROP管理者だけです。');
    return;
  }
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

function openLinkSheet() {
  const interview = activeInterview();
  if (!interview) return;
  renderLinkSheet(interview);
  $('#link-sheet').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeLinkSheet() {
  $('#link-sheet').classList.add('hidden');
  resetLinkPrintState();
}

function resetLinkPrintState() {
  document.body.classList.remove('printing-links', 'printing-single-link');
  document.querySelectorAll('.link-card.print-target').forEach(card => card.classList.remove('print-target'));
}

function printLinkSheet() {
  const interview = activeInterview();
  if (!interview) return;
  renderLinkSheet(interview);
  resetLinkPrintState();
  document.body.classList.add('printing-links');
  window.print();
  setTimeout(resetLinkPrintState, 500);
}

function printCandidateLinkSheet(candidateId) {
  const target = [...document.querySelectorAll('.link-card')]
    .find(card => card.dataset.candidateId === candidateId);
  if (!target) return;
  resetLinkPrintState();
  target.classList.add('print-target');
  document.body.classList.add('printing-links', 'printing-single-link');
  window.print();
  setTimeout(resetLinkPrintState, 500);
}

async function copyTestUrl(button) {
  const url = button.dataset.url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  const original = button.innerHTML;
  button.innerHTML = '<i data-lucide="check"></i>コピー済み';
  button.classList.add('copied');
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    button.innerHTML = original;
    button.classList.remove('copied');
    if (window.lucide) lucide.createIcons();
  }, 1600);
}

function exportCsv() {
  const interview = activeInterview();
  if (!interview) return;
  const headers = ['総合結果', '候補者番号', '氏名・メモ', 'クレペリン評価点', 'クレペリン正答数', 'クレペリン誤答率', 'クレペリン判定', 'クレペリン備考', '数学', '数学順位', 'ベトナム国語', 'ベトナム国語順位', '日本語単語正答数', '日本語単語100点換算', '日本語単語順位', 'ピン1評価', 'ピン1時間', 'ピン2評価', 'ピン2時間', 'ピン順位', '科目順位'];
  const rows = buildRows(interview).map(row => {
    const pin = pinSummary(row.score);
    return [
      `第${row.finalRank}位`,
      row.no,
      row.name || '',
      row.kraepelinEval?.total ?? '',
      row.kraepelinTotal ?? '',
      row.kSummary?.errorRate == null ? '' : formatPercent(row.kSummary.errorRate),
      judgmentLabel(row.kSummary?.judgment),
      overallComment(row),
      row.math ?? '',
      row.ranks.math,
      row.vietnamese ?? '',
      row.ranks.vietnamese,
      row.japaneseRaw ?? '',
      row.japanese ?? '',
      row.ranks.japanese,
      pinAttemptText(pin.grades[0], null),
      pin.grades[0] >= 1 && pin.times[0] != null ? pin.times[0].toFixed(2) : '',
      pinAttemptText(pin.grades[1], null),
      pin.grades[1] >= 1 && pin.times[1] != null ? pin.times[1].toFixed(2) : '',
      row.ranks.pin,
      rankSummary(row),
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
  $('#auth-form').addEventListener('submit', handleAuth);
  $('#interview-form').addEventListener('submit', createInterview);
  $('#candidate-form').addEventListener('submit', addCandidate);
  $('#active-sender').addEventListener('change', event => updateInterviewSender(event.target.value));
  $('#renumber-candidates').addEventListener('click', renumberCandidates);
  $('#delete-interview').addEventListener('click', deleteInterview);
  $('#refresh-kraepelin').addEventListener('click', fetchKraepelin);
  $('#open-kraepelin').addEventListener('click', openKraepelin);
  $('#open-link-sheet').addEventListener('click', openLinkSheet);
  $('#close-link-sheet').addEventListener('click', closeLinkSheet);
  $('#print-link-sheet').addEventListener('click', printLinkSheet);
  $('#print-pdf').addEventListener('click', printPdf);
  $('#export-csv').addEventListener('click', exportCsv);
  $('#logout').addEventListener('click', logout);
  window.addEventListener('focus', () => {
    if (isAuthed() && state.dbReady) loadData();
  });
}

bindEvents();
initializeAuth();
