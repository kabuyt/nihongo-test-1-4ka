// ============ クレペリン検査 メインロジック ============

const App = (() => {
  // 定数
  const NUMS_PER_ROW = 116;
  const PRACTICE_NUMS = 11; // 練習モード: 10問のチュートリアル
  const ROW_TIME = 60; // 秒
  const BREAK_TIME = 300; // 秒
  const ROWS_PER_HALF = 5;
  const VISIBLE_CELLS = 9; // 画面に表示するセル数（両脇に余裕を持たせる）

  // 状態
  let mode = 'test'; // 'test' | 'practice'
  let phase = 'first'; // 'first' | 'second'
  let currentRow = 0;
  let currentPos = 0;
  let numbers = [];
  let allResults = []; // [{row, phase, answers:[{correct, given, isCorrect}]}]
  let currentAnswers = [];
  let timerInterval = null;
  let timeLeft = ROW_TIME;
  let userName = '';
  let testStartedAt = null;

  // DOM
  const screens = {
    start: document.getElementById('screen-start'),
    test: document.getElementById('screen-test'),
    transition: document.getElementById('screen-transition'),
    break: document.getElementById('screen-break'),
    result: document.getElementById('screen-result'),
  };

  const dom = {
    phaseLabel: document.getElementById('phase-label'),
    rowLabel: document.getElementById('row-label'),
    timer: document.getElementById('timer'),
    numberRow: document.getElementById('number-row'),
    answerRow: document.getElementById('answer-row'),
    breakTimer: document.getElementById('break-timer'),
  };

  // ============ 画面切替 ============
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    // test 画面に練習モードクラスを反映
    if (name === 'test') {
      screens.test.classList.toggle('practice-mode', mode === 'practice');
    }
  }

  // ============ 数字列生成 ============
  function generateRow() {
    const len = mode === 'practice' ? PRACTICE_NUMS : NUMS_PER_ROW;
    const row = [];
    for (let i = 0; i < len; i++) {
      row.push(Math.floor(Math.random() * 9) + 1); // 1-9
    }
    return row;
  }

  // ============ 表示更新 ============
  function renderNumbers() {
    const numRow = dom.numberRow;
    const ansRow = dom.answerRow;
    numRow.innerHTML = '';
    ansRow.innerHTML = '';

    // 表示範囲: currentPos を中央に置き、過去の回答も可視範囲に入れる
    const half = Math.floor(VISIBLE_CELLS / 2);
    const start = Math.max(0, currentPos - half);
    const end = Math.min(numbers.length, start + VISIBLE_CELLS + 1);

    for (let i = start; i < end; i++) {
      const cell = document.createElement('div');
      cell.className = 'num-cell';
      cell.textContent = numbers[i];

      if (i === currentPos || i === currentPos + 1) {
        cell.classList.add('active');
      } else if (i < currentPos) {
        cell.classList.add('done');
      }
      numRow.appendChild(cell);
    }

    // 回答セル（数字の間に入るので数字-1個）
    for (let i = start; i < end - 1; i++) {
      const cell = document.createElement('div');
      cell.className = 'ans-cell';

      if (i < currentPos) {
        const ans = currentAnswers[i];
        if (ans) {
          cell.textContent = ans.given;
          cell.classList.add(ans.isCorrect ? 'correct' : 'wrong');
        }
      } else if (i === currentPos) {
        cell.classList.add('current');
      }
      ansRow.appendChild(cell);
    }

    // 練習モード: ヒント表示 + テンキーハイライト
    updatePracticeHint();
  }

  // ============ 練習モードのヒント ============
  function updatePracticeHint() {
    const hintEl = document.getElementById('practice-hint');
    if (!hintEl) return;

    document.querySelectorAll('.numpad-btn').forEach(btn => btn.classList.remove('hint-target'));

    if (mode !== 'practice') {
      hintEl.style.display = 'none';
      return;
    }

    const a = numbers[currentPos];
    const b = numbers[currentPos + 1];
    if (a == null || b == null) {
      hintEl.style.display = 'none';
      return;
    }
    const sum = a + b;
    const onesDigit = sum % 10;
    hintEl.style.display = 'block';
    hintEl.innerHTML = `
      <div class="hint-step">
        2つの数字を足します。今は <strong>${a}</strong> + <strong>${b}</strong> = <strong>${sum}</strong>。
        <strong>${sum}</strong> の<u>一の位</u>は <strong class="hint-answer">${onesDigit}</strong> なので、
        下の <strong class="hint-answer">${onesDigit}</strong> ボタンを押してください。
      </div>
      <div class="hint-step vi">
        Cộng hai chữ số. Bây giờ <strong>${a}</strong> + <strong>${b}</strong> = <strong>${sum}</strong>.
        Chữ số <u>hàng đơn vị</u> của <strong>${sum}</strong> là <strong class="hint-answer">${onesDigit}</strong>,
        nên bấm nút <strong class="hint-answer">${onesDigit}</strong> bên dưới.
      </div>
    `;
    const targetBtn = document.querySelector(`.numpad-btn[data-num="${onesDigit}"]`);
    if (targetBtn) targetBtn.classList.add('hint-target');
  }

  function updateHeader() {
    const label = mode === 'practice' ? '練習' : (phase === 'first' ? '前半' : '後半');
    dom.phaseLabel.textContent = label;
    if (mode === 'practice') {
      const total = numbers.length - 1;
      dom.rowLabel.textContent = `練習 ${Math.min(currentPos + 1, total)} / ${total} 問`;
    } else {
      const totalRows = ROWS_PER_HALF;
      const rowInPhase = phase === 'first' ? currentRow + 1 : currentRow - ROWS_PER_HALF + 1;
      dom.rowLabel.textContent = `${rowInPhase} / ${totalRows} 行目`;
    }
  }

  function updateTimer() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    dom.timer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    dom.timer.classList.toggle('warning', timeLeft <= 10);
  }

  // ============ タイマー ============
  function startTimer() {
    if (mode === 'practice') {
      // 練習モード: タイマー無効、表示は「--:--」
      clearInterval(timerInterval);
      dom.timer.textContent = '--:--';
      dom.timer.classList.remove('warning');
      return;
    }
    timeLeft = ROW_TIME;
    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        finishRow();
      }
    }, 1000);
  }

  // ============ 行の開始 ============
  function startRow() {
    numbers = generateRow();
    currentPos = 0;
    currentAnswers = [];
    updateHeader();
    renderNumbers();
    startTimer();
  }

  // ============ 行の終了 ============
  function finishRow() {
    clearInterval(timerInterval);

    // 結果を保存
    allResults.push({
      row: currentRow,
      phase: phase,
      answers: [...currentAnswers],
    });

    if (mode === 'practice') {
      // 練習終了 → 移行画面へ
      showScreen('transition');
      return;
    }

    currentRow++;

    if (phase === 'first' && currentRow >= ROWS_PER_HALF) {
      // 前半終了 → 休憩へ
      startBreak();
    } else if (phase === 'second' && currentRow >= ROWS_PER_HALF * 2) {
      // 全て終了 → 結果画面へ
      showScreen('result');
      const meta = { name: userName, startedAt: testStartedAt };
      Results.render(allResults, meta);
      saveResultToCloud(allResults, meta);
    } else {
      // 次の行
      startRow();
    }
  }

  // ============ 休憩 ============
  function startBreak() {
    showScreen('break');
    let breakTimeLeft = BREAK_TIME;

    function updateBreakTimer() {
      const min = Math.floor(breakTimeLeft / 60);
      const sec = breakTimeLeft % 60;
      dom.breakTimer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    }

    updateBreakTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      breakTimeLeft--;
      updateBreakTimer();
      if (breakTimeLeft <= 0) {
        clearInterval(timerInterval);
        startSecondHalf();
      }
    }, 1000);

  }

  function startSecondHalf() {
    phase = 'second';
    showScreen('test');
    startRow();
  }

  // ============ 入力処理 ============
  function handleInput(num) {
    if (currentPos >= numbers.length - 1) return;

    const correctAnswer = (numbers[currentPos] + numbers[currentPos + 1]) % 10;
    const isCorrect = num === correctAnswer;

    currentAnswers[currentPos] = {
      correct: correctAnswer,
      given: num,
      isCorrect: isCorrect,
    };

    // テンキーのフラッシュ
    flashNumpad(num, isCorrect);

    currentPos++;
    renderNumbers();

    // 全部解いたら行終了
    if (currentPos >= numbers.length - 1) {
      clearInterval(timerInterval);
      setTimeout(() => finishRow(), 300);
    }
  }

  // ============ クラウド保存 ============
  async function saveResultToCloud(results, meta) {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    statusEl.textContent = '☁ Supabase に保存中...';
    statusEl.className = 'save-status no-print saving';
    try {
      const { error } = await Results.saveToCloud(results, meta);
      if (error) {
        statusEl.textContent = '⚠ 保存失敗: ' + error.message + '（PDFは保存できます）';
        statusEl.className = 'save-status no-print error';
        console.error('Supabase save error:', error);
      } else {
        statusEl.textContent = '✓ クラウドに保存しました';
        statusEl.className = 'save-status no-print success';
      }
    } catch (e) {
      statusEl.textContent = '⚠ 保存失敗: ' + e.message;
      statusEl.className = 'save-status no-print error';
      console.error(e);
    }
  }

  function flashNumpad(num, isCorrect) {
    // 実際のクレペリンに合わせ正誤フィードバックは出さない（押下感のみ）
    const btn = document.querySelector(`.numpad-btn[data-num="${num}"]`);
    if (!btn) return;
    btn.classList.add('flash-press');
    setTimeout(() => btn.classList.remove('flash-press'), 100);
  }

  // ============ イベント設定 ============
  function init() {
    // テンキーボタン
    document.querySelectorAll('.numpad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const num = parseInt(btn.dataset.num, 10);
        handleInput(num);
      });

      // モバイル: touchstart で即反応
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const num = parseInt(btn.dataset.num, 10);
        handleInput(num);
      });
    });

    // キーボード入力
    document.addEventListener('keydown', (e) => {
      if (!screens.test.classList.contains('active')) return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        e.preventDefault();
        handleInput(num);
      }
    });

    // 開始ボタン（練習から開始 → 自動的に本番へ移行）
    document.getElementById('btn-start').addEventListener('click', () => {
      const nameInput = document.getElementById('input-name');
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        nameInput.classList.add('input-error');
        setTimeout(() => nameInput.classList.remove('input-error'), 1500);
        return;
      }
      userName = name;
      mode = 'practice';
      phase = 'first';
      currentRow = 0;
      allResults = [];
      showScreen('test');
      startRow();
    });

    // 練習→本番 移行ボタン
    document.getElementById('btn-start-real').addEventListener('click', () => {
      testStartedAt = new Date();
      mode = 'test';
      phase = 'first';
      currentRow = 0;
      allResults = [];
      showScreen('test');
      startRow();
    });

    // PDF保存ボタン
    document.getElementById('btn-pdf').addEventListener('click', () => {
      window.print();
    });

    // もう一度ボタン
    document.getElementById('btn-retry').addEventListener('click', () => {
      showScreen('start');
    });
  }

  init();

  return { allResults };
})();
