const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const orderFunction = appSource.match(
  /function scoreEntryRows[\s\S]+?(?=\nfunction renderStatus)/
);
assert.ok(orderFunction, '管理表用の並び順関数を app.js から取得できること');

const context = {};
vm.createContext(context);
vm.runInContext(`${orderFunction[0]}\nthis.scoreEntryRows = scoreEntryRows;`, context);

const rankedRows = [
  { no: '10', finalRank: 1 },
  { no: '2', finalRank: 3 },
  { no: '1', finalRank: 2 },
];
const inputRows = context.scoreEntryRows(rankedRows);

assert.deepEqual(Array.from(inputRows, row => row.no), ['1', '2', '10']);
assert.deepEqual(Array.from(rankedRows, row => row.no), ['10', '2', '1'], '順位順の元配列を変更しないこと');
assert.equal(inputRows.find(row => row.no === '10').finalRank, 1, '順位値そのものは維持すること');

assert.match(appSource, /const rankedRows = buildRows\(interview\);\s+const rows = scoreEntryRows\(rankedRows\);/);
assert.match(appSource, /renderPrintReport\(interview, rankedRows\);/);

console.log('score entry order tests: ok');
