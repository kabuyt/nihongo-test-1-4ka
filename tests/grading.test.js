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

function buildPerfectAnswers(rule, answerKey) {
  const answers = {};
  if (rule.method === 'manual') return answers;

  for (const [fieldIds, indexMode] of [
    [rule.field_ids || [], true],
    [(rule.groups || []).flat(), false],
  ]) {
    fieldIds.forEach((fieldId, index) => {
      const expected = getExpected(answerKey, fieldId, indexMode ? index : undefined);
      if (expected !== undefined) answers[fieldId] = firstAnswer(expected);
    });
  }

  (rule.items || []).forEach((item, index) => {
    for (const key of ['a_field', 'b_field', 'price_field', 'country_field']) {
      const fieldId = item[key];
      if (!fieldId) continue;
      const expected = getExpected(answerKey, fieldId, index);
      if (expected !== undefined) answers[fieldId] = firstAnswer(expected);
    }
  });

  return answers;
}

function autoMax(rule) {
  if (rule.method === 'manual') return 0;
  if (rule.group_points) return rule.group_points.reduce((sum, n) => sum + n, 0);
  if (rule.groups) {
    const points = rule.points_per_field || rule.points_each || 1;
    return rule.groups.reduce((sum, group) => sum + points * group.length, 0);
  }
  if (rule.method === 'price_country') {
    return (rule.items || []).length * ((rule.price_points || 2) + (rule.country_points || 1));
  }
  return (rule.field_ids || rule.items || []).length * (rule.points_each || rule.points_per_field || 1);
}

for (const sectionId of ['goii', 'bunpo', 'chokkai']) {
  const section = test3[sectionId];
  const sectionAnswers = {};
  let max = 0;

  for (const [blockId, rule] of Object.entries(section.scoring_rules)) {
    const answerKey = section.answer_key[blockId] || {};
    const answers = buildPerfectAnswers(rule, answerKey);
    const actual = Grading.gradeSection({ [blockId]: answerKey }, { [blockId]: rule }, answers);
    const expected = autoMax(rule);

    assert.strictEqual(
      actual,
      expected,
      `${sectionId}/${blockId} should score ${expected} with perfect answers, got ${actual}`
    );

    Object.assign(sectionAnswers, answers);
    max += expected;
  }

  const actualSection = Grading.gradeSection(section.answer_key, section.scoring_rules, sectionAnswers);
  assert.strictEqual(
    actualSection,
    max,
    `${sectionId} should score ${max} auto points with perfect answers, got ${actualSection}`
  );
}

console.log('test3 grading perfect-answer regression: OK');
