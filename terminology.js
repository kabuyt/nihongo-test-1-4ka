const TERM_STORAGE_KEY = 'kinreiTerminologyProgress:v1';
const TEST_STORAGE_KEY = 'kinreiTerminologyPerfectTestSets:v2';
const IMAGE_STORAGE_KEY = 'kinreiImageMemoryProgress:v1';
const QUIZ_SET_SIZE = 20;
const FINAL_QUIZ_SIZE = 100;
const FINAL_QUIZ_SET_ID = 'kinrei-final-2023';
const TERM_OVERRIDES = {
  'kinrei-mono-002': { display: '棚、ラック', reading: 'たな', inline: '棚(たな)、ラック' },
  'kinrei-mono-041': { display: '生産表', reading: 'せいさんひょう' },
  'kinrei-mono-011': { display: '手袋（薄手・厚手）', reading: 'てぶくろ', inline: '手袋(てぶくろ)（薄手・厚手）' },
  'kinrei-mono-015': { display: '水切り', reading: 'みずきり', inline: '水切り(みずきり)' },
  'kinrei-mono-043': { display: '前日仕込み', reading: 'ぜんじつしこみ', inline: '前日仕込み(ぜんじつしこみ)' },
  'kinrei-mono-044': { display: 'ホワイトボードマーカー、マジック', reading: 'ほわいとぼーどまーかー' },
  'kinrei-mono-051': { display: '鉄の爪', reading: 'てつのつめ', inline: '鉄の爪(てつのつめ)' },
  'kinrei-mono-063': { display: '先出し', reading: 'さきだし', inline: '先出し(さきだし)' },
  'kinrei-mono-077': { display: '歩留り', reading: 'ぶどまり', inline: '歩留り(ぶどまり)' },
  'kinrei-mono-087': { display: '手洗い', reading: 'てあらい', inline: '手洗い(てあらい)' },
  'kinrei-mono-089': { display: '外泊申請書', reading: 'がいはくしんせいしょ', inline: '外泊申請書(がいはくしんせいしょ)' },
  'kinrei-mono-092': { display: '社員、準社員', reading: 'しゃいん、じゅんしゃいん', inline: '社員(しゃいん)、準社員(じゅんしゃいん)' },
  'kinrei-mono-093': { display: '自社パート', reading: 'じしゃぱーと', inline: '自社パート(じしゃぱーと)' },
  'kinrei-mono-098': { display: '早ご飯', reading: 'はやごはん', inline: '早ご飯(はやごはん)' },
  'kinrei-mono-099': { display: '遅ご飯', reading: 'おそごはん', inline: '遅ご飯(おそごはん)' },
  'kinrei-mono-100': { display: '早番・遅番', reading: 'はやばん・おそばん', inline: '早番(はやばん)・遅番(おそばん)' },
  'kinrei-mono-103': { display: '済み・未', reading: 'ずみ・み', inline: '済み(ずみ)・未(み)' },
  'kinrei-mono-104': { display: '引き継ぎ', reading: 'ひきつぎ', inline: '引き継ぎ(ひきつぎ)' },
  'kinrei-ingredients-001': { display: '麺、そば、うどん、ラーメン、きし麺', reading: 'めん、そば、うどん、ラーメン、きしめん' },
  'kinrei-ingredients-015': { display: 'ネギ、九条ネギ、青ネギ、白ネギ', reading: 'ねぎ、くじょうねぎ、あおねぎ、しろねぎ' },
  'kinrei-ingredients-017': { display: '焦がし玉ねぎ', reading: 'こがしたまねぎ', inline: '焦がし玉ねぎ(こがしたまねぎ)' },
  'kinrei-ingredients-018': { display: 'ちんげん菜', reading: 'ちんげんさい', inline: 'ちんげん菜(ちんげんさい)' },
  'kinrei-ingredients-022': { display: 'パン粉', reading: 'ぱんこ', inline: 'パン粉(ぱんこ)' },
  'kinrei-ingredients-034': { display: '海老、シュリンプ', reading: 'えび', inline: '海老(えび)、シュリンプ' },
  'kinrei-ingredients-038': { display: '竹の子', reading: 'たけのこ', inline: '竹の子(たけのこ)' },
  'kinrei-ingredients-041': { display: 'さば粉', reading: 'さばこ' },
  'kinrei-ingredients-042': { display: '蒲鉾、棒蒲鉾', reading: 'かまぼこ、ぼうかまぼこ', inline: '蒲鉾(かまぼこ)、棒蒲鉾(ぼうかまぼこ)' },
  'kinrei-ingredients-044': { display: 'きざみ揚げ', reading: 'きざみあげ', inline: 'きざみ揚げ(きざみあげ)' },
  'kinrei-ingredients-051': { display: '麩、仙台麩', reading: 'ふ、せんだいふ' },
  'kinrei-ingredients-053': { display: '焼き餅', reading: 'やきもち', inline: '焼き餅(やきもち)' },
  'kinrei-ingredients-055': { display: '天ぷら、海老天', reading: 'てんぷら、えびてん', inline: '天ぷら(てんぷら)、海老天(えびてん)' },
  'kinrei-ingredients-057': { display: 'のり、焼き海苔', reading: 'のり、やきのり', inline: 'のり、焼き海苔(やきのり)' },
  'kinrei-ingredients-059': { display: '千切り生姜2ミリ', reading: 'せんぎりしょうが2みり', inline: '千切り生姜2ミリ(せんぎりしょうが2みり)' },
  'kinrei-verbs-004': { display: '濡れます・濡らします', reading: 'ぬれます・ぬらします', inline: '濡れます(ぬれます)・濡らします(ぬらします)' },
  'kinrei-verbs-014': { display: '茹でます、ボイル', reading: 'ゆでます', inline: '茹でます(ゆでます)、ボイル' },
  'kinrei-verbs-019': { display: '盛り付けます', reading: 'もりつけます', inline: '盛り付けます(もりつけます)' },
  'kinrei-verbs-024': { display: '持ち込みます', reading: 'もちこみます', inline: '持ち込みます(もちこみます)' },
  'kinrei-verbs-031': { display: '混入します', reading: 'こんにゅうします' },
  'kinrei-verbs-033': { display: '閉めます・開けます', reading: 'しめます・あけます', inline: '閉めます(しめます)・開けます(あけます)' },
  'kinrei-verbs-034': { display: '破れます・破ります', reading: 'やぶれます・やぶります', inline: '破れます(やぶれます)・破ります(やぶります)' },
  'kinrei-verbs-048': { display: '遅れます', reading: 'おくれます', inline: '遅れます(おくれます)' },
  'kinrei-positions-024': { display: 'ダシ入り口', reading: 'だしいりぐち' },
  'kinrei-positions-001': { display: '盛り付け', reading: 'もりつけ', inline: '盛り付け(もりつけ)' },
  'kinrei-positions-005': { display: '具出し', reading: 'ぐだし', inline: '具出し(ぐだし)' },
  'kinrei-positions-011': { display: '混ぜ室', reading: 'まぜしつ', inline: '混ぜ室(まぜしつ)' },
  'kinrei-positions-018': { display: '野菜移し替え', reading: 'やさいうつしかえ', inline: '野菜移し替え(やさいうつしかえ)' },
  'kinrei-positions-026': { display: '箱盛り', reading: 'はこもり' },
  'kinrei-positions-027': { display: '盛り付け', reading: 'もりつけ' },
  'kinrei-positions-028': { display: 'はかり使用有り', reading: 'はかりしようあり' },
  'kinrei-positions-029': { display: 'タイマー使用有り', reading: 'たいまーしようあり' },
  'kinrei-positions-031': { display: 'トレー調整', reading: 'とれーちょうせい' },
  'kinrei-positions-037': { display: 'トレー流し', reading: 'とれーながし' },
  'kinrei-positions-041': { display: '小袋', reading: 'こぶくろ' },
  'kinrei-positions-042': { display: '具チェック', reading: 'ぐちぇっく' },
  'kinrei-positions-043': { display: '外袋', reading: 'がいぶくろ' },
  'kinrei-positions-045': { display: '向き替え', reading: 'むきかえ' },
  'kinrei-positions-048': { display: '箱入れ', reading: 'はこいれ' },
  'kinrei-positions-052': { display: 'スープ出し', reading: 'すーぷだし' },
  'kinrei-positions-053': { display: 'スープ入れ', reading: 'すーぷいれ' },
  'kinrei-positions-054': { display: 'スープ運び', reading: 'すーぷはこび' },
  'kinrei-positions-055': { display: '押さえ', reading: 'おさえ' },
  'kinrei-positions-021': { display: 'ごみ場', reading: 'ごみば' },
  'kinrei-positions-023': { display: '洗い場', reading: 'あらいば' },
  'kinrei-positions-032': { display: '具出し', reading: 'ぐだし' },
  'kinrei-positions-034': { display: '入り口', reading: 'いりぐち' },
  'kinrei-positions-049': { display: '箱作り', reading: 'はこづくり' },
  'kinrei-mono-066': { display: 'お湯', reading: 'おゆ' },
  'kinrei-mono-107': { display: '刃こぼれ', reading: 'はこぼれ' },
  'kinrei-ingredients-005': { display: '玉ねぎ', reading: 'たまねぎ' },
  'kinrei-ingredients-006': { display: 'ごま油', reading: 'ごまあぶら' },
  'kinrei-ingredients-027': { display: 'ごま油', reading: 'ごまあぶら' },
  'kinrei-ingredients-035': { display: 'ほうれん草', reading: 'ほうれんそう' },
  'kinrei-ingredients-046': { display: 'さつま揚げ', reading: 'さつまあげ' },
  'kinrei-ingredients-074': { display: '牛もつ', reading: 'ぎゅうもつ' },
  'kinrei-ingredients-081': { display: 'なま肉', reading: 'なまにく' },
};

let termState = {
  terms: [],
  filtered: [],
  progress: {},
  imageProgress: {},
  currentIndex: 0,
  quizSetIndex: 0,
  flipped: false,
  quiz: null,
  profile: null,
  finalTestUnlocked: false,
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function isKinreiProfile(profile) {
  const studentId = String(profile?.student_id || '').toUpperCase();
  if (studentId === 'GRV001') return true;
  const company = String(profile?.company || '').toLowerCase();
  const group = String(profile?.class_group || '').toLowerCase();
  return company.includes('キンレイ') || company.includes('kinrei') || group.includes('キンレイ') || group.includes('kinrei');
}

async function terminologyLogout() {
  await supabase.auth.signOut();
  window.location.href = 'terminology-login.html';
}

async function checkTerminologyAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'terminology-login.html';
    return null;
  }

  const { data, error } = await supabase
    .from('trainees')
    .select('id, student_id, name_katakana, name_romaji, company, class_group, organization_id, auth_user_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !data) {
    await supabase.auth.signOut();
    window.location.href = 'terminology-login.html';
    return null;
  }

  if (!isKinreiProfile(data)) {
    document.body.innerHTML = `
      <header><h1>キンレイ専門用語</h1><p>Từ vựng chuyên ngành Kinrei</p></header>
      <main class="term-wrap">
        <section class="term-hero">
          <div>
            <h2>この学習ページはキンレイ実習生専用です</h2>
            <p>対象者ではないため利用できません。必要な場合は管理者に確認してください。</p>
          </div>
        </section>
        <button class="btn-logout" onclick="terminologyLogout()">ログアウト</button>
      </main>
    `;
    return null;
  }

  return { session, profile: data };
}

function localKey() {
  const id = termState.profile?.student_id || 'guest';
  return `${TERM_STORAGE_KEY}:${id}`;
}

function imageLocalKey() {
  const id = termState.profile?.student_id || 'guest';
  return `${IMAGE_STORAGE_KEY}:${id}`;
}

function loadLocalProgress() {
  try {
    return JSON.parse(localStorage.getItem(localKey()) || '{}');
  } catch (_) {
    return {};
  }
}

function saveLocalProgress() {
  localStorage.setItem(localKey(), JSON.stringify(termState.progress));
}

function loadImageProgress() {
  try {
    return JSON.parse(localStorage.getItem(imageLocalKey()) || '{}');
  } catch (_) {
    return {};
  }
}

function saveImageProgress() {
  localStorage.setItem(imageLocalKey(), JSON.stringify(termState.imageProgress));
}

function getImageProgress(imageId) {
  return termState.imageProgress[imageId] || { status: 'new', updatedAt: null };
}

async function saveImageItemProgress(item, status) {
  if (!item) return;
  termState.imageProgress[item.id] = { ...getImageProgress(item.id), status, updatedAt: new Date().toISOString() };
  saveImageProgress();
  if (termState.profile?.id) {
    try {
      await supabase.from('terminology_image_progress').upsert({
        trainee_id: termState.profile.id,
        image_id: item.id,
        status,
        last_studied_at: new Date().toISOString(),
      }, { onConflict: 'trainee_id,image_id' });
    } catch (err) {
      console.warn('image progress save skipped', err);
    }
  }
}

function testSetKey() {
  const id = termState.profile?.student_id || 'guest';
  return `${TEST_STORAGE_KEY}:${id}`;
}

function loadCompletedTestSets() {
  try {
    return new Set(JSON.parse(localStorage.getItem(testSetKey()) || '[]'));
  } catch (_) {
    return new Set();
  }
}

function saveCompletedTestSet(setNumber) {
  const completed = loadCompletedTestSets();
  completed.add(setNumber);
  localStorage.setItem(testSetKey(), JSON.stringify([...completed].sort((a, b) => a - b)));
}

function isQuizSetUnlocked(setNumber) {
  if (setNumber <= 1) return true;
  const completed = loadCompletedTestSets();
  for (let n = 1; n < setNumber; n += 1) {
    if (!completed.has(n)) return false;
  }
  return true;
}

function isAllQuizSetsCompleted() {
  const total = getQuizSets().length;
  const completed = loadCompletedTestSets();
  return total > 0 && [...completed].filter(n => n >= 1 && n <= total).length >= total;
}

function isFinalQuizUnlocked() {
  return isAllQuizSetsCompleted() && termState.finalTestUnlocked;
}

function getProgress(termId) {
  return termState.progress[termId] || { status: 'new', attempts: 0, correct: 0 };
}

async function loadSupabaseProgress() {
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_progress')
      .select('term_id,status,correct_count,wrong_count,last_studied_at')
      .eq('trainee_id', termState.profile.id);
    if (error || !data) return;
    data.forEach(item => {
      const local = getProgress(item.term_id);
      termState.progress[item.term_id] = {
        ...local,
        status: item.status || local.status,
        correct: Math.max(local.correct || 0, item.correct_count || 0),
        attempts: Math.max(local.attempts || 0, (item.correct_count || 0) + (item.wrong_count || 0)),
        updatedAt: item.last_studied_at || local.updatedAt,
      };
    });
    saveLocalProgress();
  } catch (err) {
    console.warn('progress load skipped', err);
  }
}

async function loadSupabaseImageProgress() {
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_image_progress')
      .select('image_id,status,last_studied_at')
      .eq('trainee_id', termState.profile.id);
    if (error || !data) return;
    data.forEach(item => {
      const local = getImageProgress(item.image_id);
      termState.imageProgress[item.image_id] = {
        ...local,
        status: item.status || local.status,
        updatedAt: item.last_studied_at || local.updatedAt,
      };
    });
    saveImageProgress();
  } catch (err) {
    console.warn('image progress load skipped', err);
  }
}

async function loadSupabaseQuizHistory() {
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_quiz_results')
      .select('set_id,score_rate')
      .eq('trainee_id', termState.profile.id)
      .like('set_id', 'kinrei-test-2023-%');
    if (error || !data) return;
    data.forEach(item => {
      const match = String(item.set_id || '').match(/^kinrei-test-2023-(\d+)$/);
      if (match && Number(item.score_rate || 0) >= 100) saveCompletedTestSet(Number(match[1]));
    });
  } catch (err) {
    console.warn('quiz history load skipped', err);
  }
}

async function loadFinalTestUnlock() {
  termState.finalTestUnlocked = false;
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_final_unlocks')
      .select('is_unlocked')
      .eq('trainee_id', termState.profile.id)
      .eq('test_set_id', FINAL_QUIZ_SET_ID)
      .maybeSingle();
    if (error) return;
    termState.finalTestUnlocked = Boolean(data?.is_unlocked);
  } catch (err) {
    console.warn('final test unlock load skipped', err);
  }
}

async function logStudySession() {
  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_study_sessions').insert({
      trainee_id: termState.profile.id,
      session_type: 'open',
      user_agent: navigator.userAgent || '',
    });
  } catch (err) {
    console.warn('study session log skipped', err);
  }
}

async function saveProgress(termId, status) {
  const current = getProgress(termId);
  termState.progress[termId] = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  saveLocalProgress();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_progress').upsert({
      trainee_id: termState.profile.id,
      term_id: termId,
      status,
      correct_count: termState.progress[termId].correct || 0,
      wrong_count: Math.max((termState.progress[termId].attempts || 0) - (termState.progress[termId].correct || 0), 0),
      last_studied_at: new Date().toISOString(),
    }, { onConflict: 'trainee_id,term_id' });
  } catch (err) {
    console.warn('progress save skipped', err);
  }
}

function updateQuizProgress(termId, isCorrect) {
  const current = getProgress(termId);
  termState.progress[termId] = {
    ...current,
    attempts: (current.attempts || 0) + 1,
    correct: (current.correct || 0) + (isCorrect ? 1 : 0),
    status: isCorrect ? 'learned' : 'review',
    updatedAt: new Date().toISOString(),
  };
  saveLocalProgress();
  saveProgress(termId, termState.progress[termId].status);
}

function statusLabel(status) {
  return {
    new: 'Chưa học / 未学習',
    learning: 'Đang học / 学習中',
    learned: 'Đã nhớ / 覚えた',
    review: 'Chưa nhớ / おぼえてない',
  }[status || 'new'] || status;
}

function readingForTerm(term) {
  if (TERM_OVERRIDES[term.id]?.reading) return TERM_OVERRIDES[term.id].reading;
  const verb = parseVerbReading(term.term);
  if (verb) return verb.reading;
  const text = String(term.term || '').trim();
  if (!text) return '';
  const inlineReading = collectHiraganaParts(text);
  const kanaReading = cleanKanaReading(term.kana);
  if (inlineReading.length) {
    const joined = inlineReading.join('・');
    return shouldPreferKanaReading(text, joined, kanaReading) ? katakanaToHiragana(kanaReading) : joined;
  }
  if (isKatakanaOnly(text)) return katakanaToHiragana(text);
  return kanaReading ? katakanaToHiragana(kanaReading) : '';
}

function displayTermForTerm(term) {
  if (TERM_OVERRIDES[term.id]?.display) return TERM_OVERRIDES[term.id].display;
  const verb = parseVerbReading(term.term);
  if (verb) return verb.display;
  const text = String(term.term || '').trim();
  if (!hasKanji(text)) return text;
  return [...text].filter(ch => !isHiragana(ch)).join('').replace(/\s+/g, ' ').trim();
}

function displayTermWithReading(term) {
  if (TERM_OVERRIDES[term.id]?.inline) return TERM_OVERRIDES[term.id].inline;
  const display = displayTermForTerm(term);
  const reading = readingForTerm(term);
  if (!reading || !hasKanji(display)) return display;

  const kanjiParts = display.match(/[\u4e00-\u9fff々]+/g) || [];
  if (!kanjiParts.length) return display;
  const rawReadingParts = collectHiraganaParts(term.term);
  if (kanjiParts.length === rawReadingParts.length && !rawReadingsIncludeOkurigana(display, rawReadingParts)) {
    let index = 0;
    return display.replace(/[\u4e00-\u9fff々]+/g, part => {
      const partReading = rawReadingParts[index++];
      return partReading ? `${part}(${partReading})` : part;
    });
  }
  if (kanjiParts.length === 1 && !display.trim().endsWith(kanjiParts[0])) return `${display}(${reading})`;
  const readingParts = reading.split(/[・、,，\s]+/).filter(Boolean);
  let parts = [];

  if (kanjiParts.length === readingParts.length) {
    parts = readingParts;
  } else if (kanjiParts.length > 1 && kanjiParts.every(part => part === kanjiParts[0])) {
    const repeated = splitRepeatedReading(reading, kanjiParts.length);
    if (repeated) parts = Array(kanjiParts.length).fill(repeated);
  }

  if (!parts.length) return `${display}(${reading})`;

  let index = 0;
  return display.replace(/[\u4e00-\u9fff々]+/g, part => {
    const partReading = parts[index++];
    return partReading ? `${part}(${partReading})` : part;
  });
}

function rawReadingsIncludeOkurigana(display, rawReadingParts) {
  const matches = [...String(display || '').matchAll(/[\u4e00-\u9fff々]+/g)];
  return matches.some((match, index) => {
    const after = String(display || '').slice(match.index + match[0].length);
    const okurigana = (after.match(/^[ぁ-ん]+/) || [''])[0];
    return okurigana && rawReadingParts[index]?.startsWith(okurigana);
  });
}

function splitRepeatedReading(reading, count) {
  const text = String(reading || '').replace(/[・、,，\s]/g, '');
  if (!text || text.length % count !== 0) return '';
  const unit = text.slice(0, text.length / count);
  return unit.repeat(count) === text ? unit : '';
}

function isHiragana(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 0x3041 && cp <= 0x3096;
}

function parseVerbReading(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.+ます)([ぁ-ん]+)$/);
  if (!match || !hasKanji(match[1])) return null;
  const display = match[1];
  const suffix = collectTrailingHiragana(display);
  let stem = match[2];
  if (suffix && stem.endsWith(suffix[0])) stem = stem.slice(0, -1);
  return { display, reading: `${stem}${suffix}` };
}

function collectTrailingHiragana(value) {
  let suffix = '';
  for (const ch of [...String(value || '')].reverse()) {
    if (!isHiragana(ch)) break;
    suffix = ch + suffix;
  }
  return suffix;
}

function isKatakana(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x30a1 && cp <= 0x30fa) || cp === 0x30fc;
}

function hasKanji(text) {
  return [...text].some(ch => {
    const cp = ch.codePointAt(0);
    return (cp >= 0x4e00 && cp <= 0x9fff) || cp === 0x3005;
  });
}

function isKatakanaOnly(text) {
  const chars = [...text].filter(ch => !/[\s・（）()、,]/.test(ch));
  return chars.length > 0 && chars.every(isKatakana);
}

function cleanKanaReading(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const chars = [...text].filter(ch => !/[\s・（）()、,]/.test(ch));
  return chars.length > 0 && chars.every(isKatakana) ? text : '';
}

function shouldPreferKanaReading(termText, inlineReading, kanaReading) {
  if (!kanaReading) return false;
  if (!inlineReading) return true;
  if (normalizeReading(inlineReading) !== normalizeReading(katakanaToHiragana(kanaReading))) return true;
  if (inlineReading.length <= 2 && kanaReading.length > inlineReading.length) return true;
  if (hasKanji(termText) && /[\u30a1-\u30fa]/.test(termText) && kanaReading.length > inlineReading.length) return true;
  return false;
}

function katakanaToHiragana(value) {
  return [...String(value || '')].map(ch => {
    const cp = ch.codePointAt(0);
    if (cp >= 0x30a1 && cp <= 0x30f6) return String.fromCodePoint(cp - 0x60);
    return ch;
  }).join('');
}

function normalizeReading(value) {
  return String(value || '').replace(/[\s・（）()、,]/g, '').toLowerCase();
}

function collectHiraganaParts(text) {
  const parts = [];
  let current = '';
  for (const ch of text) {
    if (isHiragana(ch)) {
      current += ch;
    } else if (current) {
      parts.push(current);
      current = '';
    }
  }
  if (current) parts.push(current);
  return parts;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seededShuffle(items, seedText) {
  let seed = 2166136261;
  for (const ch of String(seedText || 'kinrei')) {
    seed ^= ch.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  const rand = () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return [...items].map(item => ({ item, sort: rand() }))
    .sort((a, b) => a.sort - b.sort)
    .map(entry => entry.item);
}

function renderStats() {
  const values = Object.values(termState.progress);
  const imageValues = Object.values(termState.imageProgress);
  const totalItems = termState.terms.length + getImageItems().length;
  const learned = values.filter(item => item.status === 'learned').length;
  const review = values.filter(item => item.status === 'review').length;
  const imageLearned = imageValues.filter(item => item.status === 'learned').length;
  const imageReview = imageValues.filter(item => item.status === 'review').length;
  const attempts = values.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = values.reduce((sum, item) => sum + (item.correct || 0), 0);
  document.getElementById('statLearned').textContent = `${learned + imageLearned} / ${totalItems}`;
  document.getElementById('statReview').textContent = review + imageReview;
  document.getElementById('statRate').textContent = attempts ? `${Math.round((correct / attempts) * 100)}%` : '0%';
}

function totalLearningItems() {
  return termState.terms.length + getImageItems().length;
}

function learnedItemCount() {
  const wordLearned = Object.values(termState.progress).filter(item => item.status === 'learned').length;
  const imageLearned = Object.values(termState.imageProgress).filter(item => item.status === 'learned').length;
  return wordLearned + imageLearned;
}

function setCardProgress(prefix, globalNumber) {
  const total = totalLearningItems();
  const learned = learnedItemCount();
  const learnedRate = total ? Math.round((learned / total) * 100) : 0;
  const positionRate = total ? Math.round((globalNumber / total) * 100) : 0;
  document.getElementById(`${prefix}ProgressLabel`).textContent = `${globalNumber}/${total} · Đã nhớ ${learned}`;
  document.getElementById(`${prefix}ProgressPercent`).textContent = `${learnedRate}%`;
  document.getElementById(`${prefix}ProgressBar`).style.width = `${positionRate}%`;
}

function getLearningCards() {
  const wordCards = termState.terms.map((term, index) => ({
    type: 'word',
    id: term.id,
    globalNumber: index + 1,
    source: term,
    status: getProgress(term.id).status,
  }));
  const imageCards = getImageItems().map((item, index) => ({
    type: 'image',
    id: item.id,
    globalNumber: termState.terms.length + index + 1,
    source: item,
    status: getImageProgress(item.id).status,
  }));
  return [...wordCards, ...imageCards].filter(item => item.status !== 'learned');
}

function applyFilters() {
  termState.filtered = getLearningCards();
  if (termState.currentIndex >= termState.filtered.length) termState.currentIndex = 0;
  termState.flipped = false;
  renderCard();
  renderArchive();
  renderQuizOverview();
}

function renderCard() {
  const card = document.getElementById('termCard');
  card.classList.toggle('flipped', termState.flipped);
  document.getElementById('cardTerm').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardKana').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardMeaning').style.display = termState.flipped ? '' : 'none';
  document.getElementById('cardSideLabel').textContent = termState.flipped
    ? 'Nghĩa tiếng Việt / ベトナム語の意味'
    : 'Tiếng Nhật / 日本語';
  document.getElementById('cardHint').textContent = termState.flipped
    ? 'Nhớ rồi thì bấm “Đã nhớ” / 覚えたら「覚えた」'
    : 'Bấm vào thẻ / カードをタップ';

  if (!termState.filtered.length) {
    document.getElementById('cardCategory').textContent = '-';
    setCardProgress('card', learnedItemCount());
    document.getElementById('cardImage').style.display = 'none';
    document.getElementById('cardTerm').style.display = '';
    document.getElementById('cardTerm').textContent = 'Đã nhớ hết';
    document.getElementById('cardKana').textContent = '';
    document.getElementById('cardMeaning').textContent = '';
    document.getElementById('cardHint').textContent = 'Xem lại ở tab thẻ đã nhớ / 覚えたカードで確認';
    return;
  }

  const cardItem = termState.filtered[termState.currentIndex];
  const term = cardItem.source;
  document.getElementById('cardCategory').textContent = cardItem.type === 'word' ? 'ことば' : '写真';
  setCardProgress('card', cardItem.globalNumber);

  if (cardItem.type === 'image') {
    document.getElementById('cardSideLabel').textContent = termState.flipped
      ? 'Tên / 名前'
      : 'Hình ảnh / 写真';
    document.getElementById('cardImage').style.display = termState.flipped ? 'none' : '';
    document.getElementById('cardImage').src = term.image;
    document.getElementById('cardTerm').style.display = termState.flipped ? '' : 'none';
    document.getElementById('cardKana').style.display = termState.flipped ? '' : 'none';
    document.getElementById('cardMeaning').style.display = 'none';
    document.getElementById('cardTerm').textContent = term.term;
    document.getElementById('cardKana').textContent = term.reading ? `Cách đọc: ${term.reading}` : '';
    document.getElementById('cardMeaning').textContent = '';
    document.getElementById('cardHint').textContent = termState.flipped
      ? 'Nhớ rồi thì bấm “Đã nhớ” / 覚えたら「覚えた」'
      : 'Bấm vào hình / 写真をタップ';
    renderStats();
    return;
  }

  const reading = readingForTerm(term);
  if (getProgress(term.id).status === 'new') {
    termState.progress[term.id] = { ...getProgress(term.id), status: 'learning', updatedAt: new Date().toISOString() };
    saveLocalProgress();
  }
  document.getElementById('cardCategory').textContent = term.category;
  document.getElementById('cardImage').style.display = 'none';
  document.getElementById('cardTerm').textContent = displayTermWithReading(term);
  document.getElementById('cardKana').textContent = reading ? `Cách đọc: ${reading}` : '';
  document.getElementById('cardMeaning').textContent = term.meaningVi;
  renderStats();
}

function renderList() {
  const visibleCount = document.getElementById('visibleCount');
  const list = document.getElementById('termList');
  if (!visibleCount || !list) return;
  document.getElementById('visibleCount').textContent = `${termState.filtered.length}語`;
  list.innerHTML = termState.filtered.map((term, index) => {
    const progress = getProgress(term.id);
    const reading = readingForTerm(term);
    return `
      <button type="button" class="term-row ${index === termState.currentIndex ? 'active' : ''}" data-index="${index}">
        <span>
          <strong>${esc(displayTermWithReading(term))}</strong>
          ${reading ? `<small class="term-reading">Cách đọc: ${esc(reading)}</small>` : ''}
          <small>${esc(term.meaningVi)}</small>
        </span>
        <em class="status-pill status-${esc(progress.status)}">${esc(statusLabel(progress.status))}</em>
      </button>
    `;
  }).join('');
  list.querySelectorAll('.term-row').forEach(row => {
    row.addEventListener('click', () => {
      termState.currentIndex = Number(row.dataset.index);
      termState.flipped = false;
      renderCard();
      renderList();
    });
  });
}

function renderArchive() {
  const list = document.getElementById('archiveList');
  const count = document.getElementById('archiveCount');
  if (!list || !count) return;

  const learnedWords = termState.terms
    .filter(term => getProgress(term.id).status === 'learned')
    .map(term => ({
      type: 'ことば',
      typeVi: 'Từ',
      title: displayTermWithReading(term),
      sub: term.meaningVi,
      reading: readingForTerm(term),
    }));
  const learnedImages = getImageItems()
    .filter(item => getImageProgress(item.id).status === 'learned')
    .map(item => ({
      type: '写真',
      typeVi: 'Ảnh',
      title: item.term,
      sub: item.reading ? `Cách đọc: ${item.reading}` : '',
      reading: '',
    }));
  const items = [...learnedWords, ...learnedImages];
  count.textContent = `${items.length}件`;
  list.innerHTML = items.length
    ? items.map(item => `
      <div class="archive-row">
        <span>
          <strong>${esc(item.title)}</strong>
          ${item.reading ? `<small>Cách đọc: ${esc(item.reading)}</small>` : ''}
          ${item.sub ? `<small>${esc(item.sub)}</small>` : ''}
        </span>
        <em class="status-pill">${esc(item.type)} / ${esc(item.typeVi)}</em>
      </div>
    `).join('')
    : '<p class="hint">Chưa có thẻ đã nhớ.<br>まだ覚えたカードはありません。</p>';
}

function getUnifiedTestItems() {
  const wordItems = termState.terms.map(term => ({
    type: 'word',
    id: term.id,
    prompt: displayTermWithReading(term),
    reading: readingForTerm(term),
    answer: term.meaningVi,
    source: term,
  }));
  const imageItems = getImageItems().map(item => ({
    type: 'image',
    id: item.id,
    prompt: item.term,
    reading: item.reading,
    answer: item.term,
    image: item.image,
    source: item,
  }));
  return [...wordItems, ...imageItems];
}

function getQuizSets() {
  const pool = getUnifiedTestItems();
  const sets = [];
  for (let i = 0; i < pool.length; i += QUIZ_SET_SIZE) {
    sets.push(pool.slice(i, i + QUIZ_SET_SIZE));
  }
  return sets;
}

function getFinalQuizQuestions() {
  const seed = `${termState.profile?.student_id || 'guest'}:${FINAL_QUIZ_SET_ID}`;
  return seededShuffle(getUnifiedTestItems(), seed).slice(0, FINAL_QUIZ_SIZE);
}

function renderFinalQuizOverview() {
  const box = document.getElementById('finalTestBox');
  const status = document.getElementById('finalTestStatus');
  const button = document.getElementById('startFinalQuizBtn');
  if (!box || !status || !button) return;
  const allSmallTestsDone = isAllQuizSetsCompleted();
  const unlocked = isFinalQuizUnlocked();
  box.classList.toggle('locked', !unlocked);
  button.disabled = !unlocked;
  status.textContent = unlocked
    ? '先生の前で受けられます / Có thể làm bài trước giáo viên'
    : allSmallTestsDone
      ? '先生が開けるまで待ってください / Chờ giáo viên mở bài'
      : `全${getQuizSets().length}回が終わると先生が開けます / Hoàn thành ${getQuizSets().length} lần, giáo viên sẽ mở`;
}

function renderQuizOverview() {
  const select = document.getElementById('quizSetSelect');
  const summary = document.getElementById('quizSetSummary');
  if (!select || !summary) return;

  const sets = getQuizSets();
  if (termState.quizSetIndex >= sets.length) termState.quizSetIndex = 0;
  const completedSetNumbers = loadCompletedTestSets();
  const completed = [...completedSetNumbers].filter(n => n >= 1 && n <= sets.length).length;

  select.innerHTML = sets.map((set, index) => {
    const start = index * QUIZ_SET_SIZE + 1;
    const end = start + set.length - 1;
    const setNumber = index + 1;
    const done = completedSetNumbers.has(setNumber) ? ' ✓' : '';
    const locked = isQuizSetUnlocked(setNumber) ? '' : ' disabled';
    const lockText = locked ? ' 🔒' : '';
    return `<option value="${index}"${locked}>第${setNumber}回（${start}-${end}問）${done}${lockText}</option>`;
  }).join('');
  if (!isQuizSetUnlocked(termState.quizSetIndex + 1)) {
    const firstLockedIndex = sets.findIndex((_, index) => !completedSetNumbers.has(index + 1));
    termState.quizSetIndex = Math.max(0, firstLockedIndex);
  }
  select.value = String(termState.quizSetIndex);
  summary.textContent = sets.length
    ? `Đúng 100% để mở bài tiếp theo：${completed} / ${sets.length} lần`
    : 'テストできる単語がありません';
  const progressRate = sets.length ? Math.round((completed / sets.length) * 100) : 0;
  document.getElementById('testProgressBar').style.width = `${progressRate}%`;
  document.getElementById('testProgressText').textContent = `${completed} / ${sets.length} (${progressRate}%)`;

  const button = document.getElementById('startQuizBtn');
  if (button) button.innerHTML = `第${termState.quizSetIndex + 1}回を始める<br>Bắt đầu lần ${termState.quizSetIndex + 1}`;
  renderFinalQuizOverview();
}

function getImageItems() {
  return window.KINREI_IMAGE_QUIZ?.items || [];
}

function moveCard(delta) {
  if (!termState.filtered.length) return;
  termState.currentIndex = (termState.currentIndex + delta + termState.filtered.length) % termState.filtered.length;
  termState.flipped = false;
  renderCard();
}

function showMode(mode) {
  const test = mode === 'test';
  const archive = mode === 'archive';
  document.getElementById('cardPanel').classList.toggle('hidden', test || archive);
  document.getElementById('testPanel').classList.toggle('hidden', !test);
  document.getElementById('archivePanel').classList.toggle('hidden', !archive);
  document.getElementById('learnModeBtn').classList.toggle('active', !test);
  document.getElementById('archiveModeBtn').classList.toggle('active', archive);
  document.getElementById('learnModeBtn').classList.toggle('active', !test && !archive);
  document.getElementById('testModeBtn').classList.toggle('active', test);
  if (!test && !archive) renderCard();
  if (archive) renderArchive();
  if (test) renderQuizOverview();
}

function startQuiz() {
  const sets = getQuizSets();
  if (!sets.length) return;
  if (!isQuizSetUnlocked(termState.quizSetIndex + 1)) {
    document.getElementById('quizFeedback').textContent = '前の回を全問正解すると開きます / Cần đúng 100% bài trước';
    return;
  }
  const questions = sets[termState.quizSetIndex] || sets[0];
  termState.quiz = {
    kind: 'standard',
    setNumber: termState.quizSetIndex + 1,
    questions: shuffle(questions),
    index: 0,
    correct: 0,
    answers: [],
    answered: false,
  };
  document.getElementById('quizResult').classList.add('hidden');
  renderQuiz();
}

function startFinalQuiz() {
  if (!isFinalQuizUnlocked()) {
    renderFinalQuizOverview();
    return;
  }
  const questions = getFinalQuizQuestions();
  if (!questions.length) return;
  termState.quiz = {
    kind: 'final',
    setNumber: 'final',
    questions,
    index: 0,
    correct: 0,
    answers: [],
    answered: false,
  };
  document.getElementById('quizResult').classList.add('hidden');
  renderQuiz();
}

function renderQuiz() {
  const quiz = termState.quiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishQuiz();
    return;
  }
  const question = quiz.questions[quiz.index];
  const options = question.type === 'image'
    ? shuffle([question, ...shuffle(getUnifiedTestItems().filter(item => item.type === 'image' && item.id !== question.id && item.answer !== question.answer)).slice(0, 3)])
    : shuffle([question, ...shuffle(getUnifiedTestItems().filter(item => item.type === 'word' && item.id !== question.id)).slice(0, 3)]);
  quiz.answered = false;
  document.getElementById('quizNow').textContent = quiz.index + 1;
  document.getElementById('quizTotal').textContent = quiz.questions.length;
  const wordTitle = esc(question.prompt);
  document.getElementById('quizPrompt').innerHTML = question.type === 'image'
    ? '<span class="quiz-word-prompt">Hãy xem hình</span><span class="quiz-help">Chọn tên đúng</span>'
    : `<span class="quiz-word-prompt">${wordTitle}</span><span class="quiz-help">Chọn nghĩa đúng bằng tiếng Việt</span>`;
  const img = document.getElementById('quizQuestionImg');
  img.style.display = question.type === 'image' ? '' : 'none';
  if (question.type === 'image') img.src = question.image;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizOptions').innerHTML = options.map(option =>
    `<button type="button" class="quiz-option" data-id="${esc(option.id)}">${esc(option.answer)}${option.type === 'image' && option.reading ? `<br><small>Cách đọc: ${esc(option.reading)}</small>` : ''}</button>`
  ).join('');
  document.querySelectorAll('.quiz-option').forEach(button => button.addEventListener('click', () => answerQuiz(button.dataset.id)));
}

function answerQuiz(selectedId) {
  const quiz = termState.quiz;
  if (!quiz || quiz.answered) return;
  const question = quiz.questions[quiz.index];
  const ok = selectedId === question.id;
  quiz.answered = true;
  quiz.correct += ok ? 1 : 0;
  quiz.answers.push({ type: question.type, id: question.id, correct: ok });
  if (question.type === 'word' && quiz.kind !== 'final') updateQuizProgress(question.id, ok);
  document.querySelectorAll('.quiz-option').forEach(button => {
    button.disabled = true;
    if (button.dataset.id === question.id) button.classList.add('correct');
    if (button.dataset.id === selectedId && !ok) button.classList.add('wrong');
  });
  document.getElementById('quizFeedback').textContent = ok ? '正解です / Đúng rồi' : `正解 / Đáp án: ${question.answer}`;
  document.getElementById('nextQuizBtn').disabled = false;
  renderStats();
  renderList();
}

async function finishQuiz() {
  const quiz = termState.quiz;
  if (!quiz) return;
  const isFinal = quiz.kind === 'final';
  const rate = quiz.questions.length ? Math.round((quiz.correct / quiz.questions.length) * 100) : 0;
  document.getElementById('quizPrompt').textContent = isFinal ? '総合修了テスト完了 / Hoàn thành' : 'テスト完了 / Hoàn thành';
  document.getElementById('quizOptions').innerHTML = '';
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizQuestionImg').style.display = 'none';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizResult').classList.remove('hidden');
  document.getElementById('quizResult').innerHTML = isFinal
    ? `<strong>総合修了テスト 完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>修了テストの結果を保存しました。<br>Đã lưu kết quả kiểm tra hoàn thành.</p>`
    : rate === 100
      ? `<strong>第${quiz.setNumber}回 100%：${quiz.correct} / ${quiz.questions.length}問 正解</strong><p>次の回が開きました。<br>Đã mở bài tiếp theo.</p>`
      : `<strong>第${quiz.setNumber}回：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>全問正解すると次の回が開きます。もう一度この回を受けてください。<br>Cần đúng 100% để mở bài tiếp theo.</p>`;
  if (!isFinal && rate === 100) {
    saveCompletedTestSet(quiz.setNumber);
    const sets = getQuizSets();
    if (termState.quizSetIndex < sets.length - 1) termState.quizSetIndex += 1;
  }
  renderQuizOverview();

  if (!termState.profile?.id) return;
  try {
    await supabase.from('terminology_quiz_results').insert({
      trainee_id: termState.profile.id,
      set_id: isFinal ? FINAL_QUIZ_SET_ID : `kinrei-test-2023-${String(quiz.setNumber).padStart(2, '0')}`,
      total_questions: quiz.questions.length,
      correct_count: quiz.correct,
      score_rate: rate,
      answers_json: quiz.answers,
    });
  } catch (err) {
    console.warn('quiz result save skipped', err);
  }
}

function setupEvents() {
  document.getElementById('termCard').addEventListener('click', () => { termState.flipped = !termState.flipped; renderCard(); });
  document.getElementById('termCard').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      termState.flipped = !termState.flipped;
      renderCard();
    }
  });
  document.getElementById('prevCardBtn').addEventListener('click', () => moveCard(-1));
  document.getElementById('nextCardBtn').addEventListener('click', () => moveCard(1));
  document.getElementById('reviewBtn').addEventListener('click', async () => {
    const item = termState.filtered[termState.currentIndex];
    if (item?.type === 'word') await saveProgress(item.id, 'review');
    if (item?.type === 'image') await saveImageItemProgress(item.source, 'review');
    moveCard(1);
  });
  document.getElementById('learnedBtn').addEventListener('click', async () => {
    const item = termState.filtered[termState.currentIndex];
    if (item?.type === 'word') await saveProgress(item.id, 'learned');
    if (item?.type === 'image') await saveImageItemProgress(item.source, 'learned');
    applyFilters();
    renderStats();
  });
  document.getElementById('learnModeBtn').addEventListener('click', () => showMode('learn'));
  document.getElementById('archiveModeBtn').addEventListener('click', () => showMode('archive'));
  document.getElementById('testModeBtn').addEventListener('click', () => showMode('test'));
  document.getElementById('quizSetSelect').addEventListener('change', event => {
    termState.quizSetIndex = Number(event.target.value) || 0;
    termState.quiz = null;
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('quizOptions').innerHTML = '';
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizPrompt').innerHTML = 'テストを始めてください<br>Bắt đầu kiểm tra';
    document.getElementById('quizNow').textContent = '0';
    const set = getQuizSets()[termState.quizSetIndex] || [];
    document.getElementById('quizTotal').textContent = set.length || QUIZ_SET_SIZE;
    renderQuizOverview();
  });
  document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
  document.getElementById('startFinalQuizBtn').addEventListener('click', startFinalQuiz);
  document.getElementById('nextQuizBtn').addEventListener('click', () => {
    if (!termState.quiz) return;
    termState.quiz.index += 1;
    renderQuiz();
  });
}

(async function init() {
  const auth = await checkTerminologyAuth();
  if (!auth) return;
  termState.profile = auth.profile;
  document.getElementById('student-bar').style.display = 'flex';
  document.getElementById('student-name').textContent = auth.profile.name_katakana || auth.profile.name_romaji || '';
  document.getElementById('student-id-display').textContent = `（${auth.profile.student_id || ''}）`;
  termState.terms = window.KINREI_VOCAB?.terms || [];
  termState.progress = loadLocalProgress();
  termState.imageProgress = loadImageProgress();
  await logStudySession();
  await loadSupabaseProgress();
  await loadSupabaseImageProgress();
  await loadSupabaseQuizHistory();
  await loadFinalTestUnlock();
  setupEvents();
  applyFilters();
  renderImageCard();
  renderStats();
})();
