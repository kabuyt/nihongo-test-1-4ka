'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const calls = [];
let nextResponse = { data: null, error: null };
const sandbox = {
  console: { error() {}, warn() {}, log() {} },
  window: { location: {} },
  supabase: {
    rpc(name, params) {
      calls.push({ name, params });
      return Promise.resolve(nextResponse);
    },
  },
};
vm.createContext(sandbox);
const source = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');
vm.runInContext(
  `${source}\nthis.__authRevisionExports = { getTestQuestions, getActiveTestRevision };`,
  sandbox,
  { filename: 'auth.js' },
);

const { getTestQuestions, getActiveTestRevision } = sandbox.__authRevisionExports;

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function run() {
  nextResponse = { data: [{ id: 'legacy' }], error: null };
  assert.deepEqual(
    await getTestQuestions('test2', 'goii'),
    [{ id: 'legacy' }],
  );
  assert.deepEqual(plain(calls.pop()), {
    name: 'get_test_questions',
    params: { p_test_id: 'test2', p_section: 'goii' },
  });

  nextResponse = { data: [{ id: 'r3' }], error: null };
  assert.deepEqual(
    await getTestQuestions('test2', 'bunpo', 3),
    [{ id: 'r3' }],
  );
  assert.deepEqual(plain(calls.pop()), {
    name: 'get_test_questions_for_revision',
    params: { p_test_id: 'test2', p_section: 'bunpo', p_revision: 3 },
  });

  nextResponse = { data: 4, error: null };
  assert.equal(await getActiveTestRevision('test3'), 4);
  assert.deepEqual(plain(calls.pop()), {
    name: 'get_active_test_revision',
    params: { p_test_id: 'test3' },
  });

  nextResponse = { data: 0, error: null };
  assert.equal(await getActiveTestRevision('test3'), null);
  calls.pop();

  nextResponse = { data: null, error: { message: 'denied' } };
  assert.equal(await getTestQuestions('test4', 'chokkai', 2), null);
  calls.pop();

  console.log('auth revision tests: 5 passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
