const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicRoot = path.resolve(__dirname, '..');
const desktopRoot = path.resolve(publicRoot, '..');
const gradingPath = path.join(publicRoot, 'common', 'grading.js');
const answerKeyPath = path.join(desktopRoot, 'trainee-manager', 'test_data', 'test3_answer_keys.json');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(gradingPath, 'utf8'), context, { filename: gradingPath });

const Grading = context.window.TestGrading;
const test3 = JSON.parse(fs.readFileSync(answerKeyPath, 'utf8'));

function firstAnswer(value) {
  if (Array.isArray(value)) return firstAnswer(value[0]);
  if (value && typeof value === 'object') return '';
  return value == null ? '' : String(value);
}

function getExpected(answerKey, fieldId, index) {
  if (Array.isArray(answerKey)) {
    if (typeof index === 'number' && index >= 0 && index < answerKey.length) {
      return answerKey[index];
    }
    const match = /(\d+)[a-z]*$/.exec(fieldId || '');
    if (match) return answerKey[parseInt(match[1], 10) - 1];
    return undefined;
  }
  return answerKey ? answerKey[fieldId] : undefined;
}

function addPerfectRuleAnswers(rule, answerKey, answers) {
  if (rule.method === 'manual') return;

  (rule.field_ids || []).forEach((fieldId, index) => {
    const expected = getExpected(answerKey, fieldId, index);
    if (expected !== undefined) answers[fieldId] = firstAnswer(expected);
  });

  (rule.groups || []).flat().forEach(fieldId => {
    const expected = getExpected(answerKey, fieldId);
    if (expected !== undefined) answers[fieldId] = firstAnswer(expected);
  });

  (rule.items || []).forEach((item, index) => {
    for (const key of ['a_field', 'b_field', 'price_field', 'country_field']) {
      const fieldId = item[key];
      if (!fieldId) continue;
      const expected = getExpected(answerKey, fieldId, index);
      if (expected !== undefined) answers[fieldId] = firstAnswer(expected);
    }
  });
}

function perfectAnswersForSection(sectionId) {
  const answers = {};
  const section = test3[sectionId];
  for (const [blockId, rule] of Object.entries(section.scoring_rules)) {
    addPerfectRuleAnswers(rule, section.answer_key[blockId] || {}, answers);
  }
  return answers;
}

function perfectAnswers() {
  return {
    ...perfectAnswersForSection('goii'),
    ...perfectAnswersForSection('bunpo'),
    ...perfectAnswersForSection('chokkai'),
  };
}

function gradeBlock(sectionId, blockId, answers) {
  const section = test3[sectionId];
  const rule = section.scoring_rules[blockId];
  const answerKey = section.answer_key[blockId] || {};
  return Grading.gradeSection({ [blockId]: answerKey }, { [blockId]: rule }, answers);
}

function score(answers) {
  return Grading.gradeTest(test3, answers);
}

function expectScore(name, actual, expected) {
  assert.strictEqual(actual.score_vocab, expected.score_vocab, `${name}: unexpected vocab score`);
  assert.strictEqual(actual.score_grammar, expected.score_grammar, `${name}: unexpected grammar score`);
  assert.strictEqual(actual.score_listening, expected.score_listening, `${name}: unexpected listening score`);
  console.log(`${name}: vocab ${actual.score_vocab} / grammar ${actual.score_grammar} / listening ${actual.score_listening}`);
}

const full = perfectAnswers();

const examinees = [
  {
    name: 'A perfect',
    answers: full,
    expected: { score_vocab: 100, score_grammar: 57, score_listening: 100 },
  },
  {
    name: 'B one miss per section',
    answers: { ...full, g5_1: '1', b1_1: 'wrong', c1_1: 'x' },
    expected: { score_vocab: 98, score_grammar: 56, score_listening: 97 },
  },
  {
    name: 'C blank',
    answers: {},
    expected: { score_vocab: 0, score_grammar: 0, score_listening: 0 },
  },
  {
    name: 'D accepted variants',
    answers: { ...full, b1_8: 'は', g7_1: 'さとう' },
    expected: { score_vocab: 100, score_grammar: 57, score_listening: 100 },
  },
  {
    name: 'E manual fields only',
    answers: {
      b4_1: 'どうやって行きますか',
      b4_2: '書いてもいいですか',
      b5_6: 'はい、行ってもいいです',
      b7_1: '家族と話したいです',
      c11_1: 'manual answer',
    },
    expected: { score_vocab: 0, score_grammar: 0, score_listening: 0 },
  },
  {
    name: 'F vocab only',
    answers: perfectAnswersForSection('goii'),
    expected: { score_vocab: 100, score_grammar: 0, score_listening: 0 },
  },
  {
    name: 'G grammar only',
    answers: perfectAnswersForSection('bunpo'),
    expected: { score_vocab: 0, score_grammar: 57, score_listening: 0 },
  },
  {
    name: 'H listening only',
    answers: perfectAnswersForSection('chokkai'),
    expected: { score_vocab: 0, score_grammar: 0, score_listening: 100 },
  },
];

for (const examinee of examinees) {
  expectScore(examinee.name, score(examinee.answers), examinee.expected);
}

const blockChecks = [
  ['goii', 'g1', 10],
  ['goii', 'g2', 3],
  ['goii', 'g3', 24],
  ['goii', 'g4', 7],
  ['goii', 'g5', 10],
  ['goii', 'g6', 8],
  ['goii', 'g7', 38],
  ['bunpo', 'b1', 12],
  ['bunpo', 'b2', 10],
  ['bunpo', 'b3', 15],
  ['bunpo', 'b5_ox', 10],
  ['bunpo', 'b6', 10],
  ['chokkai', 'c1', 9],
  ['chokkai', 'c2', 6],
  ['chokkai', 'c3', 6],
  ['chokkai', 'c4', 6],
  ['chokkai', 'c5', 6],
  ['chokkai', 'c6', 10],
  ['chokkai', 'c7', 6],
  ['chokkai', 'c8', 6],
  ['chokkai', 'c9', 15],
  ['chokkai', 'c10', 10],
  ['chokkai', 'c11', 20],
];

for (const [sectionId, blockId, expected] of blockChecks) {
  const answers = {};
  const section = test3[sectionId];
  addPerfectRuleAnswers(section.scoring_rules[blockId], section.answer_key[blockId] || {}, answers);
  const actual = gradeBlock(sectionId, blockId, answers);
  assert.strictEqual(actual, expected, `${sectionId}/${blockId}: expected ${expected}, got ${actual}`);
}
console.log(`block checks: ${blockChecks.length} OK`);

// Deterministic partial submissions: each answer is either perfect or omitted.
for (let seed = 1; seed <= 20; seed++) {
  const answers = {};
  for (const [fieldId, value] of Object.entries(full)) {
    const hash = [...fieldId].reduce((sum, ch) => sum + ch.charCodeAt(0), seed * 17);
    if (hash % 3 !== 0) answers[fieldId] = value;
  }
  const actual = score(answers);
  for (const [key, value] of Object.entries(actual)) {
    assert(Number.isInteger(value), `seed ${seed}: ${key} is not an integer`);
    assert(value >= 0, `seed ${seed}: ${key} is negative`);
  }
}
console.log('partial deterministic submissions: 20 OK');

console.log('test3 simulated submissions: OK');
