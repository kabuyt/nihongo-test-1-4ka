// ===== テスト自動採点エンジン =====
// 採点methodに応じてスコアを計算する
(function() {
'use strict';

const G = window.TestGrading = {};

// ====== 正規化ユーティリティ ======
function normalize(s, opt) {
  opt = opt || {};
  if (s === null || s === undefined) return '';
  s = String(s);
  if (opt.trim !== false) s = s.trim();
  if (opt.normalize_spaces) s = s.replace(/\s+/g, ' ');
  if (opt.case_insensitive) s = s.toLowerCase();
  if (opt.strip_accents) {
    // ベトナム語等のアクセント記号除去
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }
  if (opt.strip_punctuation) s = s.replace(/[、。，．・,\.\s]+/g, '');
  if (opt.strip_suffix) s = s.replace(new RegExp(opt.strip_suffix + '$'), '');
  if (opt.strip_hyphens) s = s.replace(/[-ー－]/g, '');
  return s;
}

// 半角化（全角数字→半角）
function toHalfWidth(s) {
  return String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

// ====== method別採点関数 ======

// exact_match: 厳密一致（前後trim）
function grade_exact_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    const actual = userAnswers[fid];
    if (expected === undefined || expected === null) return;
    if (normalize(actual) === normalize(expected)) score += pts;
  });
  return score;
}

// flex_match: 正規化後一致。case_insensitive + アクセント無視 + separator で複数表現対応
// - 期待値も回答も separator で分割し、いずれか一致すればOK
// - ベトナム語のアクセント違い (hành lý / hành lí / Hanh ly 等) を同一視
function grade_flex_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const opts = {
    case_insensitive: rule.case_insensitive !== false,
    normalize_spaces: rule.normalize_spaces !== false,
    strip_accents: rule.strip_accents !== false,  // デフォルトON
    strip_suffix: rule.strip_suffix,
  };
  const sep = rule.separator || '／';
  const sepRegex = new RegExp('[' + sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '、/]');
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    const actual = userAnswers[fid];
    if (expected === undefined || expected === null) return;
    const expVariants = String(expected).split(sepRegex).map(s => normalize(s, opts)).filter(Boolean);
    // 学生の回答も区切って複数表現対応
    const actVariants = String(actual || '').split(sepRegex).map(s => normalize(s, opts)).filter(Boolean);
    if (actVariants.length === 0) return;
    // いずれかの期待値が、いずれかの回答と一致 / 部分一致ならOK
    const matched = expVariants.some(e => actVariants.some(a => a === e || a.includes(e) || e.includes(a)));
    if (matched) score += pts;
  });
  return score;
}

// normalized_match: スペース・句読点・カタカナ/ひらがな無視（基本）
function grade_normalized_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const opts = { strip_punctuation: true, case_insensitive: true };
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    const actual = userAnswers[fid];
    if (expected === undefined || expected === null) return;
    const expN = Array.isArray(expected)
      ? expected.map(e => normalize(e, opts))
      : [normalize(expected, opts)];
    const actN = normalize(actual, opts);
    if (!actN) return;
    if (expN.some(e => e === actN)) score += pts;
  });
  return score;
}

// split_match: 「／」区切りの複数正解いずれか一致
function grade_split_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const sep = rule.separator || '／';
  const opts = { case_insensitive: rule.case_insensitive !== false };
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    const actual = userAnswers[fid];
    if (expected === undefined || expected === null) return;
    const variants = String(expected).split(sep).map(v => normalize(v, opts));
    const actN = normalize(actual, opts);
    if (!actN) return;
    if (variants.some(v => v === actN)) score += pts;
  });
  return score;
}

// flex_match: 配列の正解にいずれか一致（b4用）
function grade_array_flex(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const opts = { strip_suffix: rule.strip_suffix, case_insensitive: true };
  let score = 0;
  (rule.field_ids || []).forEach((fid, i) => {
    const expected = Array.isArray(answerKey) ? answerKey[i] : answerKey[fid];
    const actual = userAnswers[fid];
    if (!expected) return;
    const expArr = Array.isArray(expected) ? expected : [expected];
    const actN = normalize(actual, opts);
    if (!actN) return;
    if (expArr.some(e => normalize(e, opts) === actN)) score += pts;
  });
  return score;
}

// radio_exact: ラジオボタン値の一致
function grade_radio_exact(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  let score = 0;
  const answers = Array.isArray(answerKey) ? answerKey : (rule.field_ids || []).map(fid => answerKey[fid]);
  (rule.field_ids || []).forEach((fid, i) => {
    const expected = answers[i];
    if (!expected) return;
    if (normalize(userAnswers[fid]) === normalize(expected)) score += pts;
  });
  return score;
}

// ox_match: ○×記号の一致（○=○, ✕/×=×）
function grade_ox_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    const actual = userAnswers[fid];
    if (!expected) return;
    // ×と✕を同一視
    const normOx = s => String(s || '').replace(/✕/g, '×');
    if (normOx(actual) === normOx(expected)) score += pts;
  });
  return score;
}

// phone_match: ハイフン無視
function grade_phone_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const opts = { strip_hyphens: true };
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    if (!expected) return;
    if (normalize(userAnswers[fid], opts) === normalize(expected, opts)) score += pts;
  });
  return score;
}

// substring_match: 部分一致（min_length 以上含まれればOK）
function grade_substring_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  const minLen = rule.min_length || 3;
  let score = 0;
  (rule.field_ids || []).forEach((fid, i) => {
    const expected = Array.isArray(answerKey) ? answerKey[i] : answerKey[fid];
    const actual = userAnswers[fid];
    if (!expected || !actual) return;
    const expN = normalize(expected);
    const actN = normalize(actual);
    if (actN.length < minLen) return;
    if (expN.includes(actN) || actN.includes(expN)) score += pts;
  });
  return score;
}

// multi_field_group: グループ単位で全フィールド一致したら points_per_field × 個数
function grade_multi_field_group(rule, answerKey, userAnswers) {
  const ppf = rule.points_per_field || rule.points_each || 1;
  let score = 0;
  (rule.groups || []).forEach(group => {
    const allOk = group.every(fid => {
      const expected = answerKey[fid];
      if (expected === undefined) return false;
      // 配列なら「どれかに一致」
      if (Array.isArray(expected)) {
        return expected.some(e => normalize(userAnswers[fid]) === normalize(e));
      }
      return normalize(userAnswers[fid]) === normalize(expected);
    });
    if (allOk) score += ppf * group.length;
  });
  return score;
}

// multi_field_match: 個別field単位で加点（配列回答も可）
function grade_multi_field_match(rule, answerKey, userAnswers) {
  const ppf = rule.points_per_field || rule.points_each || 1;
  let score = 0;
  (rule.field_ids || []).forEach(fid => {
    const expected = answerKey[fid];
    if (expected === undefined) return;
    if (Array.isArray(expected)) {
      if (expected.some(e => normalize(userAnswers[fid]) === normalize(e))) score += ppf;
    } else {
      if (normalize(userAnswers[fid]) === normalize(expected)) score += ppf;
    }
  });
  return score;
}

// pair_match: ペア(a_field, b_field)の両方一致で points_each
function grade_pair_match(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 1;
  let score = 0;
  (rule.items || []).forEach((pair, i) => {
    const aExp = Array.isArray(answerKey) ? answerKey[i]?.a : answerKey[pair.a_field];
    const bExp = Array.isArray(answerKey) ? answerKey[i]?.b : answerKey[pair.b_field];
    const aVal = userAnswers[pair.a_field];
    const bVal = userAnswers[pair.b_field];
    if (!aExp || !bExp) return;
    if (normalize(aVal) === normalize(aExp) && normalize(bVal) === normalize(bExp)) {
      score += pts;
    }
  });
  return score;
}

// bucket_sort: カテゴリ分類
// points_each は「1バケット完全一致で加点」する意味。
// バケット内のタイルが必要キー全て + trap無し + 余分タイル無し なら正解。
// trapタイルが含まれると penalty_per_trap を減点。
function grade_bucket_sort(rule, answerKey, userAnswers) {
  const pts = rule.points_each || 2;
  const penalty = rule.penalty_per_trap || 1;
  let score = 0;
  (rule.field_ids || []).forEach((fid, i) => {
    const expected = Array.isArray(answerKey) ? answerKey[i] : answerKey[fid];
    const actual = userAnswers[fid];
    if (!expected) return;
    const expSet = new Set(Array.isArray(expected) ? expected : [expected]);
    // actualは配列 or JSON文字列
    let actArr = [];
    if (Array.isArray(actual)) actArr = actual;
    else if (typeof actual === 'string') {
      try { actArr = JSON.parse(actual); } catch {
        actArr = actual.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    const actSet = new Set(actArr);
    // バケット完全一致判定
    let hasAllExpected = true;
    expSet.forEach(k => { if (!actSet.has(k)) hasAllExpected = false; });
    // trapタイルが入っているか
    let trapCount = 0;
    actArr.forEach(k => {
      if ((rule.trap_keys || []).includes(k)) trapCount++;
    });
    // 正解タイル完全一致 && 余分/trap無し なら加点
    const hasTrap = trapCount > 0;
    // 余分タイル（正解でもtrapでもない）もペナルティにしない場合は緩めに判定
    if (hasAllExpected && !hasTrap) {
      score += pts;
    }
    // trap混入はペナルティ
    score -= penalty * trapCount;
  });
  return Math.max(0, score);
}

// price_country: 価格+国の複合採点
function grade_price_country(rule, answerKey, userAnswers) {
  const pPrice = rule.price_points || 2;
  const pCountry = rule.country_points || 1;
  let score = 0;
  (rule.items || []).forEach(item => {
    const expPrice = answerKey[item.price_field];
    const expCountry = answerKey[item.country_field];
    if (expPrice && normalize(userAnswers[item.price_field]) === normalize(expPrice)) score += pPrice;
    if (expCountry && normalize(userAnswers[item.country_field]) === normalize(expCountry)) score += pCountry;
  });
  return score;
}

// ====== method ディスパッチャ ======
const METHOD_MAP = {
  exact_match: grade_exact_match,
  flex_match: grade_flex_match,
  vietnamese_fuzzy: grade_flex_match,
  normalized_match: grade_normalized_match,
  split_match: grade_split_match,
  array_flex: grade_array_flex,
  radio_exact: grade_radio_exact,
  ox_match: grade_ox_match,
  phone_match: grade_phone_match,
  substring_match: grade_substring_match,
  multi_field_group: grade_multi_field_group,
  multi_field_match: grade_multi_field_match,
  pair_match: grade_pair_match,
  bucket_sort: grade_bucket_sort,
  price_country: grade_price_country,
  manual: () => 0, // 手動採点は0点（先生が後で加点）
};

/**
 * セクション単位で採点
 * @param {object} answerKey - {blockId: {fid: ans}} or {blockId: [ans,...]}
 * @param {object} scoringRules - {blockId: {method, ...}}
 * @param {object} userAnswers - {fid: value}
 * @returns {number} セクション合計点
 */
G.gradeSection = function(answerKey, scoringRules, userAnswers) {
  let total = 0;
  for (const blockId in scoringRules) {
    const rule = scoringRules[blockId];
    if (!rule || !rule.method) continue;
    const ak = answerKey[blockId] || {};
    const fn = METHOD_MAP[rule.method];
    if (!fn) {
      console.warn('Unknown scoring method:', rule.method, 'block:', blockId);
      continue;
    }
    try {
      const sc = fn(rule, ak, userAnswers);
      total += sc;
    } catch (e) {
      console.error('Grading error:', blockId, e);
    }
  }
  return Math.round(total);
};

/**
 * テスト全体を採点（score_vocab/score_grammar/score_listening を返す）
 * @param {object} sectionData - {goii:{answer_key,scoring_rules}, bunpo:{...}, chokkai:{...}}
 * @param {object} answers - 全回答 {fid: value}
 */
G.gradeTest = function(sectionData, answers) {
  const result = {
    score_vocab: null,
    score_grammar: null,
    score_listening: null,
  };
  const map = { goii: 'score_vocab', bunpo: 'score_grammar', chokkai: 'score_listening' };
  for (const sec in sectionData) {
    const d = sectionData[sec];
    if (!d || !d.answer_key) continue;
    const sc = G.gradeSection(d.answer_key, d.scoring_rules || {}, answers);
    if (map[sec]) result[map[sec]] = sc;
  }
  return result;
};

})();
