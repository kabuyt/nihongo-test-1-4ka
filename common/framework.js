// ===== みんなの日本語 月間テスト 共通フレームワーク =====
// 各テストHTMLからインポートして使用する

(function() {
'use strict';

const TF = window.TestFramework = {};

// ----- 状態変数 -----
let _leaveCount = 0;
let _antiCheatActive = false;
let _audioSpeed = 1.0;
let _scores = {goii:0, bunpo:0, chokkai:0};
let _fieldStatus = {};
let _gasUrl = '';
let _tabs = ['goii', 'bunpo', 'chokkai'];

// ----- 外部からアクセス用プロパティ -----
Object.defineProperty(TF, 'leaveCount', { get: () => _leaveCount });
Object.defineProperty(TF, 'scores', {
  get: () => _scores,
  set: v => { _scores = v; }
});
Object.defineProperty(TF, 'fieldStatus', {
  get: () => _fieldStatus,
  set: v => { _fieldStatus = v; }
});

// ===== 初期化 =====
TF.init = function(config) {
  _gasUrl = config.gasUrl || '';
  _tabs = config.tabs || ['goii', 'bunpo', 'chokkai'];
  const triggerField = config.antiCheatTrigger || 'name_kata';

  document.addEventListener('DOMContentLoaded', () => {
    // アプリ内ブラウザ検出
    _detectInAppBrowser();

    // 名前入力後にアンチチート開始
    const nameInput = document.getElementById(triggerField);
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        if (nameInput.value.trim()) _startAntiCheat();
      });
    }

    // 全audioに速度適用
    document.querySelectorAll('audio').forEach(a => {
      a.onplay = () => a.playbackRate = _audioSpeed;
    });
  });
};

// ===== カンニング防止 =====
function _startAntiCheat() {
  if (_antiCheatActive) return;
  _antiCheatActive = true;

  // タブ切り替え・アプリ切り替え検知 → 強制リセット
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _leaveCount++;
      _silentReset();
    } else {
      _silentReset();
      alert(`⚠ Bạn đã rời khỏi bài kiểm tra!\nToàn bộ câu trả lời đã bị XÓA.\n\n（離脱を検出。回答をリセットしました。${_leaveCount}回目）`);
    }
  });

  // ページを閉じようとしたとき
  window.addEventListener('beforeunload', e => {
    e.preventDefault();
    e.returnValue = 'Nếu đóng ứng dụng sẽ bị coi là gian lận!';
  });

  // アプリ閉じ・タブ閉じ・ナビゲート離脱 → リセット
  window.addEventListener('pagehide', () => { _silentReset(); });

  // ブラウザのキャッシュから復元されたとき → リセット
  window.addEventListener('pageshow', e => {
    if (e.persisted) _silentReset();
  });

  // 警告バナーを表示
  const banner = document.getElementById('cheat-banner');
  if (banner) banner.style.display = 'block';

  // 右クリック禁止
  document.addEventListener('contextmenu', e => e.preventDefault());

  // コピー禁止
  document.addEventListener('copy', e => e.preventDefault());
}

// リセット（共通部分）
function _silentReset() {
  document.querySelectorAll('input[type=text],textarea,select').forEach(el => {
    el.value = '';
    el.style.background = '';
  });
  document.querySelectorAll('input[type=radio]').forEach(el => el.checked = false);
  document.getElementById('result-box').style.display = 'none';
  // テスト固有のリセットがあれば呼ぶ
  if (typeof window.onTestReset === 'function') window.onTestReset();
}

// ===== アプリ内ブラウザ検出 =====
function _detectInAppBrowser() {
  const ua = navigator.userAgent;
  const isInAppBrowser = /Line\//i.test(ua) || /Zalo/i.test(ua) || /FBAN|FBAV|FB_IAB|MessengerForiOS/i.test(ua);
  if (isInAppBrowser) {
    const isAndroid = /Android/i.test(ua);
    const browserName = isAndroid ? 'Chrome' : 'Safari / Chrome';
    const ol = document.getElementById('line-overlay');
    if (ol) {
      ol.querySelectorAll('[id^="line-browser-name"]').forEach(el => {
        el.textContent = browserName;
      });
      ol.style.display = 'flex';
    }
  }
}

// ===== タブ切替 =====
TF.showTab = function(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const idx = {};
  _tabs.forEach((t, i) => { idx[t] = i; });
  if (idx[name] !== undefined) document.querySelectorAll('.tab-btn')[idx[name]].classList.add('active');
  const finishWrap = document.getElementById('finish-btn-wrap');
  if (finishWrap) finishWrap.style.display = name === _tabs[_tabs.length - 1] ? '' : 'none';
  window.scrollTo(0, 0);
};

// ===== 音声速度制御 =====
TF.setAudioSpeed = function(rate) {
  _audioSpeed = rate;
  document.querySelectorAll('audio').forEach(a => a.playbackRate = rate);
  ['075','100','125'].forEach(s => {
    const btn = document.getElementById('spd' + s);
    if (btn) { btn.style.border = '1px solid #aaa'; btn.style.background = '#fff'; btn.style.fontWeight = 'normal'; }
  });
  const active = document.getElementById('spd' + (rate * 100).toFixed(0).padStart(3, '0'));
  if (active) { active.style.border = '2px solid #1a5276'; active.style.background = '#eaf0fb'; active.style.fontWeight = 'bold'; }
  document.querySelectorAll('audio').forEach(a => { a.onplay = () => a.playbackRate = _audioSpeed; });
};

// ===== ユーティリティ =====
TF.normalize = function(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[　]/g, '').replace(/ー/g, 'ー');
};

TF.levenshtein = function(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m + 1}, (_, i) => Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
};

TF.checkFlex = function(input, correctArr) {
  const n = TF.normalize(input);
  return correctArr.some(a => TF.normalize(a) === n);
};

// ===== 提出（テスト終了ボタン） =====
TF.finishTest = async function() {
  const nameKata = document.getElementById('name_kata').value.trim();
  if (!nameKata) {
    alert('お名前（カタカナ）を入力してください。\nVui lòng nhập tên (Katakana).');
    return;
  }
  if (!_gasUrl || _gasUrl === 'YOUR_GAS_URL_HERE') {
    alert('GAS URLが設定されていません。先生に確認してください。');
    return;
  }
  if (!confirm('Bạn có chắc muốn nộp bài không？\n（本当に提出しますか？）')) return;

  // サイレント採点
  if (typeof window.gradeAll === 'function') window.gradeAll();
  document.getElementById('result-box').style.display = 'none';

  // テスト固有のペイロード収集
  let payload = {};
  if (typeof window.collectPayload === 'function') {
    payload = window.collectPayload();
  }

  // 共通フィールドを追加
  payload.timestamp = new Date().toLocaleString('ja-JP');
  payload.test_date = document.getElementById('test_date').value;
  payload.name_kata = nameKata;
  payload.name_latin = document.getElementById('name_latin').value.trim();
  payload.class_name = document.getElementById('class_name').value.trim();
  payload.company = document.getElementById('company').value.trim();
  payload.goii_auto = _scores.goii;
  payload.bunpo_auto = _scores.bunpo;
  payload.chokkai_auto = _scores.chokkai;

  const btn = document.querySelector('#finish-btn-wrap button');
  btn.disabled = true;
  btn.textContent = '⏳ Đang gửi...';

  try {
    await fetch(_gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    btn.textContent = '✅ Đã nộp bài!';
    btn.style.background = '#888';
    alert('✅ Bạn đã nộp bài thành công!\nGiáo viên sẽ chấm và trả kết quả sau.');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '✓ Hoàn thành bài kiểm tra';
    alert('❌ Gửi thất bại. Vui lòng thử lại.\n（送信に失敗しました。もう一度お試しください。）');
  }
};

// ===== 結果送信（採点後） =====
TF.submitResults = async function() {
  const nameKata = document.getElementById('name_kata').value.trim();
  if (!nameKata) { alert('名前（カタカナ）を入力してください。'); return; }
  if (!_gasUrl || _gasUrl === 'YOUR_GAS_URL_HERE') {
    alert('エラー：先生にGASのURLを設定してもらってください。');
    return;
  }

  const btn = document.getElementById('send-btn');
  const status = document.getElementById('send-status');
  btn.disabled = true;
  btn.textContent = '⏳ 送信中...';
  status.style.color = '#555';
  status.textContent = '';

  // 自由記述収集（テスト固有）
  let freeAnswers = {};
  if (typeof window.collectFreeAnswers === 'function') {
    freeAnswers = window.collectFreeAnswers();
  }

  const payload = {
    timestamp:     new Date().toLocaleString('ja-JP'),
    test_date:     document.getElementById('test_date').value,
    name_kata:     nameKata,
    name_latin:    document.getElementById('name_latin').value.trim(),
    class_name:    document.getElementById('class_name').value.trim(),
    company:       document.getElementById('company').value.trim(),
    goii_auto:     _scores.goii,
    bunpo_auto:    _scores.bunpo,
    chokkai_auto:  _scores.chokkai,
    leave_count:   _leaveCount,
    free_answers:  JSON.stringify(freeAnswers),
    field_status:  _fieldStatus,
  };

  try {
    await fetch(_gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    btn.textContent = '✅ 送信済み';
    btn.style.background = '#aaa';
    status.style.color = '#27ae60';
    status.innerHTML = '✅ 結果を送信しました！先生が確認します。<br><small>（' + new Date().toLocaleString('ja-JP') + '）</small>';
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '📤 結果を先生に送信する';
    status.style.color = '#c0392b';
    status.textContent = '❌ 送信に失敗しました。もう一度試してください。';
  }
};

// ===== リセット（ユーザー操作用） =====
TF.resetAll = function() {
  if (!confirm('すべての回答をリセットしますか？')) return;
  _silentReset();
};

// ===== パズル共通ヘルパー（文法Q3 並べ替え） =====
TF.initWordPuzzles = function(containerId, wordSets, hiddenPrefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  wordSets.forEach((words, qi) => {
    const n = qi + 1;
    const wrap = document.createElement('div');
    wrap.className = 'puzzle-wrap';
    wrap.innerHTML = `
      <div style="font-weight:bold;font-size:13px;color:#1a5276;margin-bottom:6px">${n}）</div>
      <div class="puzzle-label">Nhấn để chọn từ</div>
      <div class="puzzle-pool" id="pool_${hiddenPrefix}_${n}"></div>
      <div class="puzzle-label">Câu trả lời &nbsp;<button type="button" onclick="TestFramework.clearPuzzle('${hiddenPrefix}',${n})" style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid #bbb;background:#fff;cursor:pointer;color:#555">↺ Xóa</button></div>
      <div class="puzzle-answer" id="ans_${hiddenPrefix}_${n}"></div>
    `;
    container.appendChild(wrap);

    [...words].sort(() => Math.random() - 0.5).forEach(word => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'word-tile';
      tile.textContent = word;
      tile.onclick = () => TF.moveToAnswer(tile, hiddenPrefix, n);
      document.getElementById(`pool_${hiddenPrefix}_${n}`).appendChild(tile);
    });
  });
};

TF.moveToAnswer = function(tile, prefix, n) {
  document.getElementById(`ans_${prefix}_${n}`).appendChild(tile);
  tile.onclick = () => TF.moveToPool(tile, prefix, n);
  TF.updatePuzzleHidden(prefix, n);
};

TF.moveToPool = function(tile, prefix, n) {
  document.getElementById(`pool_${prefix}_${n}`).appendChild(tile);
  tile.onclick = () => TF.moveToAnswer(tile, prefix, n);
  TF.updatePuzzleHidden(prefix, n);
};

TF.clearPuzzle = function(prefix, n) {
  const pool = document.getElementById(`pool_${prefix}_${n}`);
  Array.from(document.getElementById(`ans_${prefix}_${n}`).querySelectorAll('.word-tile')).forEach(t => {
    t.onclick = () => TF.moveToAnswer(t, prefix, n);
    pool.appendChild(t);
  });
  TF.updatePuzzleHidden(prefix, n);
};

TF.updatePuzzleHidden = function(prefix, n) {
  const tiles = document.getElementById(`ans_${prefix}_${n}`).querySelectorAll('.word-tile');
  const hidden = document.getElementById(prefix + '_' + n);
  if (hidden) hidden.value = Array.from(tiles).map(t => t.textContent).join('');
};

})();
