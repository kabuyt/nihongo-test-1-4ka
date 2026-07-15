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

// Supabase-backed tests may store a section-wide flat answer map.
eq(
  'flat answer_key radio_exact',
  TG.gradeSection(
    { flat_1: 'a', flat_2: 'b' },
    { flat: { method: 'radio_exact', points_each: 2, field_ids: ['flat_1', 'flat_2'] } },
    { flat_1: 'a', flat_2: 'b' },
  ),
  4,
);

function makeFlatEqualWeightFixture(prefix, blockSizes) {
  const questionCount = blockSizes.reduce((sum, size) => sum + size, 0);
  const answer_key = {};
  const scoring_rules = {};
  const perfect = {};
  let questionNumber = 1;

  blockSizes.forEach((size, blockIndex) => {
    const field_ids = [];
    for (let i = 0; i < size; i++) {
      const fieldId = `${prefix}${blockIndex + 1}_${questionNumber++}`;
      field_ids.push(fieldId);
      answer_key[fieldId] = '0';
      perfect[fieldId] = '0';
    }
    scoring_rules[`${prefix}${blockIndex + 1}`] = {
      method: 'radio_exact',
      points_each: 100 / questionCount,
      field_ids,
    };
  });

  return { answer_key, scoring_rules, perfect };
}

const marugotoGrammar34 = makeFlatEqualWeightFixture('gb', [10, 8, 7, 4, 3, 2]);
eq('marugoto grammar 34問 全問正解 = 100', TG.gradeSection(marugotoGrammar34.answer_key, marugotoGrammar34.scoring_rules, marugotoGrammar34.perfect), 100);
eq('marugoto grammar 34問 全空 = 0', TG.gradeSection(marugotoGrammar34.answer_key, marugotoGrammar34.scoring_rules, {}), 0);

const marugotoListening36 = makeFlatEqualWeightFixture('cl', [6, 6, 6, 7, 1, 2, 3, 3, 2]);
eq('marugoto listening 36問 全問正解 = 100', TG.gradeSection(marugotoListening36.answer_key, marugotoListening36.scoring_rules, marugotoListening36.perfect), 100);
eq('marugoto listening 36問 全空 = 0', TG.gradeSection(marugotoListening36.answer_key, marugotoListening36.scoring_rules, {}), 0);

const marugoto2Vocabulary50 = makeFlatEqualWeightFixture('mv', [10, 8, 12, 10, 10]);
eq('marugoto_2 vocabulary 50問 全問正解 = 100', TG.gradeSection(marugoto2Vocabulary50.answer_key, marugoto2Vocabulary50.scoring_rules, marugoto2Vocabulary50.perfect), 100);
eq('marugoto_2 vocabulary 50問 全空 = 0', TG.gradeSection(marugoto2Vocabulary50.answer_key, marugoto2Vocabulary50.scoring_rules, {}), 0);

const marugoto2Grammar34 = makeFlatEqualWeightFixture('mg', [8, 8, 6, 4, 4, 4]);
eq('marugoto_2 grammar 34問 全問正解 = 100', TG.gradeSection(marugoto2Grammar34.answer_key, marugoto2Grammar34.scoring_rules, marugoto2Grammar34.perfect), 100);
eq('marugoto_2 grammar 34問 全空 = 0', TG.gradeSection(marugoto2Grammar34.answer_key, marugoto2Grammar34.scoring_rules, {}), 0);

const marugoto2Listening36 = makeFlatEqualWeightFixture('ml', [6, 6, 4, 4, 4, 4, 4, 4]);
eq('marugoto_2 listening 36問 全問正解 = 100', TG.gradeSection(marugoto2Listening36.answer_key, marugoto2Listening36.scoring_rules, marugoto2Listening36.perfect), 100);
eq('marugoto_2 listening 36問 全空 = 0', TG.gradeSection(marugoto2Listening36.answer_key, marugoto2Listening36.scoring_rules, {}), 0);

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
eq(
  'test1 b3 語順違い(文字構成一致)は緩い判定で正解',
  TG.gradeSection(t1Bunpo.answer_key, { b3: t1Bunpo.scoring_rules.b3 }, { b3_1: 'このはあなたのかばんですか' }),
  3
);

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
//  test1 / test2 セクション全体カバレッジ（trainee-manager の
//  answer_keys.json を直接ロード）
// ============================================================

const fs = require('fs');
const path = require('path');

function loadAnswerKeys(testNum) {
  const p = path.join(__dirname, '..', '..', 'trainee-manager', 'test_data', `test${testNum}_answer_keys.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const t1 = loadAnswerKeys(1);
const t2 = loadAnswerKeys(2);
const t3 = loadAnswerKeys(3);

// ----- test1 セクション全体 -----

if (t1) {
  // === goii 全問正解 = 100 ===
  // g1 exact_match (10×1=10), g2 exact_match (8×3=24),
  // g3 bucket_sort (3×2=6), g4 normalized_match (10×2=20),
  // g5 split_match (20×2=40)
  // g5 は ／ 区切りの "どちらか1つ" を入力する想定。answer_key の生文字列
  // ("Cái ô／ dù" 等) を入れると split_match で不一致になるので、片方だけ採用。
  const t1G5SinglePerfect = {
    g5_1:'Số', g5_2:'Bệnh viện', g5_3:'Ngân hàng', g5_4:'Kết thúc',
    g5_5:'Nhân viên', g5_6:'Phim điện ảnh', g5_7:'Buổi sáng', g5_8:'Cái ô',
    g5_9:'Nhà vệ sinh', g5_10:'Thức dậy', g5_11:'Mỗi sáng', g5_12:'Nghỉ',
    g5_13:'Tầng hầm', g5_14:'Quầy lễ tân', g5_15:'Buổi chiều', g5_16:'Ngủ',
    g5_17:'Cầu thang', g5_18:'Xin lỗi', g5_19:'Giày', g5_20:'Từ điển',
  };
  const t1GoiiPerfect = {
    ...t1.goii.answer_key.g1, ...t1.goii.answer_key.g2,
    g3_1: ['c','e','h'], g3_2: ['b','k','l'], g3_3: ['g','i','j'],
    ...t1.goii.answer_key.g4, ...t1G5SinglePerfect,
  };
  eq('test1 goii 全問正解 = 100', TG.gradeSection(t1.goii.answer_key, t1.goii.scoring_rules, t1GoiiPerfect), 100);

  // bucket_sort: trap タイル混入で減点
  // g3_1 に trap 'a' 混入 → bucket1 加点なし -1ペナルティ、bucket2/3 各+2 → 計3
  const goiiTrap = { g3_1: ['c','e','h','a'], g3_2: ['b','k','l'], g3_3: ['g','i','j'] };
  eq('test1 g3 bucket_sort trap混入で減点', TG.gradeSection(t1.goii.answer_key, { g3: t1.goii.scoring_rules.g3 }, goiiTrap), 3);

  // bucket_sort: 全正解
  eq('test1 g3 bucket_sort 全正解', TG.gradeSection(t1.goii.answer_key, { g3: t1.goii.scoring_rules.g3 }, { g3_1: ['c','e','h'], g3_2: ['b','k','l'], g3_3: ['g','i','j'] }), 6);

  // normalized_match: 句読点無視
  eq('test1 g4 normalized_match 句読点ゆるめ', TG.gradeSection(t1.goii.answer_key, { g4: t1.goii.scoring_rules.g4 }, { g4_1: 'げつようび。' }), 2);

  // split_match: separator 区切りどちらでも正解
  eq('test1 g5 split_match 複数許容', TG.gradeSection(t1.goii.answer_key, { g5: t1.goii.scoring_rules.g5 }, { g5_8: 'Cái ô' }), 2);
  eq('test1 g5 split_match 複数許容(2)', TG.gradeSection(t1.goii.answer_key, { g5: t1.goii.scoring_rules.g5 }, { g5_8: 'dù' }), 2);

  // === bunpo 全問正解 = 100（既存テストと重複するが、JSON経由で再確認）===
  const t1BunpoPerfect = {
    ...t1.bunpo.answer_key.b1,
    ...t1.bunpo.answer_key.b2,
    b3_1: t1.bunpo.answer_key.b3[0], b3_2: t1.bunpo.answer_key.b3[1],
    b3_3: t1.bunpo.answer_key.b3[2], b3_4: t1.bunpo.answer_key.b3[3],
    b3_5: t1.bunpo.answer_key.b3[4],
    b4_1: t1.bunpo.answer_key.b4[0][0], b4_2: t1.bunpo.answer_key.b4[1][0],
    b4_3: t1.bunpo.answer_key.b4[2][0], b4_4: t1.bunpo.answer_key.b4[3][0],
    b4_5: t1.bunpo.answer_key.b4[4][0],
    b5_1: t1.bunpo.answer_key.b5[0], b5_2: t1.bunpo.answer_key.b5[1],
    b5_3: t1.bunpo.answer_key.b5[2], b5_4: t1.bunpo.answer_key.b5[3],
    b6_1: t1.bunpo.answer_key.b6[0], b6_2: t1.bunpo.answer_key.b6[1],
    b6_3: t1.bunpo.answer_key.b6[2], b6_4: t1.bunpo.answer_key.b6[3],
    b6_5: t1.bunpo.answer_key.b6[4], b6_6: t1.bunpo.answer_key.b6[5],
    b7_1: t1.bunpo.answer_key.b7[0], b7_2: t1.bunpo.answer_key.b7[1],
    b7_3: t1.bunpo.answer_key.b7[2], b7_4: t1.bunpo.answer_key.b7[3],
    b7_5: t1.bunpo.answer_key.b7[4], b7_6: t1.bunpo.answer_key.b7[5],
    b7_7: t1.bunpo.answer_key.b7[6], b7_8: t1.bunpo.answer_key.b7[7],
  };
  eq('test1 bunpo 全問正解 = 100 (JSON経由)', TG.gradeSection(t1.bunpo.answer_key, t1.bunpo.scoring_rules, t1BunpoPerfect), 100);

  // === chokkai 全問正解 = 100 ===
  // c1(6), c2(6), c3(6), c4(6), c5(6), c6(6), c7(6), c8(6),
  // c9(6), c10(6), c11(20), c12(20) = 100
  const t1ChokkaiPerfect = {
    ...t1.chokkai.answer_key.c1, ...t1.chokkai.answer_key.c2,
    ...t1.chokkai.answer_key.c3, ...t1.chokkai.answer_key.c4,
    ...t1.chokkai.answer_key.c5, ...t1.chokkai.answer_key.c6,
    ...t1.chokkai.answer_key.c7, ...t1.chokkai.answer_key.c8,
    ...t1.chokkai.answer_key.c9, ...t1.chokkai.answer_key.c10,
    ...t1.chokkai.answer_key.c11, ...t1.chokkai.answer_key.c12,
  };
  eq('test1 chokkai 全問正解 = 100', TG.gradeSection(t1.chokkai.answer_key, t1.chokkai.scoring_rules, t1ChokkaiPerfect), 100);

  // phone_match: ハイフン無視
  eq('test1 c10 phone_match ハイフン無視', TG.gradeSection(t1.chokkai.answer_key, { c10: t1.chokkai.scoring_rules.c10 }, { c10_1: '3368080', c10_2: '07842113168' }), 6);

  // price_country
  eq('test1 c8 price_country 価格+国 全一致', TG.gradeSection(t1.chokkai.answer_key, { c8: t1.chokkai.scoring_rules.c8 }, { c8_1p: '2800', c8_1c: 'c', c8_2p: '18500', c8_2c: 'a' }), 6);
  eq('test1 c8 price_country 価格のみ', TG.gradeSection(t1.chokkai.answer_key, { c8: t1.chokkai.scoring_rules.c8 }, { c8_1p: '2800', c8_2p: '18500' }), 4); // 2pt × 2

  // === gradeTest 全セクション全問正解 ===
  const t1AllPerfect = { ...t1GoiiPerfect, ...t1BunpoPerfect, ...t1ChokkaiPerfect };
  deepEq('test1 gradeTest 全セクション100点', TG.gradeTest(t1, t1AllPerfect), { score_vocab: 100, score_grammar: 100, score_listening: 100 });

  // 全空 → 0/0/0
  deepEq('test1 gradeTest 全空 = 0/0/0', TG.gradeTest(t1, {}), { score_vocab: 0, score_grammar: 0, score_listening: 0 });
} else {
  console.log('  (test1 answer_keys 見つからず、test1 全体テストをスキップ)');
}

// ----- test2 セクション全体 -----

if (t2) {
  // === goii 全問正解 = 100 ===
  // g1 exact_match w/ array (10×1=10), g2 exact_match (8×3=24),
  // g3 normalized_match (13×1=13), g4 radio_exact (5×2=10),
  // g5 split_match w/ strip_suffix (7×1=7), g6 flex_match (18×2=36)
  const t2GoiiPerfect = {
    // g1: array of arrays — [hira, kanji] のどちらかでOK
    g1_1: 'たまご', g1_2: '肉', g1_3: 'やさい', g1_4: '魚', g1_5: 'ぎゅうにゅう',
    g1_6: '扇風機', g1_7: 'でんち', g1_8: '山', g1_9: 'スプーン', g1_10: 'バレーボール',
    // g2: 1次元配列, fid suffix で参照
    g2_1: 'すし', g2_2: 'サッカー', g2_3: 'スイッチ', g2_4: 'セロテープ',
    g2_5: 'はさみ', g2_6: 'じてんしゃ', g2_7: 'アイスクリーム', g2_8: 'ビール',
    ...t2.goii.answer_key.g3,
    g4_1: '③', g4_2: '④', g4_3: '①', g4_4: '②', g4_5: '③',
    g5_1: 'ちいさい', g5_2: 'むずかしい', g5_3: 'たかい', g5_4: 'ひま',
    g5_5: 'いい', g5_6: 'あたらしい', g5_7: 'しずか',
    ...t2.goii.answer_key.g6,
  };
  eq('test2 goii 全問正解 = 100', TG.gradeSection(t2.goii.answer_key, t2.goii.scoring_rules, t2GoiiPerfect), 100);

  // exact_match w/ array: ひらがなとカタカナ/漢字どちらでも
  eq('test2 g1 ひらがな解答', TG.gradeSection(t2.goii.answer_key, { g1: t2.goii.scoring_rules.g1 }, { g1_1: 'たまご' }), 1);
  eq('test2 g1 漢字解答', TG.gradeSection(t2.goii.answer_key, { g1: t2.goii.scoring_rules.g1 }, { g1_1: '卵' }), 1);

  // split_match w/ strip_suffix
  eq('test2 g5 strip_suffix 「ひまな」も「ひま」もOK', TG.gradeSection(t2.goii.answer_key, { g5: t2.goii.scoring_rules.g5 }, { g5_4: 'ひまな' }), 1);
  eq('test2 g5 strip_suffix 「ひま」もOK', TG.gradeSection(t2.goii.answer_key, { g5: t2.goii.scoring_rules.g5 }, { g5_4: 'ひま' }), 1);

  // flex_match w/ separator + アクセント無視（ベトナム語）
  eq('test2 g6 アクセント有り', TG.gradeSection(t2.goii.answer_key, { g6: t2.goii.scoring_rules.g6 }, { g6_5: 'Ký túc xá' }), 2);
  eq('test2 g6 アクセント無し', TG.gradeSection(t2.goii.answer_key, { g6: t2.goii.scoring_rules.g6 }, { g6_5: 'Ky tuc xa' }), 2);
  eq('test2 g6 separator 別表記', TG.gradeSection(t2.goii.answer_key, { g6: t2.goii.scoring_rules.g6 }, { g6_5: 'Kí túc xá' }), 2);

  // === bunpo 全問正解 = 100 ===
  // b1 multi_field_match (13×1=13), b2 exact_match (5×2=10),
  // b3 normalized_match (5×3=15), b4 exact_match (7×2=14),
  // b5 pair_match (4×3=12), b6 exact_match (5×2=10),
  // b7 exact_match (10×1=10), b8 radio_exact (8×2=16)
  const t2BunpoPerfect = {
    // b1: 配列許容 (b1_8/9/12 は配列、どれかでOK)
    b1_1: 'が', b1_2: 'から', b1_3: 'に', b1_4: 'で', b1_5: 'が',
    b1_6: 'に', b1_7: 'を', b1_8: 'へ', b1_9: 'に', b1_10: 'で',
    b1_11: 'で', b1_12: 'が', b1_13: 'に',
    ...t2.bunpo.answer_key.b2,
    b3_1: 'それから友だちと映画を見ました',
    b3_2: 'このバスは大阪駅へ行きますか',
    b3_3: 'どんな料理が好きですか',
    b3_4: 'りんごを2つと切手を2枚ください',
    b3_5: 'この近くにVP銀行がありますか',
    ...t2.bunpo.answer_key.b4,
    // b5: pair_match
    b5_1a: 'つくえ', b5_1b: 'まえ',
    b5_2a: 'はこ',   b5_2b: 'うえ',
    b5_3a: 'ベッド', b5_3b: 'うえ',
    b5_4a: 'たな',   b5_4b: 'なか',
    b6_1: '○', b6_2: '×', b6_3: '○', b6_4: '×', b6_5: '×',
    ...t2.bunpo.answer_key.b7,
    b8_1: 'b', b8_2: 'c', b8_3: 'd', b8_4: 'c', b8_5: 'c', b8_6: 'c', b8_7: 'b', b8_8: 'c',
  };
  eq('test2 bunpo 全問正解 = 100', TG.gradeSection(t2.bunpo.answer_key, t2.bunpo.scoring_rules, t2BunpoPerfect), 100);

  // multi_field_match: 配列正解どちらでも
  eq('test2 b1 配列正解どちらか1', TG.gradeSection(t2.bunpo.answer_key, { b1: t2.bunpo.scoring_rules.b1 }, { b1_8: 'へ' }), 1);
  eq('test2 b1 配列正解どちらか2', TG.gradeSection(t2.bunpo.answer_key, { b1: t2.bunpo.scoring_rules.b1 }, { b1_8: 'に' }), 1);

  // pair_match: 両方一致のみ加点
  eq('test2 b5 pair_match 両方一致', TG.gradeSection(t2.bunpo.answer_key, { b5: t2.bunpo.scoring_rules.b5 }, { b5_1a: 'つくえ', b5_1b: 'まえ' }), 3);
  eq('test2 b5 pair_match 片方ハズレは0', TG.gradeSection(t2.bunpo.answer_key, { b5: t2.bunpo.scoring_rules.b5 }, { b5_1a: 'つくえ', b5_1b: 'うえ' }), 0);

  // normalized_match: b3_4 は配列（語順違い両方OK）
  eq('test2 b3 配列正解(語順違い)', TG.gradeSection(t2.bunpo.answer_key, { b3: t2.bunpo.scoring_rules.b3 }, { b3_4: '切手を2枚とりんごを2つください' }), 3);

  // === chokkai 全問正解 = 100 ===
  // c1(8), c2(6), c3(8), c4(6), c5(6), c6(6), c7(12),
  // c8(6), c9(9), c10(8), c11(10), c12(15) = 100
  const t2ChokkaiPerfect = {
    c1_1: 'a', c1_2: 'c',
    c2_1: 'a', c2_2: 'a',
    ...t2.chokkai.answer_key.c3,
    c4_1: 'a', c4_2: 'b',
    c5_1: 'b', c5_2: 'a',
    ...t2.chokkai.answer_key.c6,
    ...t2.chokkai.answer_key.c7,
    ...t2.chokkai.answer_key.c8,
    c9_1: 'b', c9_2: 'b', c9_3: 'b',
    c10_1: 'b', c10_2: 'b', c10_3: 'b', c10_4: 'a',
    c11_1: '○', c11_2: '✕', c11_3: '✕', c11_4: '✕', c11_5: '○',
    c12_1: '1', c12_2: '2', c12_3: '1', c12_4: '3', c12_5: '1',
  };
  eq('test2 chokkai 全問正解 = 100', TG.gradeSection(t2.chokkai.answer_key, t2.chokkai.scoring_rules, t2ChokkaiPerfect), 100);

  // === gradeTest 全セクション全問正解 ===
  const t2AllPerfect = { ...t2GoiiPerfect, ...t2BunpoPerfect, ...t2ChokkaiPerfect };
  deepEq('test2 gradeTest 全セクション100点', TG.gradeTest(t2, t2AllPerfect), { score_vocab: 100, score_grammar: 100, score_listening: 100 });

  // 全空 → 0/0/0
  deepEq('test2 gradeTest 全空 = 0/0/0', TG.gradeTest(t2, {}), { score_vocab: 0, score_grammar: 0, score_listening: 0 });
} else {
  console.log('  (test2 answer_keys 見つからず、test2 全体テストをスキップ)');
}

// ----- test3 個別回帰 -----
if (t3) {
  const test3B3ToShokan = Array.isArray(t3.bunpo.answer_key.b3[3])
    ? t3.bunpo.answer_key.b3[3].find(v => String(v).includes('としょかん'))
    : null;
  eq(
    'test3 bunpo b3_4 としょかん表記も正解',
    TG.gradeSection(t3.bunpo.answer_key, { b3: t3.bunpo.scoring_rules.b3 }, { b3_4: test3B3ToShokan }),
    3
  );
  eq(
    'test3 bunpo b3_5 語順違い(文字構成一致)は緩い判定で正解',
    TG.gradeSection(t3.bunpo.answer_key, { b3: t3.bunpo.scoring_rules.b3 }, { b3_5: '大迫さんにボタンを押す前に聞いてください' }),
    3
  );
} else {
  console.log('  (test3 answer_keys 見つからず、test3 個別テストをスキップ)');
}

// ============================================================
//  自動ジェネレータ: answer_key + scoring_rules から
//  満点になる解答セットを生成する。
//  test3〜8 や marugoto を追加するときに、手書きの fixture
//  を作らずに済むのが目的。
// ============================================================

// 値を1つに絞る（配列なら最初、separator-aware な method の場合のみ split）
// 重要: exact_match のように separator を使わない method では「、」で
// 切ってしまうと正解が壊れるので、明示的に separator を使う method
// (split_match / flex_match / vietnamese_fuzzy) のみ ／ で分割する。
const SEPARATOR_AWARE_METHODS = new Set(['split_match', 'flex_match', 'vietnamese_fuzzy']);

function pickOneVariant(expected, rule) {
  if (expected == null) return expected;
  if (Array.isArray(expected)) return pickOneVariant(expected[0], rule);
  if (typeof expected !== 'string') return expected;

  const method = rule && rule.method;
  if (!SEPARATOR_AWARE_METHODS.has(method)) return expected;

  const sep = (rule && rule.separator) || '／';
  if (expected.includes(sep)) return expected.split(sep)[0].trim();
  // separator 既定値以外で ／ が混ざっていた場合のフォールバック
  if (sep !== '／' && expected.includes('／')) return expected.split('／')[0].trim();
  return expected;
}

// 1ブロック分の「全問正解」解答を生成
function generatePerfectAnswersForBlock(rule, blockAnswerKey) {
  const ans = {};

  switch (rule.method) {
    case 'multi_field_group':
      for (const group of rule.groups || []) {
        for (const fid of group) {
          const exp = blockAnswerKey && blockAnswerKey[fid];
          if (exp != null) ans[fid] = Array.isArray(exp) ? exp[0] : exp;
        }
      }
      break;

    case 'pair_match':
      (rule.items || []).forEach((item, i) => {
        let aExp, bExp;
        if (Array.isArray(blockAnswerKey)) {
          aExp = blockAnswerKey[i] && blockAnswerKey[i].a;
          bExp = blockAnswerKey[i] && blockAnswerKey[i].b;
        } else if (blockAnswerKey) {
          aExp = blockAnswerKey[item.a_field];
          bExp = blockAnswerKey[item.b_field];
        }
        if (aExp != null) ans[item.a_field] = aExp;
        if (bExp != null) ans[item.b_field] = bExp;
      });
      break;

    case 'price_country':
      (rule.items || []).forEach(item => {
        const p = blockAnswerKey && blockAnswerKey[item.price_field];
        const c = blockAnswerKey && blockAnswerKey[item.country_field];
        if (p != null) ans[item.price_field] = p;
        if (c != null) ans[item.country_field] = c;
      });
      break;

    case 'bucket_sort':
      (rule.field_ids || []).forEach((fid, i) => {
        let exp;
        if (Array.isArray(blockAnswerKey)) exp = blockAnswerKey[i];
        else if (blockAnswerKey) exp = blockAnswerKey[fid];
        if (Array.isArray(exp)) ans[fid] = exp.slice();
        else if (exp != null) ans[fid] = [exp];
      });
      break;

    case 'manual':
      // 手動採点は自動生成不可（スコアにも寄与しない）
      break;

    default: {
      // exact_match, flex_match, split_match, normalized_match, radio_exact,
      // ox_match, phone_match, substring_match, multi_field_match,
      // unordered_tokens, vietnamese_fuzzy, array_flex 等
      const fieldIds = rule.field_ids || [];
      fieldIds.forEach((fid, i) => {
        let exp;
        if (Array.isArray(blockAnswerKey)) exp = blockAnswerKey[i];
        else if (blockAnswerKey) exp = blockAnswerKey[fid];
        if (exp == null) return;
        ans[fid] = pickOneVariant(exp, rule);
      });
      break;
    }
  }
  return ans;
}

// テスト全体（goii/bunpo/chokkai）の満点解答を生成
function generatePerfectAnswers(testData) {
  const result = {};
  for (const sec in testData) {
    const sd = testData[sec];
    if (!sd || !sd.scoring_rules) continue;
    for (const blockId in sd.scoring_rules) {
      const rule = sd.scoring_rules[blockId];
      const ak = sd.answer_key && sd.answer_key[blockId];
      Object.assign(result, generatePerfectAnswersForBlock(rule, ak));
    }
  }
  return result;
}

// 1ブロックの満点 (= scoring_rules から計算)
function getBlockMaxPoints(rule) {
  if (!rule || !rule.method) return 0;
  if (rule.method === 'multi_field_group') {
    const ppf = rule.points_per_field || rule.points_each || 1;
    let max = 0;
    (rule.groups || []).forEach((g, gi) => {
      if (rule.group_points && gi < rule.group_points.length) {
        max += rule.group_points[gi] || 0;
      } else {
        max += ppf * g.length;
      }
    });
    return max;
  }
  if (rule.method === 'pair_match') {
    return (rule.points_each || 1) * (rule.items || []).length;
  }
  if (rule.method === 'price_country') {
    return ((rule.price_points || 2) + (rule.country_points || 1)) * (rule.items || []).length;
  }
  if (rule.method === 'bucket_sort') {
    return (rule.points_each || 2) * (rule.field_ids || []).length;
  }
  if (rule.method === 'manual') return 0;
  // exact_match 等の単純メソッド
  const pts = rule.points_each || rule.points_per_field || 1;
  return pts * (rule.field_ids || []).length;
}

// セクション全体の満点
function getSectionMaxPoints(scoringRules) {
  let total = 0;
  for (const blockId in scoringRules) {
    total += getBlockMaxPoints(scoringRules[blockId]);
  }
  return total;
}

// ============================================================
//  自動テスト群: 各テストに対して自動生成→検算
//  test3〜8 を追加するときは、loadAnswerKeys(N) の結果を
//  下の autoTests 配列に追加するだけ
// ============================================================

const autoTests = [
  ['test1', t1],
  ['test2', t2],
  // ['test3', loadAnswerKeys(3)],  // ← test3 を追加するときコメント外す
  // ['test4', loadAnswerKeys(4)],
  // ...
];

autoTests.forEach(([name, td]) => {
  if (!td) {
    console.log(`  (${name} answer_keys 見つからず、自動テストをスキップ)`);
    return;
  }

  // 1. scoring_rules の合計が各セクション 100 点になっているか
  for (const sec of ['goii', 'bunpo', 'chokkai']) {
    if (!td[sec]) continue;
    eq(`${name} ${sec} scoring_rules 合計 = 100`, getSectionMaxPoints(td[sec].scoring_rules), 100);
  }

  // 2. 自動生成した満点解答 → gradeTest で 100/100/100
  const perfect = generatePerfectAnswers(td);
  const perfectScore = TG.gradeTest(td, perfect);
  // 一部テスト（test5-8）は goii が無い想定なので、存在するセクションだけチェック
  const expectedPerfect = {
    score_vocab: td.goii ? 100 : null,
    score_grammar: td.bunpo ? 100 : null,
    score_listening: td.chokkai ? 100 : null,
  };
  deepEq(`${name} 自動生成・全問正解 → 100/100/100`, perfectScore, expectedPerfect);

  // 3. 全空 → 0/0/0
  const emptyScore = TG.gradeTest(td, {});
  const expectedEmpty = {
    score_vocab: td.goii ? 0 : null,
    score_grammar: td.bunpo ? 0 : null,
    score_listening: td.chokkai ? 0 : null,
  };
  deepEq(`${name} 全空 → 0/0/0`, emptyScore, expectedEmpty);

  // 4. 各ブロックを単独で見て、満点と一致するか
  for (const sec of ['goii', 'bunpo', 'chokkai']) {
    if (!td[sec]) continue;
    for (const blockId in td[sec].scoring_rules) {
      const rule = td[sec].scoring_rules[blockId];
      if (rule.method === 'manual') continue;
      const blockPerfect = generatePerfectAnswersForBlock(rule, td[sec].answer_key && td[sec].answer_key[blockId]);
      const blockScore = TG.gradeSection(td[sec].answer_key, { [blockId]: rule }, blockPerfect);
      const blockMax = getBlockMaxPoints(rule);
      eq(`${name} ${sec} ${blockId} 単独満点 = ${blockMax}`, blockScore, blockMax);
    }
  }
});

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
