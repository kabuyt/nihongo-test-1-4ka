const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 分析結果ブロックに要る関数・定数だけを app.js から取り出して動かす
const pick = pattern => {
  const found = appSource.match(pattern);
  assert.ok(found, `app.js から取得できること: ${pattern}`);
  return found[0];
};
const helpers = [
  /const MATH_SECTIONS = \[[\s\S]+?\n\];/,
  /function escapeHtml\([\s\S]+?\n\}/,
  /function mathAnalysis\([\s\S]+?\n\}/,
  /function mathAnalysisHtml\([\s\S]+?\n\}/,
].map(pick);

const context = {};
vm.createContext(context);
vm.runInContext(
  `${helpers.join('\n')}\nthis.mathAnalysis = mathAnalysis;\nthis.mathAnalysisHtml = mathAnalysisHtml;\nthis.MATH_SECTIONS = MATH_SECTIONS;`,
  context
);

const makeAnswers = overrides => {
  // 30問、既定は全問正解。overrides[id] で given/correct/ok を上書きする
  const answers = [];
  for (let id = 1; id <= 30; id++) {
    const o = overrides[id] || {};
    answers.push({
      id,
      given: o.given !== undefined ? o.given : '1',
      correct: '1',
      ok: o.ok !== undefined ? o.ok : true,
    });
  }
  return answers;
};

// ケース1: 全問正解 → 7分野すべて得意、苦手なし
{
  const answers = makeAnswers({});
  const result = context.mathAnalysis(answers);
  assert.equal(result.strong.length, 7, '全問正解なら7分野すべてが得意になること');
  assert.equal(result.weak.length, 0, '全問正解なら苦手はないこと');
  assert.equal(result.comment, '全体としてよく理解できています。', '全問正解時のコメントは追加文なしであること');
}

// ケース2: 21,22(方程式) + 28(応用) が誤答、他は正解 → 苦手は方程式のみ
{
  const answers = makeAnswers({
    21: { ok: false, given: '0' },
    22: { ok: false, given: '0' },
    28: { ok: false, given: '0' },
  });
  const result = context.mathAnalysis(answers);
  // vmの別レルムで作られた配列は Array だが constructor が別物なので Array.from で正規化してから比較する
  assert.deepEqual(Array.from(result.weak), ['方程式'], '方程式(21,22)が全滅なら苦手は方程式のみであること');
  assert.ok(result.comment.startsWith('全体としてよく理解できています。'), '27/30正解(90%)なら冒頭は「よく理解」であること');
  assert.ok(result.comment.includes('方程式は未定着です'), '苦手分野への言及が含まれること');
}

// ケース3: 10問を空欄(given: '')にして誤答 → 未回答10問と明記
{
  const overrides = {};
  for (let id = 1; id <= 10; id++) overrides[id] = { given: '', ok: false };
  const answers = makeAnswers(overrides);
  const result = context.mathAnalysis(answers);
  assert.equal(result.unanswered, 10, '空欄10問がunansweredに数えられること');
  assert.ok(result.comment.includes('未回答が10問あります。'), '未回答5問以上でコメントに件数が出ること');
}

// ケース4: 全問不正解 → 冒頭は「基礎の計算から復習が必要です。」
{
  const overrides = {};
  for (let id = 1; id <= 30; id++) overrides[id] = { ok: false, given: '9' };
  const answers = makeAnswers(overrides);
  const result = context.mathAnalysis(answers);
  assert.ok(result.comment.startsWith('基礎の計算から復習が必要です。'), '全問不正解時の冒頭コメントであること');
}

// mathAnswerSheetHtml が ms-summary と ms-table の間で mathAnalysisHtml( を呼んでいること
{
  const sheetFn = appSource.match(/function mathAnswerSheetHtml\([\s\S]+?\n\}/)[0];
  const summaryIndex = sheetFn.indexOf('ms-summary');
  const analysisIndex = sheetFn.indexOf('mathAnalysisHtml(');
  const tableIndex = sheetFn.indexOf('ms-table');
  assert.ok(summaryIndex >= 0 && analysisIndex >= 0 && tableIndex >= 0, '3つの目印がすべて見つかること');
  assert.ok(summaryIndex < analysisIndex && analysisIndex < tableIndex, 'mathAnalysisHtml(...)がms-summaryとms-tableの間で呼ばれていること');
}

// ケース5: 苦手がある人のコメントは苦手だけを言う（得意は「得意」行に並ぶので繰り返さない）
{
  const result = context.mathAnalysis(makeAnswers({ 17: { ok: false }, 18: { ok: false } }));
  assert.equal(result.comment, '全体としてよく理解できています。比は未定着です。', '苦手がある場合は得意分野を列挙しないこと');
}

// ケース6: 苦手がなければ、コメントは全体の一文だけ（得意の列挙はしない）
{
  const result = context.mathAnalysis(makeAnswers({ 1: { ok: false }, 2: { ok: false }, 3: { ok: false }, 23: { ok: false }, 24: { ok: false } }));
  assert.equal(result.weak.length, 0, '苦手なし');
  assert.equal(result.comment, '基礎はおおむね身についています。');
}

console.log('math-analysis tests: ok');
