const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 回答シートの描画に要る関数・定数だけを app.js から取り出して動かす（math-answer-sheet.test.js と同じ方式）
const pick = pattern => {
  const found = appSource.match(pattern);
  assert.ok(found, `app.js から取得できること: ${pattern}`);
  return found[0];
};
const vietBlock = pick(/const VIET_CATEGORIES[\s\S]+?(?=\nfunction printTestGuide)/);
const helpers = [
  /function escapeHtml\([\s\S]+?\n\}/,
  /function normalizeLatinName\([\s\S]+?\n\}/,
  /function splitCandidateName\([\s\S]+?\n\}/,
  /function candidateLabel\([\s\S]+?\n\}/,
  /function formatInterviewName\([\s\S]+?\n\}/,
  /function formatScore\([\s\S]+?\n\}/,
].map(pick);

const context = { document: { querySelector: () => null }, $: () => ({}), window: {} };
vm.createContext(context);
vm.runInContext(
  `${helpers.join('\n')}\n${vietBlock}\nthis.render = vietnameseAnswerSheetHtml;\nthis.VIET_CATEGORIES = VIET_CATEGORIES;\nthis.VIET_QUESTION_JA = VIET_QUESTION_JA;\nthis.vietnameseAnalysis = vietnameseAnalysis;`,
  context
);

// 本番の questions.js のカテゴリ割当と同じ（word_class 7 / connective 4 / sentence 4 / meaning 3 / pronoun 2）
const CATEGORY_BY_ID = {
  1: 'connective', 2: 'sentence', 3: 'word_class', 4: 'sentence', 5: 'word_class',
  6: 'word_class', 7: 'word_class', 8: 'word_class', 9: 'sentence', 10: 'sentence',
  11: 'meaning', 12: 'meaning', 13: 'pronoun', 14: 'meaning', 15: 'connective',
  16: 'connective', 17: 'connective', 18: 'pronoun', 19: 'word_class', 20: 'word_class',
};
assert.equal(Object.keys(CATEGORY_BY_ID).length, 20);

// 全問正解のフェイク回答記録を作る。overrideIds に含まれるidはok:falseにする
function makeAnswers(overrideIds = []) {
  const bad = new Set(overrideIds);
  return Object.keys(CATEGORY_BY_ID).map(key => {
    const id = Number(key);
    const item = { id, category: CATEGORY_BY_ID[id], given: 'A', correct: 'A', ok: !bad.has(id) };
    if (id === 5) {
      item.labels = ['Tính từ', 'Động từ'];
      item.given = '1,1';
      item.correct = '1,1';
    }
    return item;
  });
}

function makeRecord(overrideIds, extra = {}) {
  const answers = makeAnswers(overrideIds);
  const correct = answers.filter(a => a.ok).length;
  return { v: 1, submitted_at: '2026-09-21T02:00:00.000Z', score: Number((correct / 20 * 100).toFixed(1)), correct, total: 20, answers, ...extra };
}

const interview = { company: '株式会社サンプル', date: '2026-09-21' };

// ケース1: 全問正解 → 見出し・全カテゴリ・20行・日本語要約・VN文なし・強い（分析セクションの並び順）
{
  const record = makeRecord([]);
  const candidate = { no: '1', name: 'サンプル　ワン / SAMPLE ONE', vietnameseAnswers: record };
  const out = context.render(interview, candidate);

  assert.match(out, /ベトナム国語テスト 回答/, '見出しが出ること');
  assert.match(out, /このテストについて/, '冒頭にテストの概要が出ること');
  assert.match(out, /日本語の文法も理解しやすく/, '概要にテストの意義を書くこと');
  assert.equal((out.match(/class="vs-vi"/g) || []).length, 3, '出題例を3問（原文つき）載せること');
  assert.ok(out.indexOf('ms-summary') < out.indexOf('このテストについて'), '候補者・得点の欄はタイトル直下（概要より前）に置くこと');
  assert.match(out, /ベトナムの小学生が学校で解く問題/, '概要に出題元（ベトナムの小学生向けの問題）を書くこと');
  assert.match(out, /No\.1　サンプル　ワン/, '候補者番号とカタカナ氏名が出ること');
  assert.match(out, /<strong>100点<\/strong>/, '得点が出ること（切り上げしない100点）');

  // 5カテゴリの見出しが順番通りに出ること
  const labels = context.VIET_CATEGORIES.map(c => c.label);
  let lastIndex = -1;
  labels.forEach(label => {
    const idx = out.indexOf(label);
    assert.ok(idx >= 0, `カテゴリ見出し「${label}」が出ること`);
    assert.ok(idx > lastIndex, `カテゴリ見出しがVIET_CATEGORIES順であること（${label}）`);
    lastIndex = idx;
  });

  // 20行（問番号1〜20が本文に出る）
  for (let id = 1; id <= 20; id++) {
    assert.match(out, new RegExp(`<td class="ms-no">${id}</td>`), `第${id}問の行があること`);
  }

  // 設問の日本語要約が出ること
  assert.match(out, /関係詞（接続語）の使い方が誤っている文を選ぶ/, '第1問の日本語要約が出ること');
  assert.match(out, /文中の形容詞と動詞の数を数える/, '第5問の日本語要約が出ること');

  // ベトナム語の原文・選択肢・回答は出さないこと
  assert.doesNotMatch(out, /Câu văn/, 'ベトナム語の設問文をそのまま出さないこと');
  assert.doesNotMatch(out, /Tính từ/, 'ベトナム語の選択肢を出さないこと');
  assert.doesNotMatch(out, /本人の回答/, '本人の回答の列を出さないこと');
  assert.doesNotMatch(out, /正解<\/th>/, '正解の列を出さないこと');

  // 1人1枚に収めるため末尾の注記は出さない（2026-09-29 Kabuさん指示）
  assert.doesNotMatch(out, /設問はベトナム語の文法問題です/, '末尾の注記を出さないこと');
}

// ケース2: connective(1,15,16,17)を全滅させる → 苦手は「関係詞・接続の表現」のみ
{
  const record = makeRecord([1, 15, 16, 17]);
  const candidate = { no: '2', name: 'サンプル　ツー / SAMPLE TWO', vietnameseAnswers: record };
  const analysis = context.vietnameseAnalysis(record.answers);
  assert.deepEqual(Array.from(analysis.weak), ['関係詞・接続の表現'], '関係詞・接続の表現(4問)が全滅なら苦手はそこだけであること');

  const out = context.render(interview, candidate);
  assert.match(out, /苦手<\/b>関係詞・接続の表現/, '回答シートの分析にも苦手が出ること');
  // 16/20 = 80% → midHighの書き出し
  assert.match(out, /母語の文法の基礎はおおむね身についています。/, '正答率80%はmidHighの書き出しであること');
}

// ケース3: 全問正解 → high、全問不正解 → low
{
  const highAnalysis = context.vietnameseAnalysis(makeAnswers([]));
  assert.equal(highAnalysis.comment, '母語の文法をよく理解しています。', '全問正解はhighの書き出しのみであること');

  const allBad = Object.keys(CATEGORY_BY_ID).map(Number);
  const lowAnalysis = context.vietnameseAnalysis(makeAnswers(allBad));
  assert.ok(lowAnalysis.comment.startsWith('母語の文法の基礎が十分ではありません。'), '全問不正解はlowの書き出しであること');
}

// ケース4: 未回答が5問以上あれば件数を明記すること
{
  const answers = makeAnswers([]);
  [2, 4, 9, 10, 11].forEach(id => {
    const item = answers.find(a => a.id === id);
    item.given = '';
    item.ok = false;
  });
  const analysis = context.vietnameseAnalysis(answers);
  assert.equal(analysis.unanswered, 5, '空欄5問がunansweredに数えられること');
  assert.match(analysis.comment, /未回答が5問あります。/, '未回答5問以上でコメントに件数が出ること');
}

// 印刷: 数学と同じ .math-sheet の枠に乗せていること（印刷CSSがそのまま効く）
assert.match(context.render(interview, { no: '9', name: 'テスト', vietnameseAnswers: makeRecord([]) }), /<article class="math-sheet viet-sheet">/, '数学と同じmath-sheetクラスに乗せていること');

// ボタンの存在（トップの一括印刷ボタン）
assert.match(html, /id="print-viet-btn"/, '「国語の回答」ボタンがあること');
assert.match(html, /id="print-math"/, '回答シート専用の印刷の置き場（数学と共用）があること');
assert.match(html, /id="math-dialog"/, 'ダイアログ（数学と共用）があること');

// 日本語学習への見通し: 関係詞・接続が全問誤答 → 苦労しそうな点に接続表現の文が出る。得意分野のメリットも出る
{
  const candidate = { no: '2', name: 'サンプル　ツー / SAMPLE TWO', vietnameseAnswers: makeRecord([1, 15, 16, 17]) };
  const out = context.render(interview, candidate);
  assert.match(out, /日本語学習への見通し/, '見通しの見出しが出ること');
  assert.match(out, /<b>苦労しそうな点<\/b>理由・逆接・条件をつなぐ表現/, '苦手分野から苦労しそうな点を出すこと');
  assert.match(out, /<b>メリット<\/b>/, '得意分野からメリットを出すこと');
  assert.ok((out.match(/class="is-plus"/g) || []).length <= 2, 'メリットは2つまで');
  const noOverview = context.render(interview, candidate, { overview: false });
  assert.doesNotMatch(noOverview, /このテストについて/, 'overview:false では概要を出さないこと');
  assert.match(out, /このテストについて/, '既定（1人分・先頭）では概要を出すこと');
}
assert.match(appSource, /vietnameseAnswerSheetHtml\(interview, candidate, \{ overview: index === 0 \}\)/, '全員分の印刷では先頭の1人だけに概要を出すこと');

console.log('vietnamese-answer-sheet: ok');
