const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 回答シートの描画に要る関数と定数だけを app.js から取り出して動かす
const pick = pattern => {
  const found = appSource.match(pattern);
  assert.ok(found, `app.js から取得できること: ${pattern}`);
  return found[0];
};
const sheetBlock = pick(/const MATH_TEST_ASSET_BASE[\s\S]+?(?=\nfunction openMathAnswers)/);
const helpers = [
  /function escapeHtml\([\s\S]+?\n\}/,
  /function normalizeLatinName\([\s\S]+?\n\}/,
  /function splitCandidateName\([\s\S]+?\n\}/,
  /function candidateLabel\([\s\S]+?\n\}/,
  /function withHonorific\([\s\S]+?\n\}/,
  /function formatInterviewName\([\s\S]+?\n\}/,
  /function formatScore\([\s\S]+?\n\}/,
  /function ceilScore\([\s\S]+?\n\}/,
  /function numeric\([\s\S]+?\n\}/,
].map(pick);

const context = {};
vm.createContext(context);
vm.runInContext(`${helpers.join('\n')}\n${sheetBlock}\nthis.render = mathAnswerSheetHtml;\nthis.mathFractionHtml = mathFractionHtml;`, context);

const record = {
  v: 1, submitted_at: '2026-09-17T02:14:00.000Z', score: 60, correct: 2, total: 30,
  answers: [
    { id: 12, math: '0.7(6x − 1) + 1.4(8x − 2)', given: '15.4x + -0.7', correct: '15.4x + -3.5', ok: false },
    { id: 20, math: '0.8 : 3.6 = 26 : □', given: '', correct: '117', ok: false },
    { id: 24, prompt: 'Hình lăng trụ ngũ giác sau có bao nhiêu mặt?', image: 'assets/q24_prism.png', suffix: 'mặt', given: '7', correct: '7', ok: true },
    { id: 28, prompt: 'y tỷ lệ thuận với x.', prefix: 'y =', suffix: 'x', given: '9', correct: '9', ok: true },
    { id: 30, prompt: 'Tam giác ABC', options: ['AB ⊥ AC', 'BC ⊥ AH'], given: 'BC ⊥ AH', correct: 'BC ⊥ AH', ok: true },
  ],
};
const interview = { company: '株式会社サンプル', date: '2026-09-17' };
const candidate = { no: '1', name: 'サンプル　ワン / SAMPLE ONE', mathAnswers: record };
const out = context.render(interview, candidate);

assert.match(out, /数学テスト 回答/, '見出しが出ること');
assert.match(out, /株式会社サンプル/, '面接名（会社名）が出ること');
assert.match(out, /No\.1　サンプル　ワン/, '候補者番号とカタカナ氏名が出ること');
assert.match(out, /<strong>60点<\/strong>/, '得点が出ること');
assert.match(context.render(interview, { ...candidate, mathAnswers: { ...record, score: 86.7 } }), /<strong>87点<\/strong>/, '回答シートの得点も順位表と同じく切り上げること');
assert.match(out, /1\. 次の計算をしなさい。/, '節の見出しを日本語で出すこと');
assert.match(out, /15\.4x − 3\.5/, '「x + -3.5」を「x − 3.5」に整えること');
assert.doesNotMatch(out, /x \+ -/, '「+ -」の表記を残さないこと');
assert.match(out, /（未回答）/, '空欄は未回答と出すこと');
assert.match(out, /7面/, 'ベトナム語の単位を日本語にすること');
assert.match(out, /y = 9x/, '答え欄の前後の文字を付けること');
assert.match(out, /src="\.\.\/math-test\/assets\/q24_prism\.png"/, '図は math-test の画像を参照すること');
assert.match(out, /選択肢：AB ⊥ AC　BC ⊥ AH/, '選択問題は選択肢を出すこと');
assert.match(out, /この五角柱の面はいくつありますか/, '問題文を日本語で出すこと');
assert.doesNotMatch(out, /Hình lăng trụ/, 'ベトナム語の設問文をそのまま出さないこと');

// 印刷: 順位のPDFとは別に、A4縦・1人ずつ改ページで出す
assert.match(css, /@page mathsheet\s*\{\s*size:\s*210mm 297mm;/, '回答シートはA4縦で印刷すること');
assert.match(css, /body\.printing-math \.print-report\s*\{\s*display:\s*none;/, '回答シートの印刷時は順位のPDFを隠すこと');
assert.match(css, /body\.printing-math \.print-math\s*\{[^}]*display:\s*block;[^}]*page:\s*mathsheet;/s, '回答シートだけを印刷すること');
assert.match(css, /body\.printing-math \.math-sheet \+ \.math-sheet\s*\{[^}]*break-before:\s*page;/s, '全員分では2人目以降を改ページすること');
// 画面の候補者表の table 指定（幅1960px・列固定）が漏れないこと
assert.match(css, /\.math-sheet table\.ms-table\s*\{[^}]*min-width:\s*0;/, '回答シートの表に候補者表の最小幅を効かせないこと');
assert.match(html, /id="print-math-btn"/, '順位のPDFとは別の「数学の回答」ボタンがあること');
assert.match(html, /id="print-math"/, '回答シート専用の印刷の置き場があること');
assert.doesNotMatch(
  appSource.match(/function renderPrintReport[\s\S]+?(?=\nfunction )/)[0],
  /mathAnswerSheetHtml/,
  '順位のPDFに数学の回答を混ぜないこと'
);

// 分数の縦書き表示（mathFractionHtml）
const mf = context.mathFractionHtml;
const mixed1 = mf('3 3/20 × 2/15');
assert.match(mixed1, /mf-mixed">3<span class="mf"><span class="mf-n">3<\/span><span class="mf-d">20<\/span>/, '帯分数「3 3\/20」が整数＋縦書き分数になること');
assert.match(mixed1, /<span class="mf"><span class="mf-n">2<\/span><span class="mf-d">15<\/span><\/span>/, '残りの単純分数「2\/15」も縦書きになること');

const eq = mf('(2x − 3)/5 = (9x + 5)/4');
assert.match(eq, /<span class="mf-n">2x − 3<\/span><span class="mf-d">5<\/span>/, '括弧つき分子(2x − 3)\/5が縦書きになること');
assert.match(eq, /<span class="mf-n">9x \+ 5<\/span><span class="mf-d">4<\/span>/, '括弧つき分子(9x + 5)\/4が縦書きになること');
assert.doesNotMatch(eq, /\d\/\d/, '括弧つき分数を変換した後に生の「n\/d」表記が残らないこと');

const paren = mf('84 × ( 7/12 − 10/21 )');
assert.equal((paren.match(/class="mf"/g) || []).length, 2, '「( 7/12 − 10/21 )」は単純分数2つとして数えること');
assert.doesNotMatch(paren, /mf-mixed/, '「( 7/12」は帯分数として誤変換しないこと');

const ratio = mf('3 : 4 = 12 : □');
assert.doesNotMatch(ratio, /class="mf"/, '比「12 : □」は分数として変換しないこと');

const neg = mf('-3/4');
assert.match(neg, /^-<span class="mf"><span class="mf-n">3<\/span><span class="mf-d">4<\/span><\/span>$/, '負の分数「-3\/4」は符号のあとに縦書き分数が続くこと');

assert.doesNotMatch(mf('15.4x − 3.5'), /class="mf"/, '小数「15.4x − 3.5」は分数として変換しないこと');

assert.equal(mf('<b>1/2</b>'), '&lt;b&gt;<span class="mf"><span class="mf-n">1</span><span class="mf-d">2</span></span>&lt;/b&gt;', 'タグはエスケープしつつ中の分数だけ縦書きにすること');

console.log('math-answer-sheet: ok');
