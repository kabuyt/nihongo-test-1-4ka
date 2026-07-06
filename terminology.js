const TERM_STORAGE_KEY = 'kinreiTerminologyProgress:v1';
const QUIZ_SET_SIZE = 10;

let termState = {
  terms: [],
  filtered: [],
  progress: {},
  currentIndex: 0,
  quizSetIndex: 0,
  imageSetIndex: 0,
  flipped: false,
  quiz: null,
  imageQuiz: null,
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
  const text = String(term.term || '').trim();
  if (!text) return '';
  const inlineReading = collectHiraganaParts(text);
  const kanaReading = cleanKanaReading(term.kana);
  if (inlineReading.length) {
    const joined = inlineReading.join('・');
    return shouldPreferKanaReading(text, joined, kanaReading) ? kanaReading : joined;
  }
  if (isKatakanaOnly(text)) return text;
  return kanaReading || '';
}

function displayTermForTerm(term) {
  const text = String(term.term || '').trim();
  if (!hasKanji(text)) return text;
  return [...text].filter(ch => !isHiragana(ch)).join('').replace(/\s+/g, ' ').trim();
}

function isHiragana(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 0x3041 && cp <= 0x3096;
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
  document.getElementById('cardKana').textContent = reading ? `読み: ${reading} / Cách đọc: ${reading}` : '';
  document.getElementById('cardMeaning').textContent = term.meaningVi;
  renderStats();
}

function renderList() {
  document.getElementById('visibleCount').textContent = `${termState.filtered.length}語`;
  const list = document.getElementById('termList');
  list.innerHTML = termState.filtered.map((term, index) => {
    const progress = getProgress(term.id);
    return `
      <button type="button" class="term-row ${index === termState.currentIndex ? 'active' : ''}" data-index="${index}">
        <span><strong>${esc(term.term)}</strong><small>${esc(term.meaningVi)}</small></span>
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

function getQuizPool() {
  return termState.filtered.length >= 4 ? termState.filtered : termState.terms;
}

function getQuizSets() {
  const pool = getQuizPool();
  const sets = [];
  for (let i = 0; i < pool.length; i += QUIZ_SET_SIZE) {
    sets.push(pool.slice(i, i + QUIZ_SET_SIZE));
  }
  return sets;
}

function isQuizSetDone(set) {
  return set.length > 0 && set.every(term => (getProgress(term.id).attempts || 0) > 0);
}

function renderQuizOverview() {
  const select = document.getElementById('quizSetSelect');
  const summary = document.getElementById('quizSetSummary');
  if (!select || !summary) return;

  const sets = getQuizSets();
  if (termState.quizSetIndex >= sets.length) termState.quizSetIndex = 0;
  const completed = sets.filter(isQuizSetDone).length;

  select.innerHTML = sets.map((set, index) => {
    const start = index * QUIZ_SET_SIZE + 1;
    const end = start + set.length - 1;
    const done = isQuizSetDone(set) ? ' ✓' : '';
    return `<option value="${index}">第${index + 1}回（${start}-${end}語）${done}</option>`;
  }).join('');
  select.value = String(termState.quizSetIndex);
  summary.textContent = sets.length
    ? `全${sets.length}回・完了${completed}回 / ${sets.length} lần, xong ${completed}`
    : 'テストできる単語がありません';

  const button = document.getElementById('startQuizBtn');
  if (button) button.innerHTML = `第${termState.quizSetIndex + 1}回を始める<br>Bắt đầu lần ${termState.quizSetIndex + 1}`;
}

function getImageItems() {
  return window.KINREI_IMAGE_QUIZ?.items || [];
}

function getImageSetSize() {
  return window.KINREI_IMAGE_QUIZ?.set?.questionSize || QUIZ_SET_SIZE;
}

function getImageSets() {
  const items = getImageItems();
  const size = getImageSetSize();
  const sets = [];
  for (let i = 0; i < items.length; i += size) {
    sets.push(items.slice(i, i + size));
  }
  return sets;
}

function renderImageOverview() {
  const select = document.getElementById('imageSetSelect');
  const summary = document.getElementById('imageSetSummary');
  if (!select || !summary) return;

  const sets = getImageSets();
  if (termState.imageSetIndex >= sets.length) termState.imageSetIndex = 0;
  select.innerHTML = sets.map((set, index) => {
    const start = index * getImageSetSize() + 1;
    const end = start + set.length - 1;
    return `<option value="${index}">第${index + 1}回（${start}-${end}枚）</option>`;
  }).join('');
  select.value = String(termState.imageSetIndex);
  summary.textContent = sets.length
    ? `全${sets.length}回 / ${sets.length} lần`
    : '画像問題がありません';

  const button = document.getElementById('startImageQuizBtn');
  if (button) button.innerHTML = `第${termState.imageSetIndex + 1}回を始める<br>Bắt đầu lần ${termState.imageSetIndex + 1}`;
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
  document.getElementById('cardModeBtn').classList.toggle('active', !test && !image);
  document.getElementById('testModeBtn').classList.toggle('active', test);
  document.getElementById('imageModeBtn').classList.toggle('active', image);
  if (image) renderImageOverview();
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

function startImageQuiz() {
  const sets = getImageSets();
  if (!sets.length) return;
  const questions = sets[termState.imageSetIndex] || sets[0];
  termState.imageQuiz = {
    setNumber: termState.imageSetIndex + 1,
    questions: shuffle(questions),
    index: 0,
    correct: 0,
    answers: [],
    answered: false,
  };
  document.getElementById('imageResult').classList.add('hidden');
  renderImageQuiz();
}

function renderQuiz() {
  const quiz = termState.quiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishQuiz();
    return;
  }
  const question = quiz.questions[quiz.index];
  const options = shuffle([question, ...shuffle(termState.terms.filter(term => term.id !== question.id)).slice(0, 3)]);
  quiz.answered = false;
  document.getElementById('quizNow').textContent = quiz.index + 1;
  document.getElementById('quizTotal').textContent = quiz.questions.length;
  document.getElementById('quizPrompt').textContent = `「${question.term}」の意味は？ / Nghĩa là gì?`;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizOptions').innerHTML = options.map(option =>
    `<button type="button" class="quiz-option" data-id="${esc(option.id)}">${esc(option.meaningVi)}</button>`
  ).join('');
  document.querySelectorAll('.quiz-option').forEach(button => button.addEventListener('click', () => answerQuiz(button.dataset.id)));
}

function renderImageQuiz() {
  const quiz = termState.imageQuiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishImageQuiz();
    return;
  }
  const question = quiz.questions[quiz.index];
  const options = shuffle([question, ...shuffle(getImageItems().filter(item => item.id !== question.id && item.term !== question.term)).slice(0, 3)]);
  quiz.answered = false;
  document.getElementById('imageNow').textContent = quiz.index + 1;
  document.getElementById('imageTotal').textContent = quiz.questions.length;
  document.getElementById('imagePrompt').innerHTML = 'この写真の名前は？<br>Tên của hình này là gì?';
  document.getElementById('imageQuestionImg').src = question.image;
  document.getElementById('imageQuestionImg').style.display = '';
  document.getElementById('imageFeedback').textContent = '';
  document.getElementById('nextImageQuizBtn').disabled = true;
  document.getElementById('imageOptions').innerHTML = options.map(option =>
    `<button type="button" class="quiz-option" data-id="${esc(option.id)}">${esc(option.term)}<br><small>${esc(option.reading || '')}</small></button>`
  ).join('');
  document.querySelectorAll('#imageOptions .quiz-option').forEach(button => button.addEventListener('click', () => answerImageQuiz(button.dataset.id)));
}

function answerQuiz(selectedId) {
  const quiz = termState.quiz;
  if (!quiz || quiz.answered) return;
  const question = quiz.questions[quiz.index];
  const ok = selectedId === question.id;
  quiz.answered = true;
  quiz.correct += ok ? 1 : 0;
  quiz.answers.push({ term_id: question.id, correct: ok });
  updateQuizProgress(question.id, ok);
  document.querySelectorAll('.quiz-option').forEach(button => {
    button.disabled = true;
    if (button.dataset.id === question.id) button.classList.add('correct');
    if (button.dataset.id === selectedId && !ok) button.classList.add('wrong');
  });
  document.getElementById('quizFeedback').textContent = ok ? '正解です / Đúng rồi' : `正解 / Đáp án: ${question.meaningVi}`;
  document.getElementById('nextQuizBtn').disabled = false;
  renderStats();
  renderList();
}

function answerImageQuiz(selectedId) {
  const quiz = termState.imageQuiz;
  if (!quiz || quiz.answered) return;
  const question = quiz.questions[quiz.index];
  const ok = selectedId === question.id;
  quiz.answered = true;
  quiz.correct += ok ? 1 : 0;
  quiz.answers.push({ image_id: question.id, correct: ok });
  document.querySelectorAll('#imageOptions .quiz-option').forEach(button => {
    button.disabled = true;
    if (button.dataset.id === question.id) button.classList.add('correct');
    if (button.dataset.id === selectedId && !ok) button.classList.add('wrong');
  });
  document.getElementById('imageFeedback').textContent = ok ? '正解です / Đúng rồi' : `正解 / Đáp án: ${question.term}`;
  document.getElementById('nextImageQuizBtn').disabled = false;
}

async function finishQuiz() {
  const quiz = termState.quiz;
  if (!quiz) return;
  const rate = quiz.questions.length ? Math.round((quiz.correct / quiz.questions.length) * 100) : 0;
  document.getElementById('quizPrompt').textContent = 'テスト完了 / Hoàn thành';
  document.getElementById('quizOptions').innerHTML = '';
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizResult').classList.remove('hidden');
  document.getElementById('quizResult').innerHTML = `<strong>第${quiz.setNumber}回 完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>間違えた用語は「要復習」に入りました。次の回へ進めます。<br>Từ sai sẽ được đưa vào mục Cần ôn. Có thể học lần tiếp theo.</p>`;
  const sets = getQuizSets();
  if (termState.quizSetIndex < sets.length - 1) termState.quizSetIndex += 1;
  renderQuizOverview();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_quiz_results').insert({
      trainee_id: termState.profile.id,
      set_id: `kinrei-2023-${String(quiz.setNumber).padStart(2, '0')}`,
      total_questions: quiz.questions.length,
      correct_count: quiz.correct,
      score_rate: rate,
      answers_json: quiz.answers,
    });
  } catch (err) {
    console.warn('quiz result save skipped', err);
  }
}

async function finishImageQuiz() {
  const quiz = termState.imageQuiz;
  if (!quiz) return;
  const rate = quiz.questions.length ? Math.round((quiz.correct / quiz.questions.length) * 100) : 0;
  document.getElementById('imagePrompt').textContent = '画像問題 完了 / Hoàn thành';
  document.getElementById('imageQuestionImg').style.display = 'none';
  document.getElementById('imageOptions').innerHTML = '';
  document.getElementById('imageFeedback').textContent = '';
  document.getElementById('nextImageQuizBtn').disabled = true;
  document.getElementById('imageResult').classList.remove('hidden');
  document.getElementById('imageResult').innerHTML = `<strong>画像 第${quiz.setNumber}回 完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>写真を見て名前を選ぶ練習です。<br>Luyện nhìn hình và chọn tên đúng.</p>`;
  const sets = getImageSets();
  if (termState.imageSetIndex < sets.length - 1) termState.imageSetIndex += 1;
  renderImageOverview();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_quiz_results').insert({
      trainee_id: termState.profile.id,
      set_id: `kinrei-image-2023-${String(quiz.setNumber).padStart(2, '0')}`,
      total_questions: quiz.questions.length,
      correct_count: quiz.correct,
      score_rate: rate,
      answers_json: quiz.answers,
    });
  } catch (err) {
    console.warn('image quiz result save skipped', err);
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
  document.getElementById('cardModeBtn').addEventListener('click', () => showMode('card'));
  document.getElementById('testModeBtn').addEventListener('click', () => showMode('test'));
  document.getElementById('imageModeBtn').addEventListener('click', () => showMode('image'));
  document.getElementById('quizSetSelect').addEventListener('change', event => {
    termState.quizSetIndex = Number(event.target.value) || 0;
    termState.quiz = null;
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('quizOptions').innerHTML = '';
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizPrompt').innerHTML = '問題を始めてください<br>Hãy bắt đầu bài kiểm tra';
    document.getElementById('quizNow').textContent = '0';
    const set = getQuizSets()[termState.quizSetIndex] || [];
    document.getElementById('quizTotal').textContent = set.length || QUIZ_SET_SIZE;
    renderQuizOverview();
  });
  document.getElementById('imageSetSelect').addEventListener('change', event => {
    termState.imageSetIndex = Number(event.target.value) || 0;
    termState.imageQuiz = null;
    document.getElementById('imageResult').classList.add('hidden');
    document.getElementById('imageOptions').innerHTML = '';
    document.getElementById('imageFeedback').textContent = '';
    document.getElementById('imagePrompt').innerHTML = '写真を見て、名前を選んでください<br>Nhìn hình và chọn tên đúng';
    document.getElementById('imageQuestionImg').style.display = 'none';
    document.getElementById('imageNow').textContent = '0';
    const set = getImageSets()[termState.imageSetIndex] || [];
    document.getElementById('imageTotal').textContent = set.length || getImageSetSize();
    renderImageOverview();
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
  document.getElementById('startImageQuizBtn').addEventListener('click', startImageQuiz);
  document.getElementById('nextImageQuizBtn').addEventListener('click', () => {
    if (!termState.imageQuiz) return;
    termState.imageQuiz.index += 1;
    renderImageQuiz();
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
  renderImageOverview();
  renderStats();
})();
