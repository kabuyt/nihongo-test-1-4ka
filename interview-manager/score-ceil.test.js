const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 数学・日本語単語の切り上げに要る関数だけを app.js から取り出して動かす
const pick = pattern => {
  const found = appSource.match(pattern);
  assert.ok(found, `app.js から取得できること: ${pattern}`);
  return found[0];
};
const helpers = [
  /function numeric\([\s\S]+?\n\}/,
  /function ceilScore\([\s\S]+?\n\}/,
  /function japaneseTo100\([\s\S]+?\n\}/,
].map(pick);

const context = {};
vm.createContext(context);
vm.runInContext(
  `${helpers.join('\n')}\nthis.numeric = numeric;\nthis.ceilScore = ceilScore;\nthis.japaneseTo100 = japaneseTo100;`,
  context
);

// 日本語単語（30問→100点換算）は切り上げ
assert.equal(context.japaneseTo100(29), 97, '29/30 → 96.66… は97に切り上げ');
assert.equal(context.japaneseTo100(27), 90, '27/30 → 90はそのまま90');
assert.equal(context.japaneseTo100(30), 100, '30/30 → 100はそのまま100');
assert.equal(context.japaneseTo100(0), 0, '0/30 → 0はそのまま0');
assert.equal(context.japaneseTo100(1), 4, '1/30 → 3.33… は4に切り上げ');
assert.equal(context.japaneseTo100(''), context.numeric(''), "空文字は numeric('') と同じ(null)扱い");
assert.equal(context.japaneseTo100(''), null, '空文字はnull');

// ceilScore単体の挙動
assert.equal(context.ceilScore(96.7), 97, '96.7は97に切り上げ');
assert.equal(context.ceilScore(70), 70, '整数70はそのまま70');
assert.equal(context.ceilScore(70.00000000000001), 70, '浮動小数の誤差70.00000000000001は70のまま(71にならない)');
assert.equal(context.ceilScore(13.3), 14, '13.3は14に切り上げ');
assert.equal(context.ceilScore(null), null, 'nullはnullのまま');

// buildRows内で math だけ ceilScore を通し、vietnamese は従来通り numeric のみであること
assert.match(
  appSource,
  /math: ceilScore\(numeric\(score\.math\)\),/,
  'buildRowsのmathがceilScore(numeric(...))になっていること'
);
assert.match(
  appSource,
  /vietnamese: numeric\(score\.vietnamese\),/,
  'buildRowsのvietnameseは従来通りnumericのみであること'
);

console.log('score ceil tests: ok');
