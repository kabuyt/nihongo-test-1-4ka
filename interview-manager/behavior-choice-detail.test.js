const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const behaviorFunctions = appSource.match(
  /function behaviorAnswerItems[\s\S]+?(?=function behaviorSummary)/
);
assert.ok(behaviorFunctions, '行動選択の表示関数を app.js から取得できること');

const context = {
  QUESTIONS: Array.from({ length: 6 }, (_, index) => ({
    n: index + 1,
    ja: `テスト設問${index + 1}`,
    choices: Array.from({ length: 4 }, (_unused, choiceIndex) => ({
      id: choiceIndex + 1,
      ja: `選択肢${choiceIndex + 1}${index === 0 && choiceIndex === 0 ? '<確認>' : ''}`,
      analysis: `分析${choiceIndex + 1}`,
    })),
  })),
  numeric(value) {
    if (value === '' || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};
vm.createContext(context);
vm.runInContext(`${behaviorFunctions[0]}\nthis.behaviorAnswerItems = behaviorAnswerItems; this.behaviorChoicesHtml = behaviorChoicesHtml; this.behaviorPrintChoicesHtml = behaviorPrintChoicesHtml;`, context);

const record = { q1: 4, q2: 2, q3: 1, q4: 3, q5: 3, q6: 3 };
const items = context.behaviorAnswerItems(record);

assert.equal(items.length, 6, '6問すべてを復元すること');
for (const item of items) {
  assert.equal(item.choices.length, 4, `設問${item.number}の4選択肢をすべて返すこと`);
  assert.equal(
    item.choices.filter(choice => choice.selected).length,
    1,
    `設問${item.number}の選択済み表示が1件だけであること`
  );

  const html = context.behaviorChoicesHtml(item);
  assert.equal((html.match(/behavior-choice selected/g) || []).length, 1);
  assert.equal((html.match(/behavior-choice unselected/g) || []).length, 3);
  item.choices.forEach(choice => assert.ok(html.includes(context.escapeHtml(choice.label))));

  const printHtml = context.behaviorPrintChoicesHtml(item);
  assert.equal((printHtml.match(/pb-option selected/g) || []).length, 1);
  assert.equal((printHtml.match(/pb-option unselected/g) || []).length, 3);
  item.choices.forEach(choice => assert.ok(printHtml.includes(context.escapeHtml(choice.label))));
}

console.log('behavior choice detail tests: ok');
