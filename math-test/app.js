const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session') || '';
const presetNo = params.get('no') || '';

const $ = (selector) => document.querySelector(selector);

function normalizeNo(value) {
  return String(value || '').trim().replace(/^No\.?\s*/i, '');
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

function setScreen(name) {
  $('#start-screen').classList.toggle('hidden', name !== 'start');
  $('#test-screen').classList.toggle('hidden', name !== 'test');
  $('#result-screen').classList.toggle('hidden', name !== 'result');
}

// 半角テキスト入力の共通属性
const NUM_ATTRS = 'type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false"';

function answerFieldHtml(question) {
  const id = question.id;
  switch (question.type) {
    case 'fraction':
      return `
        <div class="answer-row">
          <span class="frac">
            <input class="answer-input frac-cell" ${NUM_ATTRS} name="q${id}_n" aria-label="tử số">
            <span class="frac-bar"></span>
            <input class="answer-input frac-cell" ${NUM_ATTRS} name="q${id}_d" aria-label="mẫu số">
          </span>
        </div>`;
    case 'ratio':
      return `
        <div class="answer-row">
          <input class="answer-input num-cell" ${NUM_ATTRS} name="q${id}_a" aria-label="tỉ số vế trái">
          <span class="answer-op">:</span>
          <input class="answer-input num-cell" ${NUM_ATTRS} name="q${id}_b" aria-label="tỉ số vế phải">
        </div>`;
    case 'expr':
      return `
        <div class="answer-row">
          <input class="answer-input num-cell" ${NUM_ATTRS} name="q${id}_coef" aria-label="hệ số của x">
          <span class="answer-op">x +</span>
          <input class="answer-input num-cell" ${NUM_ATTRS} name="q${id}_cons" aria-label="hằng số">
        </div>`;
    case 'select':
      return `
        <div class="answer-row">
          <select class="answer-select" name="q${id}">
            <option value="">— chọn —</option>
            ${question.options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>`;
    default: // number
      return `
        <div class="answer-row">
          ${question.prefix ? `<span class="answer-fix">${escapeHtml(question.prefix)}</span>` : ''}
          <input class="answer-input num-cell" ${NUM_ATTRS} name="q${id}" aria-label="đáp án">
          ${question.suffix ? `<span class="answer-fix">${escapeHtml(question.suffix)}</span>` : ''}
        </div>`;
  }
}

function renderQuestions() {
  $('#test-form').innerHTML = QUESTIONS.map(question => {
    const sectionHtml = question.sectionTitle
      ? `<h2 class="section-title">${escapeHtml(question.sectionTitle)}</h2>`
      : '';
    const promptHtml = question.prompt
      ? `<p class="question-title">${question.id}. ${escapeHtml(question.prompt)}</p>`
      : `<p class="question-title">${question.id}.</p>`;
    const mathHtml = question.math
      ? `<p class="question-math">${escapeHtml(question.math)}</p>`
      : '';
    const imageHtml = question.image
      ? `<img class="question-image" src="${question.image}" alt="">`
      : '';
    return `
      ${sectionHtml}
      <section class="question-card" data-question="${question.id}">
        ${promptHtml}
        ${mathHtml}
        ${imageHtml}
        ${answerFieldHtml(question)}
      </section>
    `;
  }).join('');
}

// DOM から1問分の回答を、questions.js の判定関数が期待する形で取り出す
function collectAnswer(question) {
  const val = name => (document.querySelector(`[name="${name}"]`)?.value ?? '');
  const id = question.id;
  switch (question.type) {
    case 'fraction': return { n: val(`q${id}_n`), d: val(`q${id}_d`) };
    case 'ratio': return { a: val(`q${id}_a`), b: val(`q${id}_b`) };
    case 'expr': return { coef: val(`q${id}_coef`), cons: val(`q${id}_cons`) };
    default: return { value: val(`q${id}`) }; // number / select
  }
}

// 記録用の読みやすい回答文字列
function formatGiven(question, ans) {
  if (!mtIsAnswered(question, ans)) return '';
  switch (question.type) {
    case 'fraction': return `${ans.n}/${ans.d}`;
    case 'ratio': return `${ans.a}:${ans.b}`;
    case 'expr': return `${ans.coef}x + ${ans.cons}`;
    default: return String(ans.value);
  }
}

function answeredCount() {
  return QUESTIONS.filter(question => mtIsAnswered(question, collectAnswer(question))).length;
}

function updateProgress() {
  $('#progress').textContent = `${answeredCount()}/${QUESTIONS.length}`;
}

function grade() {
  let correct = 0;
  const answers = QUESTIONS.map(question => {
    const ans = collectAnswer(question);
    const isCorrect = mtIsCorrect(question, ans);
    if (isCorrect) correct += 1;
    return { id: question.id, given: formatGiven(question, ans), isCorrect };
  });
  return {
    correct,
    total: QUESTIONS.length,
    score: Number((correct / QUESTIONS.length * 100).toFixed(1)),
    answers,
  };
}

async function saveScore(candidateNo, result) {
  if (!sessionId) return 'Điểm đã tính xong. Không có mã phỏng vấn nên chưa lưu tự động.';
  if (typeof supabase === 'undefined') return 'Điểm đã tính xong. Không đọc được thiết lập lưu điểm.';

  const { data, error } = await supabase.rpc('submit_math_score', {
    p_interview_id: sessionId,
    p_candidate_no: candidateNo,
    p_score: result.score,
  });
  if (error) return `Không lưu được điểm: ${error.message}`;
  return data ? 'Điểm đã được lưu tự động.' : 'Không tìm thấy số báo danh trong buổi phỏng vấn này.';
}

function startTest() {
  const no = normalizeNo($('#candidate-no').value);
  if (!no) {
    $('#start-error').textContent = 'Vui lòng nhập số báo danh.';
    $('#start-error').classList.remove('hidden');
    return;
  }
  $('#start-error').classList.add('hidden');
  $('#display-no').textContent = no;
  renderQuestions();
  updateProgress();
  $('#test-form').addEventListener('input', updateProgress);
  $('#test-form').addEventListener('change', updateProgress);
  setScreen('test');
}

async function submitTest(event) {
  event.preventDefault();
  if (answeredCount() < QUESTIONS.length) {
    alert('Vui lòng trả lời tất cả các câu.');
    return;
  }
  $('#submit-btn').disabled = true;
  const no = normalizeNo($('#candidate-no').value);
  const result = grade();
  $('#score-title').textContent = `${result.score} điểm`;
  $('#score-detail').textContent = `${result.correct}/${result.total} câu đúng`;
  $('#save-status').textContent = await saveScore(no, result);
  setScreen('result');
}

function init() {
  if (presetNo) {
    $('#candidate-no').value = normalizeNo(presetNo);
    $('#candidate-no').readOnly = true;
  }
  $('#start-btn').addEventListener('click', startTest);
  $('#test-form').addEventListener('submit', submitTest);
}

init();
