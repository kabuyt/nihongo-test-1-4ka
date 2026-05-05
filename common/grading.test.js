// ============================================================
//  grading.js 回帰テスト
//  実行: node common/grading.test.js
//  目的:
//    - 採点ロジックの "期待スコア" を固定して、リファクタや微修正で
//      意図せぬスコア変動を起こさないようにする
//    - 過去に発覚したバグの再発防止（特に multi_field_group の
//      ReferenceError バグ）
// ============================================================

'use strict';

// grading.js は window.TestGrading に登録するので、Node 用に polyfill
global.window = {};
require('./grading.js');

const TG = global.window.TestGrading;
if (!TG || typeof TG.gradeSection !== 'function') {
  console.error('TestGrading が初期化されていません');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const failures = [];

function eq(name, actual, expected) {
  if (actual === expected) {
    pass++;
    return;
  }
  fail++;
  failures.push({ name, actual, expected });
}

function deepEq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    return;
  }
  fail++;
  failures.push({ name, actual: a, expected: e });
}

// ============================================================
//  Fixture: test1 答えキー / 採点ルールのコア部分
//  test_data/test1_answer_keys.json から「multi_field_group が
//  噛む」ブロックを中心に最小コピー
// ============================================================

const t1Bunpo = {
  answer_key: {
    b1: {
      b1_1: 'に', b1_2: 'も', b1_3: 'の', b1_4: 'が',
      b1_5a: 'は', b1_5b: 'の',
      b1_6a: 'は', b1_6b: 'から', b1_6c: 'まで',
      b1_7: 'と',
    },
    b2: { b2_1: 'リン', b2_2: 'おきました', b2_3: 'はたらきます', b2_4: 'あそこ', b2_5: 'それ' },
    b3: [
      'このかばんはあなたのですか',
      'チャンさんはアメリカじんじゃありません',
      'しけんはなんじからですか',
      'このえいがは12じはんまでです',
      'かいしゃのでんわばんごうはなんばんですか',
    ],
    b4: [
      ['じゅうじよんじゅっぷん', 'じゅうじよんじっぷん'],
      ['ろくじはん'],
      ['れいじにじゅっぷん'],
      ['じゅうにまんごせんはっぴゃくよんじゅうえん'],
      ['ななまんよんせんきゅうじゅうえん'],
    ],
    b5: ['いいえ、はたらきません。', 'はい、はたらきます。', '11じにねます。', 'やすみはありません。'],
    b6: ['トイレはどちらですか', 'こちらこそ', 'これはなんですか', 'なんじまでですか', 'やすみじゃありません', 'かいぎしつはなんかいですか'],
    b7: ['①', '②', '③', '④', '②', '③', '④', '③'],
  },
  scoring_rules: {
    b1: {
      method: 'multi_field_group',
      points_per_field: 1,
      groups: [
        ['b1_1'], ['b1_2'], ['b1_3'], ['b1_4'],
        ['b1_5a', 'b1_5b'],
        ['b1_6a', 'b1_6b', 'b1_6c'],
        ['b1_7'],
      ],
    },
    b2: { method: 'exact_match', points_each: 2, field_ids: ['b2_1','b2_2','b2_3','b2_4','b2_5'] },
    b3: { method: 'unordered_tokens', points_each: 3, field_ids: ['b3_1','b3_2','b3_3','b3_4','b3_5'] },
    b4: { method: 'flex_match', points_each: 3, strip_suffix: 'です', field_ids: ['b4_1','b4_2','b4_3','b4_4','b4_5'] },
    b5: { method: 'exact_match', points_each: 4, field_ids: ['b5_1','b5_2','b5_3','b5_4'] },
    b6: { method: 'substring_match', points_each: 3, min_length: 3, field_ids: ['b6_1','b6_2','b6_3','b6_4','b6_5','b6_6'] },
    b7: { method: 'radio_exact', points_each: 2, field_ids: ['b7_1','b7_2','b7_3','b7_4','b7_5','b7_6','b7_7','b7_8'] },
  },
};

const t1Chokkai = {
  answer_key: {
    c6: { c6_1a: 'b', c6_1b: 'a', c6_2a: 'a', c6_2b: 'b' },
    c9: {
      c9_1s: '9', c9_1e: '18', c9_1d: 'かようび',
      c9_2sa: '9', c9_2ea: '12', c9_2sb: '16:30', c9_2eb: '19:30', c9_2d: 'にちようび',
    },
    c11: { c11_1: '✕', c11_2: '✕', c11_3: '○', c11_4: '○', c11_5: '✕' },
  },
  scoring_rules: {
    c6: {
      method: 'multi_field_group',
      groups: [['c6_1a', 'c6_1b'], ['c6_2a', 'c6_2b']],
      group_points: [3, 3],
    },
    c9: {
      method: 'multi_field_group',
      groups: [
        ['c9_1s', 'c9_1e'], ['c9_1d'],
        ['c9_2sa', 'c9_2ea', 'c9_2sb', 'c9_2eb'], ['c9_2d'],
      ],
      group_points: [2, 1, 2, 1],
    },
    c11: { method: 'ox_match', points_each: 4, field_ids: ['c11_1','c11_2','c11_3','c11_4','c11_5'] },
  },
};

// ============================================================
//  ★ multi_field_group の回帰テスト（過去に ReferenceError バグあり）
// ============================================================

// b1: 全部正解 → 1+1+1+1+2+3+1 = 10pt
const b1Perfect = { b1_1:'に', b1_2:'も', b1_3:'の', b1_4:'が', b1_5a:'は', b1_5b:'の', b1_6a:'は', b1_6b:'から', b1_6c:'まで', b1_7:'と' };
eq('test1 b1 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b1: t1Bunpo.scoring_rules.b1 }, b1Perfect), 10);

// b1: 1問だけ正解 → 1pt
eq('test1 b1 b1_1のみ', TG.gradeSection(t1Bunpo.answer_key, { b1: t1Bunpo.scoring_rules.b1 }, { b1_1: 'に' }), 1);

// b1: 5a 正解 5b 誤答 → 0pt（グループ内全フィールド一致が要件）
eq('test1 b1 グループ部分一致は0', TG.gradeSection(t1Bunpo.answer_key, { b1: t1Bunpo.scoring_rules.b1 }, { b1_5a: 'は', b1_5b: 'を' }), 0);

// b1: 6グループ全部正解 → 3pt
eq('test1 b1 グループ全フィールド正解', TG.gradeSection(t1Bunpo.answer_key, { b1: t1Bunpo.scoring_rules.b1 }, { b1_6a:'は', b1_6b:'から', b1_6c:'まで' }), 3);

// b1: 空 → 0pt
eq('test1 b1 全空', TG.gradeSection(t1Bunpo.answer_key, { b1: t1Bunpo.scoring_rules.b1 }, {}), 0);

// c6: group_points = [3,3] 全正解 → 6pt
eq('test1 c6 全問正解 group_points=[3,3]', TG.gradeSection(t1Chokkai.answer_key, { c6: t1Chokkai.scoring_rules.c6 }, { c6_1a:'b', c6_1b:'a', c6_2a:'a', c6_2b:'b' }), 6);

// c6: 1グループのみ → 3pt
eq('test1 c6 1グループのみ', TG.gradeSection(t1Chokkai.answer_key, { c6: t1Chokkai.scoring_rules.c6 }, { c6_1a:'b', c6_1b:'a' }), 3);

// c9: group_points = [2,1,2,1] 全正解 → 6pt
const c9Perfect = { c9_1s:'9', c9_1e:'18', c9_1d:'かようび', c9_2sa:'9', c9_2ea:'12', c9_2sb:'16:30', c9_2eb:'19:30', c9_2d:'にちようび' };
eq('test1 c9 全問正解 group_points=[2,1,2,1]', TG.gradeSection(t1Chokkai.answer_key, { c9: t1Chokkai.scoring_rules.c9 }, c9Perfect), 6);

// c9: c9_1d (1ptグループ) のみ → 1pt
eq('test1 c9 1点グループのみ', TG.gradeSection(t1Chokkai.answer_key, { c9: t1Chokkai.scoring_rules.c9 }, { c9_1d: 'かようび' }), 1);

// ============================================================
//  exact_match / radio_exact / ox_match
// ============================================================

const b2Perfect = { b2_1:'リン', b2_2:'おきました', b2_3:'はたらきます', b2_4:'あそこ', b2_5:'それ' };
eq('test1 b2 (exact_match) 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b2: t1Bunpo.scoring_rules.b2 }, b2Perfect), 10);

eq('test1 b2 全空', TG.gradeSection(t1Bunpo.answer_key, { b2: t1Bunpo.scoring_rules.b2 }, {}), 0);

eq('test1 b2 trim', TG.gradeSection(t1Bunpo.answer_key, { b2: t1Bunpo.scoring_rules.b2 }, { b2_1: '  リン  ' }), 2);

const b7Perfect = { b7_1:'①', b7_2:'②', b7_3:'③', b7_4:'④', b7_5:'②', b7_6:'③', b7_7:'④', b7_8:'③' };
eq('test1 b7 (radio_exact) 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b7: t1Bunpo.scoring_rules.b7 }, b7Perfect), 16);

const c11Perfect = { c11_1:'✕', c11_2:'✕', c11_3:'○', c11_4:'○', c11_5:'✕' };
eq('test1 c11 (ox_match) 全問正解', TG.gradeSection(t1Chokkai.answer_key, { c11: t1Chokkai.scoring_rules.c11 }, c11Perfect), 20);

// ox_match: × と ✕ を同一視
eq('test1 c11 ×と✕同一視', TG.gradeSection(t1Chokkai.answer_key, { c11: t1Chokkai.scoring_rules.c11 }, { c11_1:'×', c11_2:'×', c11_3:'○', c11_4:'○', c11_5:'×' }), 20);

// ============================================================
//  flex_match / unordered_tokens / substring_match
// ============================================================

const b4Perfect = {
  b4_1: 'じゅうじよんじゅっぷん',
  b4_2: 'ろくじはん',
  b4_3: 'れいじにじゅっぷん',
  b4_4: 'じゅうにまんごせんはっぴゃくよんじゅうえん',
  b4_5: 'ななまんよんせんきゅうじゅうえん',
};
eq('test1 b4 (flex_match) 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b4: t1Bunpo.scoring_rules.b4 }, b4Perfect), 15);

// flex_match: 複数の正解パターンの2つめを許容
eq('test1 b4 複数許容パターン', TG.gradeSection(t1Bunpo.answer_key, { b4: t1Bunpo.scoring_rules.b4 }, { b4_1: 'じゅうじよんじっぷん' }), 3);

const b3Perfect = {
  b3_1: 'このかばんはあなたのですか',
  b3_2: 'チャンさんはアメリカじんじゃありません',
  b3_3: 'しけんはなんじからですか',
  b3_4: 'このえいがは12じはんまでです',
  b3_5: 'かいしゃのでんわばんごうはなんばんですか',
};
eq('test1 b3 (unordered_tokens) 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b3: t1Bunpo.scoring_rules.b3 }, b3Perfect), 15);

const b6Perfect = {
  b6_1: 'トイレはどちらですか', b6_2: 'こちらこそ', b6_3: 'これはなんですか',
  b6_4: 'なんじまでですか', b6_5: 'やすみじゃありません', b6_6: 'かいぎしつはなんかいですか',
};
eq('test1 b6 (substring_match) 全問正解', TG.gradeSection(t1Bunpo.answer_key, { b6: t1Bunpo.scoring_rules.b6 }, b6Perfect), 18);

// substring_match: 短すぎる回答は不正解扱い (min_length=3)
eq('test1 b6 短すぎる回答', TG.gradeSection(t1Bunpo.answer_key, { b6: t1Bunpo.scoring_rules.b6 }, { b6_1: 'トイ' }), 0);

// ============================================================
//  bunpo セクション全体（gradeSection を全 block で）
// ============================================================

const bunpoFullPerfect = { ...b1Perfect, ...b2Perfect, ...b3Perfect, ...b4Perfect,
  b5_1:'いいえ、はたらきません。', b5_2:'はい、はたらきます。', b5_3:'11じにねます。', b5_4:'やすみはありません。',
  ...b6Perfect, ...b7Perfect };

eq('test1 bunpo セクション全問正解 = 100', TG.gradeSection(t1Bunpo.answer_key, t1Bunpo.scoring_rules, bunpoFullPerfect), 100);

// b1 だけ抜くと 90 になる（multi_field_group バグ再発時はここで気づける）
const bunpoNoB1 = { ...bunpoFullPerfect };
['b1_1','b1_2','b1_3','b1_4','b1_5a','b1_5b','b1_6a','b1_6b','b1_6c','b1_7'].forEach(k => delete bunpoNoB1[k]);
eq('test1 bunpo b1除外 = 90 (multi_field_group回帰)', TG.gradeSection(t1Bunpo.answer_key, t1Bunpo.scoring_rules, bunpoNoB1), 90);

// 全空 → 0
eq('test1 bunpo 全空', TG.gradeSection(t1Bunpo.answer_key, t1Bunpo.scoring_rules, {}), 0);

// ============================================================
//  gradeTest（語彙/文法/聴解 まとめ）
// ============================================================

const allEmpty = TG.gradeTest({ bunpo: t1Bunpo, chokkai: t1Chokkai }, {});
deepEq('gradeTest 全空 → 全0', allEmpty, { score_vocab: null, score_grammar: 0, score_listening: 0 });

const allPerfectAns = { ...bunpoFullPerfect, ...c9Perfect, c6_1a:'b', c6_1b:'a', c6_2a:'a', c6_2b:'b', ...c11Perfect };
const allPerfectScore = TG.gradeTest({ bunpo: t1Bunpo, chokkai: t1Chokkai }, allPerfectAns);
deepEq('gradeTest bunpo+chokkai 全正解', allPerfectScore, { score_vocab: null, score_grammar: 100, score_listening: 32 });

// ============================================================
//  Result
// ============================================================

console.log('');
if (fail === 0) {
  console.log('\x1b[32m✓ ' + pass + ' tests passed\x1b[0m');
  process.exit(0);
} else {
  console.log('\x1b[31m✗ ' + fail + ' tests failed\x1b[0m (passed: ' + pass + ')');
  failures.forEach(f => {
    console.log('  - ' + f.name);
    console.log('    expected: ' + f.expected);
    console.log('    actual:   ' + f.actual);
  });
  process.exit(1);
}
