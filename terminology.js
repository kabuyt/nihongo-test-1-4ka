const TERM_STORAGE_KEY = 'kinreiTerminologyProgress:v1';
const TEST_STORAGE_KEY = 'kinreiTerminologyTestSets:v1';
const QUIZ_SET_SIZE = 10;
const TERM_OVERRIDES = {
  'kinrei-mono-041': { display: '生産表', reading: 'せいさんひょう' },
  'kinrei-mono-103': { display: '済み・未', reading: 'ずみ・み' },
  'kinrei-ingredients-001': { display: '麺、そば、うどん、ラーメン、きし麺', reading: 'めん、そば、うどん、ラーメン、きしめん' },
  'kinrei-ingredients-015': { display: 'ネギ、九条ネギ、青ネギ、白ネギ', reading: 'ねぎ、くじょうねぎ、あおねぎ、しろねぎ' },
  'kinrei-ingredients-041': { display: 'さば粉', reading: 'さばこ' },
  'kinrei-ingredients-051': { display: '麩、仙台麩', reading: 'ふ、せんだいふ' },
  'kinrei-ingredients-057': { display: 'のり、焼き海苔', reading: 'のり、やきのり' },
  'kinrei-verbs-031': { display: '混入します', reading: 'こんにゅうします' },
  'kinrei-positions-024': { display: 'ダシ入り口', reading: 'だしいりぐち' },
  'kinrei-positions-026': { display: '箱盛り', reading: 'はこもり' },
  'kinrei-positions-027': { display: '盛り付け', reading: 'もりつけ' },
  'kinrei-positions-028': { display: 'はかり使用有り', reading: 'はかりしようあり' },
  'kinrei-positions-029': { display: 'タイマー使用有り', reading: 'たいまーしようあり' },
  'kinrei-positions-031': { display: 'トレー調整', reading: 'とれーちょうせい' },
  'kinrei-positions-037': { display: 'トレー流し', reading: 'とれーながし' },
  'kinrei-positions-041': { display: '小袋', reading: 'こぶくろ' },
  'kinrei-positions-042': { display: '具チェック', reading: 'ぐちぇっく' },
  'kinrei-positions-043': { display: '外袋', reading: 'がいぶくろ' },
  'kinrei-positions-045': { display: '向き替え', reading: 'むきかえ' },
  'kinrei-positions-048': { display: '箱入れ', reading: 'はこいれ' },
  'kinrei-positions-052': { display: 'スープ出し', reading: 'すーぷだし' },
  'kinrei-positions-053': { display: 'スープ入れ', reading: 'すーぷいれ' },
  'kinrei-positions-054': { display: 'スープ運び', reading: 'すーぷはこび' },
  'kinrei-positions-055': { display: '押さえ', reading: 'おさえ' },
  'kinrei-positions-021': { display: 'ごみ場', reading: 'ごみば' },
  'kinrei-positions-023': { display: '洗い場', reading: 'あらいば' },
  'kinrei-positions-032': { display: '具出し', reading: 'ぐだし' },
  'kinrei-positions-034': { display: '入り口', reading: 'いりぐち' },
  'kinrei-positions-049': { display: '箱作り', reading: 'はこづくり' },
  'kinrei-mono-066': { display: 'お湯', reading: 'おゆ' },
  'kinrei-mono-107': { display: '刃こぼれ', reading: 'はこぼれ' },
  'kinrei-ingredients-005': { display: '玉ねぎ', reading: 'たまねぎ' },
  'kinrei-ingredients-006': { display: 'ごま油', reading: 'ごまあぶら' },
  'kinrei-ingredients-027': { display: 'ごま油', reading: 'ごまあぶら' },
  'kinrei-ingredients-018': { display: 'ちんげん菜', reading: 'ちんげんさい' },
  'kinrei-ingredients-035': { display: 'ほうれん草', reading: 'ほうれんそう' },
  'kinrei-ingredients-046': { display: 'さつま揚げ', reading: 'さつまあげ' },
  'kinrei-ingredients-074': { display: '牛もつ', reading: 'ぎゅうもつ' },
  'kinrei-ingredients-081': { display: 'なま肉', reading: 'なまにく' },
};

let termState = {
  terms: [],
  filtered: [],
  progress: {},
  currentIndex: 0,
  quizSetIndex: 0,
  imageCardIndex: 0,
  flipped: false,
  imageCardFlipped: false,
  quiz: null,
  profile: null,
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function isKinreiProfile(profile) {
  const studentId = String(profile?.student_id || '').toUpperCase();
  if (studentId === 'GRV001') return true;
  const company = String(profile?.company || '').toLowerCase();
  const group = String(profile?.class_group || '').toLowerCase();
  return company.includes('キンレイ') || company.includes('kinrei') || group.includes('キンレイ') || group.includes('kinrei');
}

async function terminologyLogout() {
  await supabase.auth.signOut();
  window.location.href = 'terminology-login.html';
}

async function checkTerminologyAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'terminology-login.html';
    return null;
  }

  const { data, error } = await supabase
    .from('trainees')
    .select('id, student_id, name_katakana, name_romaji, company, class_group, organization_id, auth_user_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !data) {
    await supabase.auth.signOut();
    window.location.href = 'terminology-login.html';
    return null;
  }

  if (!isKinreiProfile(data)) {
    document.body.innerHTML = `
      <header><h1>キンレイ専門用語</h1><p>Từ vựng chuyên ngành Kinrei</p></header>
      <main class="term-wrap">
        <section class="term-hero">
          <div>
            <h2>この学習ページはキンレイ実習生専用です</h2>
            <p>対象者ではないため利用できません。必要な場合は管理者に確認してください。</p>
          </div>
        </section>
        <button class="btn-logout" onclick="terminologyLogout()">ログアウト</button>
      </main>
    `;
    return null;
  }

  return { session, profile: data };
}

function localKey() {
  const id = termState.profile?.student_id || 'guest';
  return `${TERM_STORAGE_KEY}:${id}`;
}

function loadLocalProgress() {
  try {
    return JSON.parse(localStorage.getItem(localKey()) || '{}');
  } catch (_) {
    return {};
  }
}

function saveLocalProgress() {
  localStorage.setItem(localKey(), JSON.stringify(termState.progress));
}

function testSetKey() {
  const id = termState.profile?.student_id || 'guest';
  return `${TEST_STORAGE_KEY}:${id}`;
}

function loadCompletedTestSets() {
  try {
    return new Set(JSON.parse(localStorage.getItem(testSetKey()) || '[]'));
  } catch (_) {
    return new Set();
  }
}

function saveCompletedTestSet(setNumber) {
  const completed = loadCompletedTestSets();
  completed.add(setNumber);
  localStorage.setItem(testSetKey(), JSON.stringify([...completed].sort((a, b) => a - b)));
}

function getProgress(termId) {
  return termState.progress[termId] || { status: 'new', attempts: 0, correct: 0 };
}

async function loadSupabaseProgress() {
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_progress')
      .select('term_id,status,correct_count,wrong_count,last_studied_at')
      .eq('trainee_id', termState.profile.id);
    if (error || !data) return;
    data.forEach(item => {
      const local = getProgress(item.term_id);
      termState.progress[item.term_id] = {
        ...local,
        status: item.status || local.status,
        correct: Math.max(local.correct || 0, item.correct_count || 0),
        attempts: Math.max(local.attempts || 0, (item.correct_count || 0) + (item.wrong_count || 0)),
        updatedAt: item.last_studied_at || local.updatedAt,
      };
    });
    saveLocalProgress();
  } catch (err) {
    console.warn('progress load skipped', err);
  }
}

async function saveProgress(termId, status) {
  const current = getProgress(termId);
  termState.progress[termId] = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  saveLocalProgress();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_progress').upsert({
      trainee_id: termState.profile.id,
      term_id: termId,
      status,
      correct_count: termState.progress[termId].correct || 0,
      wrong_count: Math.max((termState.progress[termId].attempts || 0) - (termState.progress[termId].correct || 0), 0),
      last_studied_at: new Date().toISOString(),
    }, { onConflict: 'trainee_id,term_id' });
  } catch (err) {
    console.warn('progress save skipped', err);
  }
}

function updateQuizProgress(termId, isCorrect) {
  const current = getProgress(termId);
  termState.progress[termId] = {
    ...current,
    attempts: (current.attempts || 0) + 1,
    correct: (current.correct || 0) + (isCorrect ? 1 : 0),
    status: isCorrect ? 'learned' : 'review',
    updatedAt: new Date().toISOString(),
  };
  saveLocalProgress();
  saveProgress(termId, termState.progress[termId].status);
}

function statusLabel(status) {
  return {
    new: '未学習 / Chưa học',
    learning: '学習中 / Đang học',
    learned: '覚えた / Đã nhớ',
    review: '要復習 / Cần ôn',
  }[status || 'new'] || status;
}

function readingForTerm(term) {
  if (TERM_OVERRIDES[term.id]?.reading) return TERM_OVERRIDES[term.id].reading;
  const verb = parseVerbReading(term.term);
  if (verb) return verb.reading;
  const text = String(term.term || '').trim();
  if (!text) return '';
  const inlineReading = collectHiraganaParts(text);
  const kanaReading = cleanKanaReading(term.kana);
  if (inlineReading.length) {
    const joined = inlineReading.join('・');
    return shouldPreferKanaReading(text, joined, kanaReading) ? katakanaToHiragana(kanaReading) : joined;
  }
  if (isKatakanaOnly(text)) return katakanaToHiragana(text);
  return kanaReading ? katakanaToHiragana(kanaReading) : '';
}

function displayTermForTerm(term) {
  if (TERM_OVERRIDES[term.id]?.display) return TERM_OVERRIDES[term.id].display;
  const verb = parseVerbReading(term.term);
  if (verb) return verb.display;
  const text = String(term.term || '').trim();
  if (!hasKanji(text)) return text;
  return [...text].filter(ch => !isHiragana(ch)).join('').replace(/\s+/g, ' ').trim();
}

function isHiragana(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 0x3041 && cp <= 0x3096;
}

function parseVerbReading(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.+ます)([ぁ-ん]+)$/);
  if (!match || !hasKanji(match[1])) return null;
  const display = match[1];
  const suffix = collectTrailingHiragana(display);
  let stem = match[2];
  if (suffix && stem.endsWith(suffix[0])) stem = stem.slice(0, -1);
  return { display, reading: `${stem}${suffix}` };
}

function collectTrailingHiragana(value) {
  let suffix = '';
  for (const ch of [...String(value || '')].reverse()) {
    if (!isHiragana(ch)) break;
    suffix = ch + suffix;
  }
  return suffix;
}

function isKatakana(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x30a1 && cp <= 0x30fa) || cp === 0x30fc;
}

function hasKanji(text) {
  return [...text].some(ch => {
    const cp = ch.codePointAt(0);
    return (cp >= 0x4e00 && cp <= 0x9fff) || cp === 0x3005;
  });
}

function isKatakanaOnly(text) {
  const chars = [...text].filter(ch => !/[\s・（）()、,]/.test(ch));
  return chars.length > 0 && chars.every(isKatakana);
}

function cleanKanaReading(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const chars = [...text].filter(ch => !/[\s・（）()、,]/.test(ch));
  return chars.length > 0 && chars.every(isKatakana) ? text : '';
}

function shouldPreferKanaReading(termText, inlineReading, kanaReading) {
  if (!kanaReading) return false;
  if (!inlineReading) return true;
  if (normalizeReading(inlineReading) !== normalizeReading(katakanaToHiragana(kanaReading))) return true;
  if (inlineReading.length <= 2 && kanaReading.length > inlineReading.length) return true;
  if (hasKanji(termText) && /[\u30a1-\u30fa]/.test(termText) && kanaReading.length > inlineReading.length) return true;
  return false;
}

function katakanaToHiragana(value) {
  return [...String(value || '')].map(ch => {
    const cp = ch.codePointAt(0);
    if (cp >= 0x30a1 && cp <= 0x30f6) return String.fromCodePoint(cp - 0x60);
    return ch;
  }).join('');
}

function normalizeReading(value) {
  return String(value || '').replace(/[\s・（）()、,]/g, '').toLowerCase();
}

function collectHiraganaParts(text) {
  const parts = [];
  let current = '';
  for (const ch of text) {
    if (isHiragana(ch)) {
      current += ch;
    } else if (current) {
      parts.push(current);
      current = '';
    }
  }
  if (current) parts.push(current);
  return parts;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderStats() {
  const values = Object.values(termState.progress);
  const learned = values.filter(item => item.status === 'learned').length;
  const review = values.filter(item => item.status === 'review').length;
  const attempts = values.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = values.reduce((sum, item) => sum + (item.correct || 0), 0);
  document.getElementById('statLearned').textContent = learned;
  document.getElementById('statReview').textContent = review;
  document.getElementById('statRate').textContent = attempts ? `${Math.round((correct / attempts) * 100)}%` : '0%';
}

function applyFilters() {
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;
  const query = document.getElementById('termSearch').value.trim().toLowerCase();

  termState.filtered = termState.terms.filter(term => {
    const progress = getProgress(term.id);
    if (category && term.category !== category) return false;
    if (status && progress.status !== status) return false;
    if (!query) return true;
    return [term.term, term.kana, term.meaningVi, term.category]
      .some(value => String(value || '').toLowerCase().includes(query));
  });
  if (termState.currentIndex >= termState.filtered.length) termState.currentIndex = 0;
  termState.flipped = false;
  renderCard();
  renderList();
  renderQuizOverview();
}

function renderCard() {
  const card = document.getElementById('termCard');
  card.classList.toggle('flipped', termState.flipped);
  document.getElementById('cardTerm').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardKana').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardMeaning').style.display = termState.flipped ? '' : 'none';
  document.getElementById('cardSideLabel').textContent = termState.flipped
    ? 'ベトナム語の意味 / Nghĩa tiếng Việt'
    : '日本語 / Tiếng Nhật';
  document.getElementById('cardHint').textContent = termState.flipped
    ? '覚えたら「覚えた」を押します / Nhớ rồi thì bấm “Đã nhớ”'
    : 'カードをタップしてください / Bấm vào thẻ';

  if (!termState.filtered.length) {
    document.getElementById('cardCategory').textContent = '-';
    document.getElementById('cardTerm').textContent = '該当する用語がありません';
    document.getElementById('cardKana').textContent = '';
    document.getElementById('cardMeaning').textContent = '-';
    return;
  }

  const term = termState.filtered[termState.currentIndex];
  const reading = readingForTerm(term);
  if (getProgress(term.id).status === 'new') {
    termState.progress[term.id] = { ...getProgress(term.id), status: 'learning', updatedAt: new Date().toISOString() };
    saveLocalProgress();
  }
  document.getElementById('cardCategory').textContent = term.category;
  document.getElementById('cardTerm').textContent = displayTermForTerm(term);
  document.getElementById('cardKana').textContent = reading ? `Cách đọc: ${reading}` : '';
  document.getElementById('cardMeaning').textContent = term.meaningVi;
  renderStats();
}

function renderList() {
  document.getElementById('visibleCount').textContent = `${termState.filtered.length}語`;
  const list = document.getElementById('termList');
  list.innerHTML = termState.filtered.map((term, index) => {
    const progress = getProgress(term.id);
    const reading = readingForTerm(term);
    return `
      <button type="button" class="term-row ${index === termState.currentIndex ? 'active' : ''}" data-index="${index}">
        <span>
          <strong>${esc(displayTermForTerm(term))}</strong>
          ${reading ? `<small class="term-reading">Cách đọc: ${esc(reading)}</small>` : ''}
          <small>${esc(term.meaningVi)}</small>
        </span>
        <em class="status-pill status-${esc(progress.status)}">${esc(statusLabel(progress.status))}</em>
      </button>
    `;
  }).join('');
  list.querySelectorAll('.term-row').forEach(row => {
    row.addEventListener('click', () => {
      termState.currentIndex = Number(row.dataset.index);
      termState.flipped = false;
      renderCard();
      renderList();
    });
  });
}

function getUnifiedTestItems() {
  const wordItems = termState.terms.map(term => ({
    type: 'word',
    id: term.id,
    prompt: displayTermForTerm(term),
    reading: readingForTerm(term),
    answer: term.meaningVi,
    source: term,
  }));
  const imageItems = getImageItems().map(item => ({
    type: 'image',
    id: item.id,
    prompt: item.term,
    reading: item.reading,
    answer: item.term,
    image: item.image,
    source: item,
  }));
  return [...wordItems, ...imageItems];
}

function getQuizSets() {
  const pool = getUnifiedTestItems();
  const sets = [];
  for (let i = 0; i < pool.length; i += QUIZ_SET_SIZE) {
    sets.push(pool.slice(i, i + QUIZ_SET_SIZE));
  }
  return sets;
}

function renderQuizOverview() {
  const select = document.getElementById('quizSetSelect');
  const summary = document.getElementById('quizSetSummary');
  if (!select || !summary) return;

  const sets = getQuizSets();
  if (termState.quizSetIndex >= sets.length) termState.quizSetIndex = 0;
  const completedSetNumbers = loadCompletedTestSets();
  const completed = [...completedSetNumbers].filter(n => n >= 1 && n <= sets.length).length;

  select.innerHTML = sets.map((set, index) => {
    const start = index * QUIZ_SET_SIZE + 1;
    const end = start + set.length - 1;
    const done = completedSetNumbers.has(index + 1) ? ' ✓' : '';
    return `<option value="${index}">第${index + 1}回（${start}-${end}問）${done}</option>`;
  }).join('');
  select.value = String(termState.quizSetIndex);
  summary.textContent = sets.length
    ? `全${sets.length}回・完了${completed}回 / ${sets.length} lần, xong ${completed}`
    : 'テストできる単語がありません';
  const progressRate = sets.length ? Math.round((completed / sets.length) * 100) : 0;
  document.getElementById('testProgressBar').style.width = `${progressRate}%`;
  document.getElementById('testProgressText').textContent = `${completed} / ${sets.length} (${progressRate}%)`;

  const button = document.getElementById('startQuizBtn');
  if (button) button.innerHTML = `第${termState.quizSetIndex + 1}回を始める<br>Bắt đầu lần ${termState.quizSetIndex + 1}`;
}

function getImageItems() {
  return window.KINREI_IMAGE_QUIZ?.items || [];
}

function renderImageCard() {
  const items = getImageItems();
  if (!items.length) return;
  if (termState.imageCardIndex >= items.length) termState.imageCardIndex = 0;
  const item = items[termState.imageCardIndex];
  document.getElementById('imageCard').classList.toggle('flipped', termState.imageCardFlipped);
  document.getElementById('imageCardCount').textContent = `${termState.imageCardIndex + 1} / ${items.length}`;
  document.getElementById('imageCardImg').src = item.image;
  document.getElementById('imageCardTerm').textContent = item.term;
  document.getElementById('imageCardReading').textContent = item.reading ? `Cách đọc: ${item.reading}` : '';
  document.getElementById('imageCardAnswer').style.display = termState.imageCardFlipped ? '' : 'none';
  document.getElementById('imageCardSideLabel').textContent = termState.imageCardFlipped
    ? '名前 / Tên'
    : '写真 / Hình ảnh';
  document.getElementById('imageCardHint').textContent = termState.imageCardFlipped
    ? '覚えたら次へ / Nhớ rồi thì bấm tiếp'
    : '写真をタップしてください / Bấm vào hình';
}

function moveImageCard(delta) {
  const items = getImageItems();
  if (!items.length) return;
  termState.imageCardIndex = (termState.imageCardIndex + delta + items.length) % items.length;
  termState.imageCardFlipped = false;
  renderImageCard();
}

function moveCard(delta) {
  if (!termState.filtered.length) return;
  termState.currentIndex = (termState.currentIndex + delta + termState.filtered.length) % termState.filtered.length;
  termState.flipped = false;
  renderCard();
  renderList();
}

function showMode(mode) {
  const test = mode === 'test';
  const image = mode === 'image';
  document.getElementById('cardPanel').classList.toggle('hidden', test || image);
  document.getElementById('testPanel').classList.toggle('hidden', !test);
  document.getElementById('imagePanel').classList.toggle('hidden', !image);
  document.getElementById('wordMemoryModeBtn').classList.toggle('active', !test && !image);
  document.getElementById('imageMemoryModeBtn').classList.toggle('active', image);
  document.getElementById('testModeBtn').classList.toggle('active', test);
  if (image) renderImageCard();
  if (test) renderQuizOverview();
}

function startQuiz() {
  const sets = getQuizSets();
  if (!sets.length) return;
  const questions = sets[termState.quizSetIndex] || sets[0];
  termState.quiz = {
    setNumber: termState.quizSetIndex + 1,
    questions: shuffle(questions),
    index: 0,
    correct: 0,
    answers: [],
    answered: false,
  };
  document.getElementById('quizResult').classList.add('hidden');
  renderQuiz();
}

function renderQuiz() {
  const quiz = termState.quiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishQuiz();
    return;
  }
  const question = quiz.questions[quiz.index];
  const options = question.type === 'image'
    ? shuffle([question, ...shuffle(getUnifiedTestItems().filter(item => item.type === 'image' && item.id !== question.id && item.answer !== question.answer)).slice(0, 3)])
    : shuffle([question, ...shuffle(getUnifiedTestItems().filter(item => item.type === 'word' && item.id !== question.id)).slice(0, 3)]);
  quiz.answered = false;
  document.getElementById('quizNow').textContent = quiz.index + 1;
  document.getElementById('quizTotal').textContent = quiz.questions.length;
  const wordTitle = question.reading
    ? `${esc(question.prompt)}(${esc(question.reading)})`
    : esc(question.prompt);
  document.getElementById('quizPrompt').innerHTML = question.type === 'image'
    ? '写真を見てください<br><small>正しい名前を選んでください / Chọn tên đúng</small>'
    : `${wordTitle}<br><small>正しい意味を選んでください（ベトナム語） / Chọn nghĩa đúng</small>`;
  const img = document.getElementById('quizQuestionImg');
  img.style.display = question.type === 'image' ? '' : 'none';
  if (question.type === 'image') img.src = question.image;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizOptions').innerHTML = options.map(option =>
    `<button type="button" class="quiz-option" data-id="${esc(option.id)}">${esc(option.answer)}${option.type === 'image' && option.reading ? `<br><small>Cách đọc: ${esc(option.reading)}</small>` : ''}</button>`
  ).join('');
  document.querySelectorAll('.quiz-option').forEach(button => button.addEventListener('click', () => answerQuiz(button.dataset.id)));
}

function answerQuiz(selectedId) {
  const quiz = termState.quiz;
  if (!quiz || quiz.answered) return;
  const question = quiz.questions[quiz.index];
  const ok = selectedId === question.id;
  quiz.answered = true;
  quiz.correct += ok ? 1 : 0;
  quiz.answers.push({ type: question.type, id: question.id, correct: ok });
  if (question.type === 'word') updateQuizProgress(question.id, ok);
  document.querySelectorAll('.quiz-option').forEach(button => {
    button.disabled = true;
    if (button.dataset.id === question.id) button.classList.add('correct');
    if (button.dataset.id === selectedId && !ok) button.classList.add('wrong');
  });
  document.getElementById('quizFeedback').textContent = ok ? '正解です / Đúng rồi' : `正解 / Đáp án: ${question.answer}`;
  document.getElementById('nextQuizBtn').disabled = false;
  renderStats();
  renderList();
}

async function finishQuiz() {
  const quiz = termState.quiz;
  if (!quiz) return;
  const rate = quiz.questions.length ? Math.round((quiz.correct / quiz.questions.length) * 100) : 0;
  document.getElementById('quizPrompt').textContent = 'テスト完了 / Hoàn thành';
  document.getElementById('quizOptions').innerHTML = '';
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizQuestionImg').style.display = 'none';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizResult').classList.remove('hidden');
  document.getElementById('quizResult').innerHTML = `<strong>第${quiz.setNumber}回 完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>この回が完了しました。進捗バーに反映されます。<br>Đã hoàn thành lần này. Thanh tiến độ đã được cập nhật.</p>`;
  saveCompletedTestSet(quiz.setNumber);
  const sets = getQuizSets();
  if (termState.quizSetIndex < sets.length - 1) termState.quizSetIndex += 1;
  renderQuizOverview();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_quiz_results').insert({
      trainee_id: termState.profile.id,
      set_id: `kinrei-test-2023-${String(quiz.setNumber).padStart(2, '0')}`,
      total_questions: quiz.questions.length,
      correct_count: quiz.correct,
      score_rate: rate,
      answers_json: quiz.answers,
    });
  } catch (err) {
    console.warn('quiz result save skipped', err);
  }
}

function setupEvents() {
  document.getElementById('categoryFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('termSearch').addEventListener('input', applyFilters);
  document.getElementById('termCard').addEventListener('click', () => { termState.flipped = !termState.flipped; renderCard(); });
  document.getElementById('termCard').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      termState.flipped = !termState.flipped;
      renderCard();
    }
  });
  document.getElementById('prevCardBtn').addEventListener('click', () => moveCard(-1));
  document.getElementById('nextCardBtn').addEventListener('click', () => moveCard(1));
  document.getElementById('reviewBtn').addEventListener('click', () => {
    const term = termState.filtered[termState.currentIndex];
    if (term) saveProgress(term.id, 'review');
    moveCard(1);
  });
  document.getElementById('learnedBtn').addEventListener('click', () => {
    const term = termState.filtered[termState.currentIndex];
    if (term) saveProgress(term.id, 'learned');
    moveCard(1);
  });
  document.getElementById('resetProgressBtn').addEventListener('click', () => {
    if (!confirm('この端末の専門用語の進捗をリセットしますか？')) return;
    termState.progress = {};
    saveLocalProgress();
    applyFilters();
    renderStats();
  });
  document.getElementById('wordMemoryModeBtn').addEventListener('click', () => showMode('card'));
  document.getElementById('imageMemoryModeBtn').addEventListener('click', () => showMode('image'));
  document.getElementById('testModeBtn').addEventListener('click', () => showMode('test'));
  document.getElementById('imageCard').addEventListener('click', () => {
    termState.imageCardFlipped = !termState.imageCardFlipped;
    renderImageCard();
  });
  document.getElementById('imageCard').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      termState.imageCardFlipped = !termState.imageCardFlipped;
      renderImageCard();
    }
  });
  document.getElementById('prevImageCardBtn').addEventListener('click', () => moveImageCard(-1));
  document.getElementById('nextImageCardBtn').addEventListener('click', () => moveImageCard(1));
  document.getElementById('quizSetSelect').addEventListener('change', event => {
    termState.quizSetIndex = Number(event.target.value) || 0;
    termState.quiz = null;
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('quizOptions').innerHTML = '';
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizPrompt').innerHTML = 'テストを始めてください<br>Bắt đầu kiểm tra';
    document.getElementById('quizNow').textContent = '0';
    const set = getQuizSets()[termState.quizSetIndex] || [];
    document.getElementById('quizTotal').textContent = set.length || QUIZ_SET_SIZE;
    renderQuizOverview();
  });
  document.getElementById('toolsToggleBtn').addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('show-tools');
    document.getElementById('toolsToggleBtn').innerHTML = isOpen
      ? '閉じる<br>Đóng'
      : 'さがす・一覧<br>Tìm kiếm';
  });
  document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
  document.getElementById('nextQuizBtn').addEventListener('click', () => {
    if (!termState.quiz) return;
    termState.quiz.index += 1;
    renderQuiz();
  });
}

(async function init() {
  const auth = await checkTerminologyAuth();
  if (!auth) return;
  termState.profile = auth.profile;
  document.getElementById('student-bar').style.display = 'flex';
  document.getElementById('student-name').textContent = auth.profile.name_katakana || auth.profile.name_romaji || '';
  document.getElementById('student-id-display').textContent = `（${auth.profile.student_id || ''}）`;
  termState.terms = window.KINREI_VOCAB?.terms || [];
  termState.progress = loadLocalProgress();
  await loadSupabaseProgress();
  (window.KINREI_VOCAB?.set?.categories || []).forEach(category => {
    const opt = document.createElement('option');
    opt.value = category;
    opt.textContent = category;
    document.getElementById('categoryFilter').appendChild(opt);
  });
  setupEvents();
  applyFilters();
  renderImageCard();
  renderStats();
})();
