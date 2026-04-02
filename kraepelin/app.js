// ============ クレペリン検査 メインロジック ============

const App = (() => {
  // 定数
  const NUMS_PER_ROW = 116;
  const ROW_TIME = 60; // 秒
  const BREAK_TIME = 300; // 秒
  const ROWS_PER_HALF = 15;
  const VISIBLE_CELLS = 20; // 画面に表示するセル数

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

  // DOM
  const screens = {
    start: document.getElementById('screen-start'),
    test: document.getElementById('screen-test'),
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
  }

  // ============ 数字列生成 ============
  function generateRow() {
    const row = [];
    for (let i = 0; i < NUMS_PER_ROW; i++) {
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

    // 表示範囲: currentPos を中心に前後を表示
    const start = Math.max(0, currentPos - 3);
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
          cell.style.color = ans.isCorrect ? 'var(--success)' : 'var(--error)';
        }
      } else if (i === currentPos) {
        cell.classList.add('current');
      }
      ansRow.appendChild(cell);
    }
  }

  function updateHeader() {
    const totalRows = mode === 'practice' ? 1 : ROWS_PER_HALF;
    const label = mode === 'practice' ? '練習' : (phase === 'first' ? '前半' : '後半');
    const rowInPhase = mode === 'practice' ? 1 : (phase === 'first' ? currentRow + 1 : currentRow - ROWS_PER_HALF + 1);

    dom.phaseLabel.textContent = label;
    dom.rowLabel.textContent = `${rowInPhase} / ${totalRows} 行目`;
  }

  function updateTimer() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    dom.timer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    dom.timer.classList.toggle('warning', timeLeft <= 10);
  }

  // ============ タイマー ============
  function startTimer() {
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
      // 練習終了 → スタートに戻る
      showScreen('start');
      return;
    }

    currentRow++;

    if (phase === 'first' && currentRow >= ROWS_PER_HALF) {
      // 前半終了 → 休憩へ
      startBreak();
    } else if (phase === 'second' && currentRow >= ROWS_PER_HALF * 2) {
      // 全て終了 → 結果画面へ
      showScreen('result');
      Results.render(allResults);
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

    document.getElementById('btn-skip-break').onclick = () => {
      clearInterval(timerInterval);
      startSecondHalf();
    };
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

  function flashNumpad(num, isCorrect) {
    const btn = document.querySelector(`.numpad-btn[data-num="${num}"]`);
    if (!btn) return;
    const cls = isCorrect ? 'flash-correct' : 'flash-wrong';
    btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 150);
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

    // 検査開始ボタン
    document.getElementById('btn-start').addEventListener('click', () => {
      mode = 'test';
      phase = 'first';
      currentRow = 0;
      allResults = [];
      showScreen('test');
      startRow();
    });

    // 練習ボタン
    document.getElementById('btn-practice').addEventListener('click', () => {
      mode = 'practice';
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
