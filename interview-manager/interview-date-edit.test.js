const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const styleSource = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const dateFunction = appSource.match(
  /function isValidInterviewDate[\s\S]+?(?=\nasync function updateInterviewDate)/
);
const updateFunction = appSource.match(
  /async function updateInterviewDate[\s\S]+?(?=\nasync function updateInterviewTestSetting)/
);

assert.ok(dateFunction, '面接日の検証関数を app.js から取得できること');
assert.ok(updateFunction, '面接日の保存関数を app.js から取得できること');

const interview = { id: 'session-1', date: '2026-09-15' };
const input = { value: '', disabled: false };
let admin = true;
let updateCall = null;
let nextError = null;
let renderCount = 0;
const alerts = [];
const context = {
  Date,
  activeInterview: () => interview,
  isAdminUser: () => admin,
  $: selector => selector === '#active-date' ? input : null,
  alert: message => alerts.push(message),
  render: () => { renderCount += 1; },
  supabase: {
    from(table) {
      assert.equal(table, 'interview_sessions');
      return {
        update(payload) {
          return {
            async eq(column, id) {
              updateCall = { payload, column, id };
              return { error: nextError };
            },
          };
        },
      };
    },
  },
};
vm.createContext(context);
vm.runInContext(`${dateFunction[0]}\n${updateFunction[0]}\nthis.isValidInterviewDate = isValidInterviewDate; this.updateInterviewDate = updateInterviewDate;`, context);

assert.equal(context.isValidInterviewDate('2026-09-18'), true);
assert.equal(context.isValidInterviewDate('2026-02-29'), false);
assert.equal(context.isValidInterviewDate('2024-02-29'), true);
assert.equal(context.isValidInterviewDate('2026-13-01'), false);
assert.equal(context.isValidInterviewDate(''), false);

(async () => {
  await context.updateInterviewDate('2026-09-18');
  assert.equal(JSON.stringify(updateCall), JSON.stringify({
    payload: { interview_date: '2026-09-18' },
    column: 'id',
    id: 'session-1',
  }));
  assert.equal(interview.date, '2026-09-18');
  assert.equal(input.disabled, false);
  assert.equal(renderCount, 1);

  updateCall = null;
  await context.updateInterviewDate('2026-09-18');
  assert.equal(updateCall, null, '同じ日付ではDB更新しないこと');

  input.value = '2026-02-29';
  await context.updateInterviewDate('2026-02-29');
  assert.equal(input.value, '2026-09-18', '不正な日付は現在値へ戻すこと');
  assert.match(alerts.at(-1), /正しい面接日/);

  admin = false;
  updateCall = null;
  await context.updateInterviewDate('2026-09-19');
  assert.equal(updateCall, null, '管理者以外はDB更新しないこと');
  admin = true;

  nextError = { message: 'denied' };
  input.value = '2026-09-20';
  await context.updateInterviewDate('2026-09-20');
  assert.equal(interview.date, '2026-09-18');
  assert.equal(input.value, '2026-09-18', '保存失敗時は以前の日付へ戻すこと');
  assert.match(alerts.at(-1), /面接日の保存に失敗しました: denied/);

  assert.match(indexSource, /id="active-date" type="date"/);
  assert.match(indexSource, /id="active-date-display"/);
  assert.match(styleSource, /\.active-meta input\[type="date"\]/);
  assert.match(appSource, /#active-date'\)\.addEventListener\('change'/);

  console.log('interview date edit tests: ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
