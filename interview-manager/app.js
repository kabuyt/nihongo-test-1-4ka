const ACTIVE_KEY = 'interviewManager.activeId.v2';
const AUTH_EMAIL_DOMAIN = 'nihongo-test.local';
const SENDERS = ['BARAEN', 'AKANE', 'VJC'];
const BEHAVIOR_TEST_BASE_URL = 'https://kabuyt.github.io/behavior-test/';
const TEST_DEFINITIONS = [
  { key: 'kraepelin', label: 'クレペリン', ranked: true, online: true },
  { key: 'math', label: '数学', ranked: true, online: true },
  { key: 'vietnamese', label: 'ベトナム国語', ranked: true, online: true },
  { key: 'japanese', label: '日本語単語', ranked: true },
  { key: 'pinboard', label: 'ピンボード', ranked: true },
  { key: 'behavior', label: '行動選択テスト', ranked: false, online: true },
];
const PIN_GRADES = [
  { value: 3, symbol: '◎', label: '正確に完了', detail: '間違いなく最後まで完成した' },
  { value: 2, symbol: '○', label: '自力で修正', detail: '途中で間違えたが、指示なしで気づいて直し完成した' },
  { value: 1, symbol: '△', label: '一部ミス', detail: 'ほぼできたが、間違いが残った、または自力で直せなかった' },
  { value: 0, symbol: '×', label: '継続困難', detail: '間違いが続き、作業を進めたり修正したりできなかった' },
];

const state = {
  user: null,
  interviews: [],
  activeId: '',
  kraepelinRecords: [],
  behaviorRecords: [],
  dbReady: false,
  loading: false,
  error: '',
  kraepelinLastFetchedAt: null,
};

let kraepelinFetchInFlight = false;

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
  state.behaviorRecords = [];
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

function normalizeTestSettings(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(TEST_DEFINITIONS.map(test => [test.key, raw[test.key] !== false]));
}

function isTestEnabled(interview, key) {
  return normalizeTestSettings(interview?.testSettings)[key] !== false;
}

function enabledTests(interview, predicate = () => true) {
  return TEST_DEFINITIONS.filter(test => isTestEnabled(interview, test.key) && predicate(test));
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

function mathTestUrl(interview, candidate) {
  const url = new URL('../math-test/index.html', window.location.href);
  url.searchParams.set('session', interview.id);
  url.searchParams.set('no', candidate.no);
  return url.href;
}

function behaviorTestUrl(interview, candidate) {
  const url = new URL(BEHAVIOR_TEST_BASE_URL);
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

function overallComment(row, interview) {
  const comments = [];
  const kraepelin = kraepelinComment(row.kSummary, row.kraepelinEval);
  if (isTestEnabled(interview, 'kraepelin') && kraepelin) comments.push(`【クレペリン】${kraepelin}`);
  if (isTestEnabled(interview, 'vietnamese')) comments.push(`【ベトナム国語】${vietnameseComment(row.vietnamese)}`);
  return comments.join('\n');
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
    testSettings: normalizeTestSettings(row.test_settings),
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
  let behaviorResp = { data: [], error: null };
  const interviewIds = (sessionsResp.data || []).map(row => row.id);
  if (interviewIds.length) {
    candidatesResp = await supabase
      .from('interview_candidates')
      .select('*')
      .in('interview_id', interviewIds)
      .order('candidate_no', { ascending: true });
    behaviorResp = await supabase
      .from('behavior_test_results')
      .select('id,interview_id,candidate_id,candidate_number,candidate_name,q1,q2,q3,q4,q5,q6,duration_seconds,submitted_at,notes')
      .in('interview_id', interviewIds)
      .order('submitted_at', { ascending: false });
  }

  if (sessionsResp.error || candidatesResp.error || behaviorResp.error) {
    state.loading = false;
    state.dbReady = false;
    const message = sessionsResp.error?.message || candidatesResp.error?.message || behaviorResp.error?.message || 'Supabase読み込みエラー';
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
  state.behaviorRecords = behaviorResp.data || [];
  state.activeId = localStorage.getItem(ACTIVE_KEY) || state.interviews[0]?.id || '';
  if (!state.interviews.some(item => item.id === state.activeId)) state.activeId = state.interviews[0]?.id || '';
  state.dbReady = true;
  state.loading = false;
  render();
  if (activeInterview() && isTestEnabled(activeInterview(), 'kraepelin')) {
    await fetchKraepelin({ automatic: true });
  }
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

function getBehaviorFor(candidate, interview) {
  return state.behaviorRecords.find(record => (
    record.interview_id === interview.id
    && (record.candidate_id === candidate.id || String(record.candidate_number) === String(candidate.no))
  )) || null;
}

function behaviorAnswerItems(record) {
  if (!record || typeof QUESTIONS === 'undefined') return [];
  return QUESTIONS.map(question => {
    const selectedId = numeric(record[`q${question.n}`]);
    const selected = question.choices.find(choice => choice.id === selectedId);
    return selected ? {
      number: question.n,
      question: question.ja,
      choice: selected.ja,
      analysis: selected.analysis,
    } : null;
  }).filter(Boolean);
}

function behaviorSummary(record) {
  if (!record) return '未受験';
  const count = behaviorAnswerItems(record).length;
  const seconds = numeric(record.duration_seconds);
  return `受験済み（${count}/6問${seconds == null ? '' : `・${Math.floor(seconds / 60)}分${seconds % 60}秒`}）`;
}

function behaviorTendencyComment(record) {
  if (!record || typeof QUESTIONS === 'undefined') return '未受験のため、行動傾向は未評価です。';
  const strengthComments = {
    1: { 3: '遅刻した場合に会社へ理由を説明する', 4: '遅刻する可能性を会社へ早めに連絡する' },
    2: { 2: 'ミスを会社へ報告する' },
    3: { 1: '相手の反応に左右されず挨拶を続ける', 2: '関係を悪化させず翌日から挨拶を再開する' },
    4: { 3: '他人の物を使う前に確認する' },
    5: { 2: '必要な移動時間を計算する', 3: '余裕を持って出発する', 4: '早めに行動する' },
    6: { 3: '当事者へ直接伝えて話し合う' },
  };
  const reviewComments = {
    1: {
      1: '悪天候でも通常どおり出発する判断があり、遅れる可能性を事前に連絡する意識に注意が必要です。',
      2: '自分の出社準備より友人への連絡を優先する判断があり、仕事上の優先順位に注意が必要です。',
    },
    2: {
      1: 'ミスを一人で直そうとする判断があり、早めの報告・相談に注意が必要です。',
      3: '小さなミスは問題ないとして報告しない判断があり、注意が必要です。',
      4: '他の人が報告しなかった例を理由に、ミスを報告しない判断があり、注意が必要です。',
    },
    3: {
      3: '挨拶が返らない理由をすぐ本人に確認する判断があり、相手への聞き方やタイミングに注意が必要です。',
      4: '一度挨拶が返らないと今後は挨拶をしない判断があり、対人姿勢に注意が必要です。',
    },
    4: {
      1: '他人の物を無断で使う判断があったため、注意が必要です。',
      2: '名前がない物は自由に使ってよいという判断があったため、注意が必要です。',
      4: '事実を確認せず自分への贈り物と判断する傾向があり、注意が必要です。',
    },
    5: {
      1: '移動に15分必要な状況で10分前に出発する判断があり、時間管理に注意が必要です。',
    },
    6: {
      1: '自分の利用時間を過ぎても何も伝えず我慢する判断があり、必要な意思表示ができるか確認が必要です。',
      2: '決められた順番より相手を優先して待つ判断があり、共同生活でのルール意識に注意が必要です。',
      4: '当事者ではなく別の友人へ相談する判断があり、問題の伝え方に注意が必要です。',
    },
  };
  const reviewPriority = {
    1: { 1: 30, 2: 50 },
    2: { 1: 55, 3: 90, 4: 90 },
    3: { 3: 25, 4: 65 },
    4: { 1: 100, 2: 100, 4: 100 },
    5: { 1: 50 },
    6: { 1: 20, 2: 40, 4: 35 },
  };
  const responses = QUESTIONS.map(question => {
    const selectedId = numeric(record[`q${question.n}`]);
    const selected = question.choices.find(choice => choice.id === selectedId);
    return selected ? { number: question.n, selectedId, score: numeric(selected.score) ?? 0 } : null;
  }).filter(Boolean);
  if (!responses.length) return '回答不足のため、行動傾向は未評価です。';

  const strengths = responses
    .filter(item => item.score >= 2)
    .sort((a, b) => b.score - a.score || a.number - b.number)
    .slice(0, 2)
    .map(item => strengthComments[item.number]?.[item.selectedId])
    .filter(Boolean);
  const reviews = responses
    .filter(item => item.score <= 1)
    .sort((a, b) => (reviewPriority[b.number]?.[b.selectedId] ?? 0) - (reviewPriority[a.number]?.[a.selectedId] ?? 0) || a.number - b.number)
    .slice(0, 1)
    .map(item => reviewComments[item.number]?.[item.selectedId])
    .filter(Boolean);

  if (strengths.length && reviews.length) {
    return `「${strengths.join('」「')}」といった行動を選ぶ傾向があります。${reviews[0]}`;
  }
  if (strengths.length) return `「${strengths.join('」「')}」といった行動を選ぶ傾向があります。`;
  return reviews[0] || '回答内容について、面接で具体的に確認するとよいでしょう。';
}

function pinSummary(score) {
  const grade1 = numeric(score.pin1Ok);
  const grade2 = numeric(score.pin2Ok);
  const time1 = numeric(score.pin1Time);
  const time2 = numeric(score.pin2Time);
  const grades = [grade1, grade2];
  const times = [time1, time2];
  const enteredCount = grades.filter(value => value != null).length;
  const requiredTimesComplete = grades.every((grade, index) => grade == null || times[index] != null);
  return {
    grades,
    times,
    gradeTotal: grades.reduce((sum, value) => sum + (value ?? 0), 0),
    enteredCount,
    time: times.reduce((sum, value, index) => sum + (grades[index] != null && value != null ? value : 0), 0),
    complete: enteredCount === 2 && requiredTimesComplete,
  };
}

function pinScore(summary, fastestTime) {
  if (!summary?.complete) return null;
  const evaluationScore = 90 * (summary.gradeTotal / 6);
  const timeScore = summary.time > 0 && fastestTime > 0 ? 10 * (fastestTime / summary.time) : 10;
  return Number((evaluationScore + timeScore).toFixed(1));
}

function pinGradeInfo(value) {
  return PIN_GRADES.find(item => item.value === numeric(value)) || null;
}

function pinAttemptText(grade, time) {
  const info = pinGradeInfo(grade);
  if (!info) return '未入力';
  return `${info.symbol}${info.label}${time != null ? ` ${Number(time).toFixed(2)}秒` : ''}`;
}

function rankValues(items, getter, direction = 'desc') {
  const values = items.map(item => getter(item));
  const valid = [...new Set(values.filter(value => value != null))].sort((a, b) => direction === 'desc' ? b - a : a - b);
  return new Map(items.map((item, index) => {
    const value = values[index];
    return [item.no, value == null ? null : valid.indexOf(value) + 1];
  }));
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
      behavior: getBehaviorFor(candidate, interview),
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

  enriched.forEach(row => {
    row.pinSummaryData = pinSummary(row.score);
  });
  const fastestTime = enriched.reduce((fastest, row) => {
    const summary = row.pinSummaryData;
    if (summary.complete && summary.time > 0 && (fastest === 0 || summary.time < fastest)) return summary.time;
    return fastest;
  }, 0);
  enriched.forEach(row => {
    row.pinScoreValue = pinScore(row.pinSummaryData, fastestTime);
  });

  const kRank = isTestEnabled(interview, 'kraepelin') ? rankValues(enriched, row => row.kraepelinEval?.total ?? null, 'desc') : new Map();
  const mathRank = isTestEnabled(interview, 'math') ? rankValues(enriched, row => row.math, 'desc') : new Map();
  const vietnameseRank = isTestEnabled(interview, 'vietnamese') ? rankValues(enriched, row => row.vietnamese, 'desc') : new Map();
  const japaneseRank = isTestEnabled(interview, 'japanese') ? rankValues(enriched, row => row.japanese, 'desc') : new Map();
  const pinRank = isTestEnabled(interview, 'pinboard') ? rankValues(enriched, row => row.pinScoreValue, 'desc') : new Map();
  const rankedTests = enabledTests(interview, test => test.ranked);
  const allResultsComplete = enriched.length > 0 && enriched.every(row => rankedTests.every(test => {
    if (test.key === 'kraepelin') return row.kraepelinEval != null;
    if (test.key === 'math') return row.math != null;
    if (test.key === 'vietnamese') return row.vietnamese != null;
    if (test.key === 'japanese') return row.japanese != null;
    if (test.key === 'pinboard') return row.pinScoreValue != null;
    return true;
  }));

  const rankedCount = rankedTests.length;
  const ranked = enriched.map(row => {
    const ranks = {
      k: kRank.get(row.no) ?? null,
      math: mathRank.get(row.no) ?? null,
      vietnamese: vietnameseRank.get(row.no) ?? null,
      japanese: japaneseRank.get(row.no) ?? null,
      pin: pinRank.get(row.no) ?? null,
    };
    const scoreByTest = {
      kraepelin: row.kraepelinEval?.total ?? null,
      math: row.math,
      vietnamese: row.vietnamese,
      japanese: row.japanese,
      pinboard: row.pinScoreValue,
    };
    // 入力済みの採点科目だけを合計。ピンボードが翌日実施などで未入力でも、
    // 揃っている科目だけで暫定順位を出せるようにする。
    const enteredScores = rankedTests.map(test => scoreByTest[test.key]).filter(value => value != null);
    const enteredCount = enteredScores.length;
    const rankScore = enteredCount > 0
      ? Number(enteredScores.reduce((sum, value) => sum + value, 0).toFixed(1))
      : null;
    return {
      ...row,
      ranks,
      rankScore,
      rankMax: enteredCount * 100,
      enteredCount,
      rankedCount,
      provisional: !(allResultsComplete && rankedCount > 0),
    };
  });

  const finalRank = rankValues(ranked, row => row.rankScore, 'desc');
  return ranked
    .map(row => ({ ...row, finalRank: finalRank.get(row.no) ?? null }))
    .sort((a, b) => (a.finalRank ?? Number.MAX_SAFE_INTEGER) - (b.finalRank ?? Number.MAX_SAFE_INTEGER) || Number(a.no) - Number(b.no));
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
    button.addEventListener('click', async () => {
      state.activeId = button.dataset.id;
      saveActiveId();
      render();
      const interview = activeInterview();
      if (interview && isTestEnabled(interview, 'kraepelin')) {
        await fetchKraepelin({ automatic: true });
      }
    });
  });
}

function renderTestSettings(interview) {
  const host = $('#active-test-settings');
  if (!host || !interview) return;
  const editable = isAdminUser();
  host.innerHTML = TEST_DEFINITIONS.map(test => `
    <label class="${editable ? '' : 'readonly'}">
      <input type="checkbox" data-test-key="${test.key}" ${isTestEnabled(interview, test.key) ? 'checked' : ''} ${editable ? '' : 'disabled'}>
      ${escapeHtml(test.label)}${test.ranked ? '' : '<small>順位対象外</small>'}
    </label>
  `).join('');
  host.querySelectorAll('[data-test-key]').forEach(input => {
    input.addEventListener('change', () => updateInterviewTestSetting(input.dataset.testKey, input.checked));
  });

  TEST_DEFINITIONS.forEach(test => {
    document.querySelectorAll(`[data-test-col="${test.key}"], [data-test-card="${test.key}"], [data-test-section="${test.key}"]`)
      .forEach(element => element.classList.toggle('hidden', !isTestEnabled(interview, test.key)));
  });
}

function renderMetrics(interview, rows) {
  $('#metric-candidates').textContent = interview.candidates.length;
  $('#metric-kraepelin').textContent = rows.filter(row => row.kraepelin).length;
  $('#metric-math').textContent = rows.filter(row => row.math != null).length;
  $('#metric-pinboard').textContent = rows.filter(row => pinSummary(row.score).complete).length;
  $('#metric-behavior').textContent = rows.filter(row => row.behavior).length;
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
      <div class="score-meta">${note} / 順位 ${value == null ? '-' : rank}</div>
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
  const enabled = grade != null;
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
      <div class="score-meta">${enabled ? (value === '' ? '秒数を入力' : `${Number(value).toFixed(2)}秒`) : '評価後に入力'}</div>
      <div class="score-link-slot"></div>
    </div>
  `;
}

// 総合順位のラベル。全科目そろう前は「仮 第N位」、そろえば「第N位」。
// bare=true のときは接頭・接尾なしの数字だけ（管理画面のバッジ用）に「仮N」。
function rankLabel(row, { bare = false } = {}) {
  if (row.finalRank == null) return bare ? '—' : '未集計';
  if (bare) return row.provisional ? `仮${row.finalRank}` : `${row.finalRank}`;
  return row.provisional ? `仮 第${row.finalRank}位` : `第${row.finalRank}位`;
}

// 「320 / 400点（4/5科目）」の得点行。未入力なら空文字。
function rankScoreText(row) {
  if (row.rankScore == null) return '';
  const suffix = row.provisional ? `（${row.enteredCount}/${row.rankedCount}科目）` : '';
  return `${formatScore(row.rankScore)} / ${row.rankMax}点${suffix}`;
}

function rankSummaryItems(row, interview) {
  const items = {
    kraepelin: ['クレペリン', row.ranks.k],
    math: ['数学', row.ranks.math],
    vietnamese: ['ベトナム国語', row.ranks.vietnamese],
    japanese: ['日本語単語', row.ranks.japanese],
    pinboard: ['ピンボード', row.ranks.pin],
  };
  return enabledTests(interview, test => test.ranked).map(test => items[test.key]).filter(Boolean);
}

function rankSummary(row, interview) {
  return rankSummaryItems(row, interview).map(([label, rank]) => `${label}：${rank ?? '-'}位`).join(' / ');
}

function rankSummaryHtml(row, interview) {
  return rankSummaryItems(row, interview)
    .map(([label, rank]) => `<span><b>${escapeHtml(label)}</b>${rank ?? '-'}位</span>`)
    .join('');
}

function renderPrintReport(interview, rows) {
  const report = $('#print-report');
  if (!report || !interview) return;
  const today = new Date().toLocaleDateString('ja-JP');
  const interviewDate = interview.date
    ? new Date(`${interview.date}T00:00:00`).toLocaleDateString('ja-JP')
    : '-';
  const rankedTests = enabledTests(interview, test => test.ranked);
  const behaviorAppendix = isTestEnabled(interview, 'behavior') ? `
    <section class="print-behavior-section">
      <h2>行動選択テスト結果</h2>
      <p class="print-behavior-note">回答から見られる行動傾向を面接時の参考資料として記載しています。総合順位には反映していません。</p>
      <div class="print-behavior-grid">
        ${rows.map(row => {
          const items = behaviorAnswerItems(row.behavior);
          return `<article class="print-behavior-card">
            <h3>${escapeHtml(candidateLabel(row))} ${escapeHtml(row.name || '氏名未入力')} — ${escapeHtml(behaviorSummary(row.behavior))}</h3>
            <p class="print-behavior-summary"><strong>一言コメント：</strong>${escapeHtml(behaviorTendencyComment(row.behavior))}</p>
            ${items.map(item => `<div class="pb-item">
              <p class="pb-q"><strong>設問${item.number}</strong>　${escapeHtml(item.question)}</p>
              <p class="pb-choice"><strong>選んだ回答：</strong>${escapeHtml(item.choice)}</p>
              <p class="pb-analysis">${escapeHtml(item.analysis)}</p>
            </div>`).join('') || '<p>未受験</p>'}
          </article>`;
        }).join('')}
      </div>
    </section>
  ` : '';
  report.innerHTML = `
    <header class="print-header">
      <div class="print-brand">
        <img src="assets/grop-vietnam-logo.png" alt="GROP VIETNAM">
        <div class="print-title-block">
          <div class="print-label">PRE-INTERVIEW TEST RESULTS</div>
          <h1>事前テスト結果</h1>
        </div>
      </div>
      <div class="print-document-meta">
        <span>社内資料</span>
        <strong>作成日 ${today}</strong>
      </div>
    </header>
    ${isTestEnabled(interview, 'pinboard') ? `<div class="print-pin-legend" aria-label="ピンボード評価基準">
      <b>ピンボード評価<i>評価90点（◎3・○2・△1・×0の2回合計÷6）＋時間10点（最速者÷本人の合計時間）</i></b>
      ${PIN_GRADES.map(grade => `<span><strong>${grade.symbol}</strong><em>${grade.label}<i>${grade.detail}</i></em></span>`).join('')}
    </div>` : ''}
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
        ${rankedTests.map(test => `<col class="${test.key === 'kraepelin' ? 'print-col-kraepelin' : test.key === 'pinboard' ? 'print-col-pin' : 'print-col-score'}">`).join('')}
        <col class="print-col-subject-rank">
        <col class="print-col-note">
      </colgroup>
      <thead>
        <tr>
          <th>総合結果</th>
          <th>候補者</th>
          ${rankedTests.map(test => `<th>${escapeHtml(test.label)}</th>`).join('')}
          <th>科目順位</th>
          <th>総合所見</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const pin = pinSummary(row.score);
          return `
            <tr>
              <td class="print-rank">
                <strong>${escapeHtml(rankLabel(row))}</strong>
                ${rankScoreText(row) ? `<span>${escapeHtml(rankScoreText(row))}</span>` : ''}
              </td>
              <td class="print-candidate">
                <div class="print-candidate-inner">
                  ${row.photo ? `<img class="print-photo" src="${escapeHtml(row.photo)}" alt="">` : '<div class="print-photo print-photo-empty">写真なし</div>'}
                  <div class="print-candidate-copy">
                    <span class="print-candidate-no">${escapeHtml(candidateLabel(row))}</span>
                    <strong>${escapeHtml(row.name || '氏名未入力')}</strong>
                  </div>
                </div>
              </td>
              ${isTestEnabled(interview, 'kraepelin') ? `<td class="print-kraepelin">${row.kraepelinEval ? `<strong>${formatScore(row.kraepelinEval.total)}点</strong><span>正答 ${row.kraepelinTotal} ／ 誤答 ${formatPercent(row.kSummary.errorRate)}</span>` : '<span>未取得</span>'}</td>` : ''}
              ${isTestEnabled(interview, 'math') ? `<td class="print-score">${row.math == null ? '<span>-</span>' : `<strong>${formatScore(row.math)}</strong><span>点</span>`}</td>` : ''}
              ${isTestEnabled(interview, 'vietnamese') ? `<td class="print-score">${row.vietnamese == null ? '<span>-</span>' : `<strong>${formatScore(row.vietnamese)}</strong><span>点</span>`}</td>` : ''}
              ${isTestEnabled(interview, 'japanese') ? `<td class="print-score">${row.japanese == null ? '<span>-</span>' : `<strong>${formatScore(row.japanese)}</strong><span>点（${row.japaneseRaw}/30）</span>`}</td>` : ''}
              ${isTestEnabled(interview, 'pinboard') ? `<td class="print-pin">
                <span>1回目　${escapeHtml(pinAttemptText(pin.grades[0], pin.times[0]))}</span>
                <span>2回目　${escapeHtml(pinAttemptText(pin.grades[1], pin.times[1]))}</span>
                ${row.pinScoreValue != null ? `<span>得点　${formatScore(row.pinScoreValue)}点</span>` : ''}
              </td>` : ''}
              <td class="print-subject-rank">${rankSummaryHtml(row, interview)}</td>
              <td class="print-note">${escapeHtml(overallComment(row, interview))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <footer class="print-footer">
      <span>評価基準：${escapeHtml(rankedTests.map(test => test.label).join('・'))}の各100点満点、合計${rankedTests.length * 100}点で総合順位を算出${rows.some(row => row.provisional && row.finalRank != null) ? '（現在は暫定順位：未入力の科目を除いて算出）' : ''}</span>
      <span>${escapeHtml(formatInterviewName(interview))}</span>
    </footer>
    ${behaviorAppendix}
  `;
}

function renderLinkSheet(interview) {
  const sheet = $('#link-sheet');
  if (!sheet || !interview) return;
  $('#link-sheet-title').textContent = formatInterviewName(interview);
  const candidates = [...(interview.candidates || [])].sort((a, b) => Number(a.no) - Number(b.no));
  const onlineTests = enabledTests(interview, test => test.online);
  $('#link-sheet-body').innerHTML = candidates.map(candidate => {
    const urls = {
      kraepelin: kraepelinUrl(interview, candidate),
      math: mathTestUrl(interview, candidate),
      vietnamese: vietnameseTestUrl(interview, candidate),
      behavior: behaviorTestUrl(interview, candidate),
    };
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
          ${onlineTests.map((test, index) => {
            const targetUrl = urls[test.key];
            return `<div class="qr-box">
              <div class="qr-step"><span>${index + 1}</span>${escapeHtml(test.label)}</div>
              <img src="${escapeHtml(qrImageUrl(targetUrl))}" alt="${escapeHtml(test.label)}QR">
              <div class="qr-actions">
                <button class="qr-action copy-test-url" type="button" data-url="${escapeHtml(targetUrl)}"><i data-lucide="copy"></i>URLコピー</button>
                <a class="qr-action" href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>開く</a>
              </div>
            </div>`;
          }).join('') || '<p>オンライン受験テストはありません。</p>'}
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

function openBehaviorDetail(candidateId) {
  const interview = activeInterview();
  const candidate = interview?.candidates.find(item => item.id === candidateId);
  const record = candidate ? getBehaviorFor(candidate, interview) : null;
  if (!candidate || !record) return;
  const items = behaviorAnswerItems(record);
  $('#behavior-dialog-title').textContent = `${candidateLabel(candidate)} ${candidate.name || '氏名未入力'}`;
  $('#behavior-dialog-body').innerHTML = `
    <div class="behavior-tendency-summary">
      <strong>一言コメント</strong>
      <p>${escapeHtml(behaviorTendencyComment(record))}</p>
      <small>${escapeHtml(behaviorSummary(record))}。この結果は総合順位には反映しません。</small>
    </div>
    ${items.map(item => `
      <section class="behavior-answer">
        <h3>設問${item.number}</h3>
        <p><strong>選択：</strong>${escapeHtml(item.choice)}</p>
        <p class="analysis"><strong>行動傾向：</strong>${escapeHtml(item.analysis)}</p>
      </section>
    `).join('') || '<p>回答データがありません。</p>'}
  `;
  const dialog = $('#behavior-dialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  if (window.lucide) lucide.createIcons();
}

function renderTable(interview) {
  const rows = buildRows(interview);
  const body = $('#score-body');
  const canDeleteCandidates = isAdminUser();
  body.innerHTML = rows.map(row => {
    const pin = pinSummary(row.score);
    const rankClass = row.finalRank != null && row.finalRank <= 3 ? 'rank top' : 'rank';
    const kraepelinResult = row.kraepelinEval == null
      ? '<span class="status-pill missing">未取得</span>'
      : `<span class="status-pill ok">${row.kraepelinEval.total}</span>
         <div class="mini">順位 ${row.ranks.k} / 正答 ${row.kraepelinTotal} / 誤答 ${formatPercent(row.kSummary.errorRate)}</div>
         <div class="mini">作業 ${row.kraepelinEval.work}・正確 ${row.kraepelinEval.accuracy}・安定 ${row.kraepelinEval.stability} / ${judgmentLabel(row.kSummary.judgment)}</div>
         <div class="comment-text">${kraepelinComment(row.kSummary, row.kraepelinEval)}</div>`;
    const kraepelinCell = `${kraepelinResult}
      <div class="score-link-slot kraepelin-link-slot">
        <a class="mini-link" href="${escapeHtml(kraepelinUrl(interview, row))}" target="_blank" rel="noopener">受験</a>
      </div>`;
    const nameParts = splitCandidateName(row.name);
    return `
      <tr>
        <td>
          <span class="${rankClass}">${escapeHtml(rankLabel(row, { bare: true }))}</span>
          ${rankScoreText(row) ? `<div class="mini">${escapeHtml(rankScoreText(row))}</div>` : ''}
        </td>
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
        ${isTestEnabled(interview, 'kraepelin') ? `<td class="kraepelin-cell kraepelin-col">${kraepelinCell}</td>` : ''}
        ${isTestEnabled(interview, 'math') ? `<td class="score-entry-table-cell subject-score-col">${subjectScoreCell(row, 'math', row.math, row.ranks.math, { link: mathTestUrl(interview, row) })}</td>` : ''}
        ${isTestEnabled(interview, 'vietnamese') ? `<td class="score-entry-table-cell subject-score-col">${subjectScoreCell(row, 'vietnamese', row.vietnamese, row.ranks.vietnamese, { link: vietnameseTestUrl(interview, row) })}</td>` : ''}
        ${isTestEnabled(interview, 'japanese') ? `<td class="score-entry-table-cell subject-score-col">${subjectScoreCell(row, 'japanese', row.japanese, row.ranks.japanese, { max: 30, placeholder: '0-30', note: (value, raw) => `${raw || 0}/30 → ${formatScore(value)}点` })}</td>` : ''}
        ${isTestEnabled(interview, 'pinboard') ? `<td class="score-entry-table-cell pin-grade-col">${pinGradeControl(row, 1)}</td>
        <td class="score-entry-table-cell pin-time-col">${pinTimeInput(row, 1)}</td>
        <td class="score-entry-table-cell pin-grade-col">${pinGradeControl(row, 2)}</td>
        <td class="score-entry-table-cell pin-time-col">${pinTimeInput(row, 2)}</td>
        <td class="pin-rank-col">
          ${row.ranks.pin ?? '-'}
          <div class="mini">
            ${pin.enteredCount}/2回入力
            ${pin.complete && pin.time > 0 ? ` / ${pin.time.toFixed(2)}秒` : ''}
            ${row.pinScoreValue != null ? ` / ${formatScore(row.pinScoreValue)}点` : ''}
          </div>
        </td>` : ''}
        ${isTestEnabled(interview, 'behavior') ? `<td class="behavior-cell behavior-col">
          <span class="status-pill ${row.behavior ? 'ok' : 'missing'}">${row.behavior ? '受験済み' : '未受験'}</span>
          <div class="behavior-tendency-brief">${escapeHtml(behaviorTendencyComment(row.behavior))}</div>
          ${row.behavior ? `<button type="button" class="btn behavior-detail-btn" data-id="${row.id}">回答傾向を見る</button>` : `<a class="mini-link" href="${escapeHtml(behaviorTestUrl(interview, row))}" target="_blank" rel="noopener">受験</a>`}
        </td>` : ''}
        <td class="subject-rank-col"><span class="rank-list">${rankSummaryHtml(row, interview)}</span></td>
        <td class="candidate-delete-cell">${canDeleteCandidates ? `<button class="icon-btn danger remove-candidate" data-id="${row.id}" title="候補者を削除" aria-label="${escapeHtml(candidateLabel(row))} ${escapeHtml(row.name || '')}を削除"><i data-lucide="trash-2"></i></button>` : ''}</td>
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
  body.querySelectorAll('.behavior-detail-btn').forEach(button => {
    button.addEventListener('click', () => openBehaviorDetail(button.dataset.id));
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
  $('#open-kraepelin').classList.toggle('hidden', hasInterview && !isTestEnabled(interview, 'kraepelin'));
  $('#refresh-kraepelin').classList.toggle('hidden', hasInterview && !isTestEnabled(interview, 'kraepelin'));
  $('#open-kraepelin').disabled = !hasInterview || !isTestEnabled(interview, 'kraepelin');
  $('#refresh-kraepelin').disabled = !hasInterview || !isTestEnabled(interview, 'kraepelin');
  renderKraepelinSyncStatus();
  $('#open-link-sheet').disabled = !hasInterview;
  $('#print-pdf').classList.toggle('hidden', !isAdmin);
  $('#export-csv').classList.toggle('hidden', !isAdmin);
  $('#print-pdf').disabled = !hasInterview;
  $('#export-csv').disabled = !hasInterview;
  $('#interview-form button[type="submit"]').disabled = !state.dbReady || !isAdmin;
  if (hasInterview) {
    renderTestSettings(interview);
    renderTable(interview);
  }
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
  const selectedTestKeys = [...document.querySelectorAll('input[name="create-test"]:checked')].map(input => input.value);
  if (!selectedTestKeys.length) {
    alert('実施するテストを1つ以上選んでください。');
    return;
  }
  const testSettings = Object.fromEntries(TEST_DEFINITIONS.map(test => [test.key, selectedTestKeys.includes(test.key)]));

  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({ interview_date: date, company, sender_org: senderOrg, test_settings: testSettings })
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
  document.querySelectorAll('input[name="create-test"]').forEach(input => { input.checked = true; });
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
  if (nextGrade == null) update[timeColumn] = null;

  const { error } = await supabase.from('interview_candidates').update(update).eq('id', id);
  if (error) {
    alert('ピン評価の保存に失敗しました: ' + error.message);
    return;
  }

  const score = ensureScore(candidate);
  score[gradeField] = nextGrade ?? '';
  if (nextGrade == null) score[timeField] = '';
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

async function updateInterviewTestSetting(key, enabled) {
  const interview = activeInterview();
  if (!interview || !isAdminUser() || !TEST_DEFINITIONS.some(test => test.key === key)) return;
  const nextSettings = { ...normalizeTestSettings(interview.testSettings), [key]: !!enabled };
  if (!Object.values(nextSettings).some(Boolean)) {
    alert('実施するテストを1つ以上選んでください。');
    renderTestSettings(interview);
    return;
  }
  const { error } = await supabase
    .from('interview_sessions')
    .update({ test_settings: nextSettings })
    .eq('id', interview.id);
  if (error) {
    alert('テスト設定の保存に失敗しました: ' + error.message);
    renderTestSettings(interview);
    return;
  }
  interview.testSettings = nextSettings;
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

async function fetchKraepelin(options = {}) {
  const automatic = options?.automatic === true;
  if (kraepelinFetchInFlight) return;
  if (typeof supabase === 'undefined') {
    if (!automatic) alert('Supabase設定を読み込めません');
    return;
  }
  const interview = activeInterview();
  if (!interview) return;
  kraepelinFetchInFlight = true;
  try {
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
      if (automatic) {
        state.error = 'クレペリン結果の自動取得に失敗しました。再読込ボタンを押してください。';
        render();
      } else {
        alert('クレペリン結果の取得に失敗しました: ' + error.message);
      }
      return;
    }
    if (activeInterview()?.id !== interview.id) return;
    const byId = new Map();
    [...(sessionResp.data || []), ...(legacyResp.data || []), ...(unassignedResp.data || [])].forEach(record => {
      byId.set(record.id, record);
    });
    state.kraepelinRecords = [...byId.values()];
    await attachUnassignedKraepelin();
    if (state.error.startsWith('クレペリン結果の自動取得')) state.error = '';
    state.kraepelinLastFetchedAt = Date.now();
    render();
  } finally {
    kraepelinFetchInFlight = false;
  }
}

function shouldAutoFetchKraepelin() {
  const interview = activeInterview();
  return isAuthed() && !!interview && isTestEnabled(interview, 'kraepelin') && document.visibilityState === 'visible';
}

function startKraepelinPolling() {
  setInterval(() => {
    if (shouldAutoFetchKraepelin()) fetchKraepelin({ automatic: true });
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && shouldAutoFetchKraepelin()) {
      fetchKraepelin({ automatic: true });
    }
  });
}

function formatSyncTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderKraepelinSyncStatus() {
  const el = $('#kraepelin-sync-status');
  if (!el) return;
  const interview = activeInterview();
  const show = !!interview && isTestEnabled(interview, 'kraepelin');
  el.classList.toggle('hidden', !show);
  el.textContent = show && state.kraepelinLastFetchedAt ? `最終取得 ${formatSyncTime(state.kraepelinLastFetchedAt)}` : '';
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
  const headers = ['総合結果', '総合得点', '満点', '候補者番号', '氏名・メモ'];
  if (isTestEnabled(interview, 'kraepelin')) headers.push('クレペリン評価点', 'クレペリン正答数', 'クレペリン誤答率', 'クレペリン判定', 'クレペリン備考');
  if (isTestEnabled(interview, 'math')) headers.push('数学', '数学順位');
  if (isTestEnabled(interview, 'vietnamese')) headers.push('ベトナム国語', 'ベトナム国語順位');
  if (isTestEnabled(interview, 'japanese')) headers.push('日本語単語正答数', '日本語単語100点換算', '日本語単語順位');
  if (isTestEnabled(interview, 'pinboard')) headers.push('ピン1評価', 'ピン1時間', 'ピン2評価', 'ピン2時間', 'ピン順位', 'ピンボード点');
  if (isTestEnabled(interview, 'behavior')) headers.push('行動選択受験状況', '行動選択所要秒', '行動選択回答傾向');
  headers.push('科目順位');
  const rows = buildRows(interview).map(row => {
    const pin = pinSummary(row.score);
    const values = [
      rankLabel(row),
      row.rankScore == null ? '' : formatScore(row.rankScore),
      row.rankMax,
      row.no,
      row.name || '',
    ];
    if (isTestEnabled(interview, 'kraepelin')) values.push(
      row.kraepelinEval?.total ?? '', row.kraepelinTotal ?? '',
      row.kSummary?.errorRate == null ? '' : formatPercent(row.kSummary.errorRate),
      judgmentLabel(row.kSummary?.judgment), overallComment(row, interview)
    );
    if (isTestEnabled(interview, 'math')) values.push(row.math ?? '', row.ranks.math ?? '');
    if (isTestEnabled(interview, 'vietnamese')) values.push(row.vietnamese ?? '', row.ranks.vietnamese ?? '');
    if (isTestEnabled(interview, 'japanese')) values.push(row.japaneseRaw ?? '', row.japanese ?? '', row.ranks.japanese ?? '');
    if (isTestEnabled(interview, 'pinboard')) values.push(
      pinAttemptText(pin.grades[0], null),
      pin.grades[0] != null && pin.times[0] != null ? pin.times[0].toFixed(2) : '',
      pinAttemptText(pin.grades[1], null),
      pin.grades[1] != null && pin.times[1] != null ? pin.times[1].toFixed(2) : '',
      row.ranks.pin ?? '',
      row.pinScoreValue == null ? '' : formatScore(row.pinScoreValue)
    );
    if (isTestEnabled(interview, 'behavior')) values.push(
      row.behavior ? '受験済み' : '未受験',
      row.behavior?.duration_seconds ?? '',
      behaviorTendencyComment(row.behavior)
    );
    values.push(rankSummary(row, interview));
    return values;
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
startKraepelinPolling();
