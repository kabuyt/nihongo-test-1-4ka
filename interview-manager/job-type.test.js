const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const styleSource = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

const pick = pattern => {
  const found = appSource.match(pattern);
  assert.ok(found, `app.js から取得できること: ${pattern}`);
  return found[0];
};

// ===== 1. interviewFromDb が job_type を jobType にマッピングすること =====
{
  const interviewFromDbFn = pick(/function interviewFromDb\([\s\S]+?\n\}/);
  const candidateFromDbFn = pick(/function candidateFromDb\([\s\S]+?\n\}/);
  const normalizeTestSettingsFn = pick(/function normalizeTestSettings\([\s\S]+?\n\}/);
  const context = { TEST_DEFINITIONS: null };
  vm.createContext(context);
  const testDefs = pick(/const TEST_DEFINITIONS = \[[\s\S]+?\n\];/);
  vm.runInContext(
    `${testDefs}\n${normalizeTestSettingsFn}\n${candidateFromDbFn}\n${interviewFromDbFn}\nthis.interviewFromDb = interviewFromDb;`,
    context
  );

  const rowWithJobType = { id: 's1', interview_date: '2026-09-28', company: '株式会社サンプル', job_type: '塗装', sender_org: 'BARAEN', test_settings: null, archived: false, created_at: '2026-09-01' };
  const interview = context.interviewFromDb(rowWithJobType, new Map());
  assert.equal(interview.jobType, '塗装', 'job_type を jobType として取り込むこと');

  const rowWithoutJobType = { ...rowWithJobType, job_type: null };
  const interview2 = context.interviewFromDb(rowWithoutJobType, new Map());
  assert.equal(interview2.jobType, '', 'job_type が無い場合は空文字であること');
}

// ===== 2. createInterview が job_type を insert に含めること（管理者ガード込み） =====
{
  const createInterviewFn = pick(/async function createInterview\([\s\S]+?\n\}/);
  const values = {
    '#interview-date': { value: '2026-09-28' },
    '#interview-company': { value: '  株式会社サンプル  ' },
    '#interview-job-type': { value: '  塗装  ' },
    '#candidate-count': { value: '1' },
    '#interview-sender': { value: 'BARAEN' },
  };
  let insertPayload = null;
  let admin = true;
  const alerts = [];
  const context = {
    alert: message => alerts.push(message),
    state: { dbReady: true, interviews: [], activeId: '' },
    isAdminUser: () => admin,
    currentUser: () => ({ role: 'admin' }),
    $: selector => values[selector],
    document: { querySelectorAll: selector => (selector === 'input[name="create-test"]:checked' ? [{ value: 'math' }] : []) },
    TEST_DEFINITIONS: [{ key: 'math', label: '数学', ranked: true }],
    interviewFromDb: (row) => ({ id: row.id, jobType: row.job_type || '', candidates: [] }),
    createCandidate: async () => ({}),
    saveActiveId: () => {},
    render: () => {},
    supabase: {
      from(table) {
        assert.equal(table, 'interview_sessions');
        return {
          insert(payload) {
            insertPayload = payload;
            return {
              select() {
                return { async single() { return { data: { id: 'new-1', job_type: payload.job_type }, error: null }; } };
              },
            };
          },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(`${createInterviewFn}\nthis.createInterview = createInterview;`, context);

  const fakeEvent = { preventDefault: () => {}, target: { reset: () => {} } };
  vm.runInContext('createInterview', context)(fakeEvent).then(() => {
    assert.equal(insertPayload.job_type, '塗装', 'trimした職種をjob_typeとして送ること');
    assert.equal(context.state.interviews[0].jobType, '塗装');
  });
}
// 空欄のときは null で送ること
{
  const createInterviewFn = pick(/async function createInterview\([\s\S]+?\n\}/);
  const values = {
    '#interview-date': { value: '2026-09-28' },
    '#interview-company': { value: '株式会社サンプル' },
    '#interview-job-type': { value: '   ' },
    '#candidate-count': { value: '1' },
    '#interview-sender': { value: 'BARAEN' },
  };
  let insertPayload = null;
  const context = {
    alert: () => {},
    state: { dbReady: true, interviews: [], activeId: '' },
    isAdminUser: () => true,
    currentUser: () => ({ role: 'admin' }),
    $: selector => values[selector],
    document: { querySelectorAll: selector => (selector === 'input[name="create-test"]:checked' ? [{ value: 'math' }] : []) },
    TEST_DEFINITIONS: [{ key: 'math', label: '数学', ranked: true }],
    interviewFromDb: (row) => ({ id: row.id, jobType: row.job_type || '', candidates: [] }),
    createCandidate: async () => ({}),
    saveActiveId: () => {},
    render: () => {},
    supabase: {
      from() {
        return {
          insert(payload) {
            insertPayload = payload;
            return { select() { return { async single() { return { data: { id: 'new-2', job_type: payload.job_type }, error: null }; } }; } };
          },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(`${createInterviewFn}\nthis.createInterview = createInterview;`, context);
  vm.runInContext('createInterview', context)({ preventDefault: () => {}, target: { reset: () => {} } }).then(() => {
    assert.equal(insertPayload.job_type, null, '職種が空欄ならnullで送ること');
  });
}

// ===== 3. updateInterviewJobType が interview_sessions を job_type で更新すること・管理者ガード =====
{
  const updateFn = pick(/async function updateInterviewJobType[\s\S]+?(?=\nasync function updateInterviewTestSetting)/);
  const interview = { id: 'session-1', jobType: '塗装' };
  const input = { value: '', disabled: false };
  let admin = true;
  let updateCall = null;
  let nextError = null;
  let renderCount = 0;
  const alerts = [];
  const context = {
    activeInterview: () => interview,
    isAdminUser: () => admin,
    $: selector => (selector === '#active-job-type' ? input : null),
    alert: message => alerts.push(message),
    render: () => { renderCount += 1; },
    supabase: {
      from(table) {
        assert.equal(table, 'interview_sessions', '職種の更新もinterview_sessionsテーブルを対象にすること');
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
  vm.runInContext(`${updateFn}\nthis.updateInterviewJobType = updateInterviewJobType;`, context);

  (async () => {
    await context.updateInterviewJobType('  電気機器組立て  ');
    assert.equal(JSON.stringify(updateCall), JSON.stringify({
      payload: { job_type: '電気機器組立て' }, column: 'id', id: 'session-1',
    }), 'trimして job_type で更新すること');
    assert.equal(interview.jobType, '電気機器組立て');
    assert.equal(renderCount, 1);

    updateCall = null;
    await context.updateInterviewJobType('電気機器組立て');
    assert.equal(updateCall, null, '同じ値ではDB更新しないこと');

    updateCall = null;
    await context.updateInterviewJobType('');
    assert.equal(JSON.stringify(updateCall.payload), JSON.stringify({ job_type: null }), '空欄にしたときはnullで保存すること');
    assert.equal(interview.jobType, '');

    admin = false;
    updateCall = null;
    await context.updateInterviewJobType('塗装');
    assert.equal(updateCall, null, '管理者以外はDB更新しないこと');
    admin = true;

    nextError = { message: 'denied' };
    interview.jobType = '既存の職種';
    input.value = '新しい職種';
    await context.updateInterviewJobType('新しい職種');
    assert.equal(interview.jobType, '既存の職種', '保存失敗時はjobTypeを戻すこと');
    assert.equal(input.value, '既存の職種', '保存失敗時は入力欄も以前の値へ戻すこと');
    assert.match(alerts.at(-1), /職種の保存に失敗しました: denied/);

    console.log('job-type: async tests ok');
  })().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

// ===== 4. index.html の要素が揃っていること =====
assert.match(indexSource, /id="interview-job-type"/, '作成フォームに職種の入力欄があること');
assert.match(indexSource, /id="active-job-type"/, '面接中の職種編集用の入力欄があること');
assert.match(indexSource, /id="active-job-type-display"/, '非管理者向けの職種表示欄があること');
assert.match(indexSource, /id="active-job-type-name"/, '職種表示欄の値を入れる場所があること');
// 会社名の直後に職種欄が来ること
assert.match(indexSource, /id="interview-company"[\s\S]*?<\/label>\s*<label>\s*職種/, '職種欄は会社名の直後にあること');

// ===== 5. app.js が bindEvents / render で職種を配線していること =====
assert.match(appSource, /#active-job-type'\)\.addEventListener\('change'/, '職種入力のchangeイベントを配線していること');
assert.match(appSource, /updateInterviewJobType/, 'updateInterviewJobType が定義・使用されていること');
assert.match(appSource, /isAdminUser\(\)/, 'admin判定を使っていること（updateInterviewJobTypeの管理者ガード）');

// ===== 6. 印刷（面接情報欄）に職種が「設定されているときだけ」出ること =====
{
  const printOverviewFn = pick(/function printOverviewJobTypeHtml\([\s\S]+?\n\}/);
  const escapeHtmlFn = pick(/function escapeHtml\([\s\S]+?\n\}/);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${escapeHtmlFn}\n${printOverviewFn}\nthis.printOverviewJobTypeHtml = printOverviewJobTypeHtml;`, context);

  const withJobType = context.printOverviewJobTypeHtml({ jobType: '塗装' });
  assert.match(withJobType, /<span>職種<\/span><strong>塗装<\/strong>/, '職種があればセルが出ること');

  const withoutJobType = context.printOverviewJobTypeHtml({ jobType: '' });
  assert.equal(withoutJobType, '', '職種が空なら空セルを増やさないこと（4列のまま）');

  const noJobTypeAtAll = context.printOverviewJobTypeHtml({});
  assert.equal(noJobTypeAtAll, '', 'jobTypeプロパティが無くても空文字を返すこと');

  // エスケープされていること
  const escaped = context.printOverviewJobTypeHtml({ jobType: '<script>alert(1)</script>' });
  assert.doesNotMatch(escaped, /<script>/, '職種の値はエスケープされること');
  assert.match(escaped, /&lt;script&gt;/);
}

// renderPrintReport / renderTestGuide が printOverviewJobTypeHtml を呼び、
// 職種があるときだけ5列クラスを付けていること
assert.match(appSource, /class="print-overview\$\{interview\.jobType \? ' print-overview-5col' : ''\}" aria-label="面接情報"/g, '面接情報欄に職種の有無で5列クラスを切り替える処理があること');
const printOverviewUsageCount = (appSource.match(/\$\{printOverviewJobTypeHtml\(interview\)\}/g) || []).length;
assert.equal(printOverviewUsageCount, 2, 'renderPrintReportとrenderTestGuideの両方で職種セルを描画すること');

// CSSに5列レイアウトがあること
assert.match(styleSource, /\.print-overview\.print-overview-5col/, '職種セルが増えたときの5列CSSがあること');

console.log('job-type: sync tests ok');
