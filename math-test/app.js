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
    const optionsHtml = `
      <div class="options">
        ${question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          return `
            <label class="option">
              <input type="radio" name="q${question.id}" value="${index}" required>
              <span><strong>${letter}.</strong> ${escapeHtml(option)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
    return `
      ${sectionHtml}
      <section class="question-card" data-question="${question.id}">
        ${promptHtml}
        ${mathHtml}
        ${imageHtml}
        ${optionsHtml}
      </section>
    `;
  }).join('');
}

function answeredCount() {
  return QUESTIONS.filter(question => !!document.querySelector(`[name="q${question.id}"]:checked`)).length;
}

function updateProgress() {
  $('#progress').textContent = `${answeredCount()}/${QUESTIONS.length}`;
}

function grade() {
  let correct = 0;
  const answers = QUESTIONS.map(question => {
    const checked = document.querySelector(`[name="q${question.id}"]:checked`)?.value;
    const given = checked === undefined ? null : Number(checked);
    const isCorrect = given === question.answer;
    if (isCorrect) correct += 1;
    return { id: question.id, given, correct: question.answer, isCorrect };
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
