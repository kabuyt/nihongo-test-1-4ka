const APP_CONFIG = {
  storagePrefix: 'kinrei',
  companyNameJa: 'キンレイ',
  companyNameVi: 'Kinrei',
  loginPage: 'terminology-login.html',
  vocabGlobal: 'KINREI_VOCAB',
  imageGlobal: 'KINREI_IMAGE_QUIZ',
  allowedCompanyKeywords: ['キンレイ', 'kinrei'],
  adminStudentIds: ['GRV001'],
  quizSetPrefix: 'kinrei-test-2023',
  finalQuizSetId: 'kinrei-final-2023',
  quizSetSize: 20,
  finalQuizSize: 100,
  enableFinalTest: true,
  // 'quiz-ladder' = 小テストN回を順に全問正解して進む方式（キンレイ・既定値）。
  // 'srs' = 間隔反復方式（オオタ）。window.TERMINOLOGY_APPで上書きされない限りこの既定値のまま。
  learningMode: 'quiz-ladder',
  ...(window.TERMINOLOGY_APP || {}),
};

const TERM_STORAGE_KEY = `${APP_CONFIG.storagePrefix}TerminologyProgress:v1`;
const TEST_STORAGE_KEY = `${APP_CONFIG.storagePrefix}TerminologyPerfectTestSets:v2`;
const IMAGE_STORAGE_KEY = `${APP_CONFIG.storagePrefix}ImageMemoryProgress:v1`;
const QUIZ_SET_SIZE = APP_CONFIG.quizSetSize || 20;
const FINAL_QUIZ_SIZE = APP_CONFIG.finalQuizSize || 100;
const FINAL_QUIZ_SET_ID = APP_CONFIG.finalQuizSetId;
// SRSモード(learningMode==='srs')専用の間隔反復レベル。レベル1→+1日、2→+3日、3→+7日、4→+14日、5以上→+30日。
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];
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
  studySessionId: null,
  studyStartedAt: null,
  studyDurationSeconds: 0,
  totalStudySeconds: 0,
  studyTimer: null,
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let saveFailBannerVisible = false;

function showSaveFailBanner() {
  const el = document.getElementById('saveFailBanner');
  if (!el) return;
  el.classList.remove('hidden');
  saveFailBannerVisible = true;
}

function hideSaveFailBanner() {
  if (!saveFailBannerVisible) return;
  const el = document.getElementById('saveFailBanner');
  if (el) el.classList.add('hidden');
  saveFailBannerVisible = false;
}

// Supabaseへの書き込みを実行し、失敗したら2秒後に1回だけ自動リトライする。
// それでも失敗したら画面上部にバナーを表示する。以後どれか1件でも保存に成功したら自動で消す。
// operationはPostgrestのthenable（{error}を返すもの）を返す関数を渡す。
async function writeWithRetry(operation) {
  try {
    const { error } = await operation();
    if (!error) {
      hideSaveFailBanner();
      return true;
    }
    console.error('save failed, retrying in 2s', error);
  } catch (err) {
    console.warn('save failed, retrying in 2s', err);
  }
  await delay(2000);
  try {
    const { error } = await operation();
    if (!error) {
      hideSaveFailBanner();
      return true;
    }
    console.error('save retry failed', error);
    showSaveFailBanner();
    return false;
  } catch (err) {
    console.warn('save retry failed', err);
    showSaveFailBanner();
    return false;
  }
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// SRSモード専用: レベル(1〜5、範囲外はクランプ)に対応する次回復習までの日数。
function srsIntervalForLevel(level) {
  const idx = clamp(level, 1, SRS_INTERVALS_DAYS.length) - 1;
  return SRS_INTERVALS_DAYS[idx];
}

// SRSモード専用: 基準日時(ISO文字列、省略時は現在時刻)にdays日を加算したISO文字列を返す。
function addDaysFromISO(iso, days) {
  const base = iso ? new Date(iso) : new Date();
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function addDaysISO(days) {
  return addDaysFromISO(new Date().toISOString(), days);
}

function isAllowedTerminologyProfile(profile) {
  const studentId = String(profile?.student_id || '').toUpperCase();
  if ((APP_CONFIG.adminStudentIds || []).map(id => String(id).toUpperCase()).includes(studentId)) return true;
  const company = String(profile?.company || '').toLowerCase();
  const group = String(profile?.class_group || '').toLowerCase();
  return (APP_CONFIG.allowedCompanyKeywords || []).some(keyword => {
    const key = String(keyword || '').toLowerCase();
    return key && (company.includes(key) || group.includes(key));
  });
}

async function terminologyLogout() {
  await supabase.auth.signOut();
  window.location.href = APP_CONFIG.loginPage;
}

async function checkTerminologyAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = APP_CONFIG.loginPage;
    return null;
  }

  const { data, error } = await supabase
    .from('trainees')
    .select('id, student_id, name_katakana, name_romaji, company, class_group, organization_id, auth_user_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !data) {
    await supabase.auth.signOut();
    window.location.href = APP_CONFIG.loginPage;
    return null;
  }

  if (!isAllowedTerminologyProfile(data)) {
    document.body.innerHTML = `
      <header><h1>${esc(APP_CONFIG.companyNameJa)}専門用語</h1><p>Từ vựng chuyên ngành ${esc(APP_CONFIG.companyNameVi)}</p></header>
      <main class="term-wrap">
        <section class="term-hero">
          <div>
            <h2>この学習ページは${esc(APP_CONFIG.companyNameJa)}実習生専用です</h2>
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
  if (!termState.profile?.id) return;
  await writeWithRetry(() => supabase.from('terminology_image_progress').upsert({
    trainee_id: termState.profile.id,
    image_id: item.id,
    status,
    last_studied_at: new Date().toISOString(),
  }, { onConflict: 'trainee_id,image_id' }));
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

function formatStudySeconds(seconds) {
  const totalMinutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
  if (totalMinutes < 60) return `${totalMinutes} phút / ${totalMinutes}分`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} giờ ${minutes} phút / ${hours}時間${minutes}分`;
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
      const merged = {
        ...local,
        status: item.status || local.status,
        correct: Math.max(local.correct || 0, item.correct_count || 0),
        attempts: Math.max(local.attempts || 0, (item.correct_count || 0) + (item.wrong_count || 0)),
        updatedAt: item.last_studied_at || local.updatedAt,
      };
      // SRSモード: 端末変更等でローカルにsrsLevelが無い場合、DBのcorrect/wrong集計から復元する。
      // DBにsrsLevel/nextReviewAtの列は無いため、既存列からの近似復元であり劣化は許容する。
      if (APP_CONFIG.learningMode === 'srs' && !local.srsLevel && ['learned', 'review'].includes(item.status)) {
        const level = clamp((item.correct_count || 0) - (item.wrong_count || 0), 1, 5);
        merged.srsLevel = level;
        merged.nextReviewAt = addDaysFromISO(item.last_studied_at, srsIntervalForLevel(level));
      }
      termState.progress[item.term_id] = merged;
    });
    saveLocalProgress();
    if (data.length === 0) {
      await backfillLocalProgress();
    }
  } catch (err) {
    console.warn('progress load skipped', err);
  }
}

async function backfillLocalProgress() {
  if (!termState.profile?.id) return;
  const validIds = new Set((termState.terms || []).map(t => t.id));
  const rows = Object.entries(termState.progress)
    .filter(([termId, p]) => validIds.has(termId) && p && ['learning', 'learned', 'review'].includes(p.status))
    .map(([termId, p]) => ({
      trainee_id: termState.profile.id,
      term_id: termId,
      status: p.status,
      correct_count: p.correct || 0,
      wrong_count: Math.max((p.attempts || 0) - (p.correct || 0), 0),
      last_studied_at: p.updatedAt || new Date().toISOString(),
    }));
  if (!rows.length) return;
  try {
    const { error } = await supabase.from('terminology_progress').upsert(rows, { onConflict: 'trainee_id,term_id' });
    if (error) console.error('progress backfill failed', error);
    else console.info('progress backfill: ' + rows.length + ' terms uploaded');
  } catch (err) {
    console.warn('progress backfill skipped', err);
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
  const dbCompletedSets = new Set();
  try {
    const { data, error } = await supabase
      .from('terminology_quiz_results')
      .select('set_id,score_rate')
      .eq('trainee_id', termState.profile.id)
      .like('set_id', `${APP_CONFIG.quizSetPrefix}-%`);
    if (error || !data) return;
    data.forEach(item => {
      const match = String(item.set_id || '').match(new RegExp(`^${escapeRegExp(APP_CONFIG.quizSetPrefix)}-(\\d+)$`));
      if (!match) return;
      const setNumber = Number(match[1]);
      if (Number(item.score_rate || 0) >= 100) {
        saveCompletedTestSet(setNumber);
        dbCompletedSets.add(setNumber);
      }
    });
  } catch (err) {
    console.warn('quiz history load skipped', err);
    return;
  }
  await backfillLocalQuizResultsToSupabase(dbCompletedSets);
}

// テーブル欠落期間の合格を端末から補填する。旧端末で1回開けば移行完了。
// localStorageには合格記録があるがDB(terminology_quiz_results)には無いセットについて、
// 100点扱いの補填行をinsertする。既にDBにある合格セット(dbCompletedSets)とは突合して重複させない。
// 失敗はconsole.warnのみに留め、次回起動時に再試行させる（ここではリトライ処理を行わない）。
async function backfillLocalQuizResultsToSupabase(dbCompletedSets) {
  if (!termState.profile?.id) return;
  const totalSets = getQuizSets().length;
  const localCompleted = loadCompletedTestSets();
  const missingSets = [...localCompleted].filter(n => n >= 1 && n <= totalSets && !dbCompletedSets.has(n));
  if (!missingSets.length) return;
  for (const setNumber of missingSets) {
    try {
      const { error } = await supabase.from('terminology_quiz_results').insert({
        trainee_id: termState.profile.id,
        set_id: `${APP_CONFIG.quizSetPrefix}-${String(setNumber).padStart(2, '0')}`,
        total_questions: 20,
        correct_count: 20,
        score_rate: 100,
        answers_json: [],
      });
      if (error) console.warn('quiz result backfill failed', setNumber, error);
    } catch (err) {
      console.warn('quiz result backfill skipped', setNumber, err);
    }
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
    const { data, error } = await supabase.from('terminology_study_sessions').insert({
      trainee_id: termState.profile.id,
      session_type: 'open',
      user_agent: navigator.userAgent || '',
      duration_seconds: 0,
      last_seen_at: new Date().toISOString(),
    }).select('id').single();
    if (!error && data?.id) {
      termState.studySessionId = data.id;
      termState.studyStartedAt = Date.now();
      termState.studyDurationSeconds = 0;
    }
  } catch (err) {
    console.warn('study session log skipped', err);
  }
}

async function loadStudyTime() {
  if (!termState.profile?.id) return;
  try {
    const { data, error } = await supabase
      .from('terminology_study_sessions')
      .select('duration_seconds')
      .eq('trainee_id', termState.profile.id);
    if (error || !data) return;
    termState.totalStudySeconds = data.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0);
    renderStudyTime();
  } catch (err) {
    console.warn('study time load skipped', err);
  }
}

function renderStudyTime() {
  const el = document.getElementById('studyTimeNotice');
  if (!el) return;
  el.textContent = `Tổng thời gian học / 総学習時間: ${formatStudySeconds(termState.totalStudySeconds)}`;
}

async function updateStudySessionDuration() {
  if (!termState.studySessionId || !termState.studyStartedAt) return;
  const duration = Math.max(0, Math.round((Date.now() - termState.studyStartedAt) / 1000));
  if (duration <= termState.studyDurationSeconds) return;
  const delta = duration - termState.studyDurationSeconds;
  termState.studyDurationSeconds = duration;
  termState.totalStudySeconds += delta;
  renderStudyTime();
  try {
    await supabase
      .from('terminology_study_sessions')
      .update({
        duration_seconds: duration,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', termState.studySessionId);
  } catch (err) {
    console.warn('study duration update skipped', err);
  }
}

function setupStudyTimeTracking() {
  renderStudyTime();
  if (!termState.studySessionId) return;
  termState.studyTimer = setInterval(updateStudySessionDuration, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') updateStudySessionDuration();
  });
  window.addEventListener('beforeunload', () => {
    updateStudySessionDuration();
  });
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
  await writeWithRetry(() => supabase.from('terminology_progress').upsert({
    trainee_id: termState.profile.id,
    term_id: termId,
    status,
    correct_count: termState.progress[termId].correct || 0,
    wrong_count: Math.max((termState.progress[termId].attempts || 0) - (termState.progress[termId].correct || 0), 0),
    last_studied_at: new Date().toISOString(),
  }, { onConflict: 'trainee_id,term_id' }));
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

// SRSモード専用: カードで「覚えた」を押した時にsrsLevel=1・nextReviewAt=+1日をローカルへ書く。
// この直後に呼ばれるsaveProgress()がこのローカル状態(current経由)を引き継いでDBへ保存する。
function applySrsCardLearned(termId) {
  const current = getProgress(termId);
  termState.progress[termId] = {
    ...current,
    srsLevel: 1,
    nextReviewAt: addDaysISO(SRS_INTERVALS_DAYS[0]),
  };
  saveLocalProgress();
}

// SRSモード専用: 復習(4択)の正誤に応じてsrsLevel/nextReviewAtを更新する。
// 正解: レベル+1(上限5)。不正解: レベル1に戻す。correct/attempts集計は既存のsaveProgress()経由でDBへ反映される。
function updateSrsQuizProgress(termId, isCorrect) {
  const current = getProgress(termId);
  const prevLevel = current.srsLevel || 0;
  const newLevel = isCorrect ? Math.min(prevLevel + 1, SRS_INTERVALS_DAYS.length) : 1;
  termState.progress[termId] = {
    ...current,
    attempts: (current.attempts || 0) + 1,
    correct: (current.correct || 0) + (isCorrect ? 1 : 0),
    status: isCorrect ? 'learned' : 'review',
    srsLevel: newLevel,
    nextReviewAt: addDaysISO(srsIntervalForLevel(newLevel)),
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
  return chars.length > 0 && chars.every(ch => isKatakana(ch) || isHiragana(ch)) ? text : '';
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
  for (const ch of String(seedText || APP_CONFIG.storagePrefix || 'terminology')) {
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
  const statReviewEl = document.getElementById('statReview');
  if (APP_CONFIG.learningMode === 'srs') {
    // SRSモード: 真ん中の統計カードを「おぼえてない」件数ではなく「今日の復習」残数に差し替える。
    statReviewEl.textContent = getDueSrsWords().length;
    const statReviewLabel = statReviewEl.nextElementSibling;
    if (statReviewLabel) statReviewLabel.innerHTML = 'Ôn tập hôm nay<br>今日の復習';
  } else {
    statReviewEl.textContent = review + imageReview;
  }
  document.getElementById('statRate').textContent = attempts ? `${Math.round((correct / attempts) * 100)}%` : '0%';
}

// SRSモード専用: 期限到来語(srsLevel>=1 かつ nextReviewAt<=今)を返す。
function getDueSrsWords() {
  const now = Date.now();
  return termState.terms.filter(term => {
    const p = getProgress(term.id);
    const level = p.srsLevel || 0;
    if (level < 1 || !p.nextReviewAt) return false;
    return new Date(p.nextReviewAt).getTime() <= now;
  });
}

// SRSモード専用: 期限到来語が無い時に見せる「次回の復習日時」。学習未着手(srsLevel=0)の語は対象外。
function getNextUpcomingReviewAt() {
  let soonest = null;
  termState.terms.forEach(term => {
    const p = getProgress(term.id);
    if ((p.srsLevel || 0) < 1 || !p.nextReviewAt) return;
    const t = new Date(p.nextReviewAt).getTime();
    if (soonest === null || t < soonest) soonest = t;
  });
  return soonest;
}

// SRSモード専用: 総合テストの開放判定(全語 srsLevel>=2)。
function srsFinalUnlockStatus() {
  const total = termState.terms.length;
  const level2Count = termState.terms.filter(term => (getProgress(term.id).srsLevel || 0) >= 2).length;
  return { total, level2Count, unlocked: total > 0 && level2Count >= total };
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
  if (APP_CONFIG.learningMode === 'srs') renderSrsReviewOverview(); else renderQuizOverview();
}

function renderCard() {
  const card = document.getElementById('termCard');
  card.classList.toggle('flipped', termState.flipped);
  document.getElementById('cardTerm').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardKana').style.display = termState.flipped ? 'none' : '';
  document.getElementById('cardMeaning').style.display = termState.flipped ? '' : 'none';
  const cardNoteEl = document.getElementById('cardNote');
  if (cardNoteEl) cardNoteEl.style.display = termState.flipped ? '' : 'none';
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
    if (cardNoteEl) cardNoteEl.innerHTML = '';
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
    if (cardNoteEl) cardNoteEl.innerHTML = '';
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
  document.getElementById('cardTerm').textContent = displayTermForTerm(term);
  document.getElementById('cardKana').textContent = reading ? `Cách đọc: ${reading}` : '';
  document.getElementById('cardMeaning').textContent = term.meaningVi;
  if (cardNoteEl) {
    // 解説はカード裏面（意味側）でのみ表示し、表面では空にする。
    cardNoteEl.innerHTML = (termState.flipped && (term.noteJa || term.noteVi))
      ? [term.noteJa, term.noteVi].filter(Boolean).map(esc).join('<br>')
      : '';
  }
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
          <strong>${esc(displayTermForTerm(term))}</strong>
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
      itemType: 'word',
      id: term.id,
      type: 'ことば',
      typeVi: 'Từ',
      title: displayTermForTerm(term),
      sub: term.meaningVi,
      reading: readingForTerm(term),
    }));
  const learnedImages = getImageItems()
    .filter(item => getImageProgress(item.id).status === 'learned')
    .map(item => ({
      itemType: 'image',
      id: item.id,
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
        <span class="archive-row-actions">
          <em class="status-pill">${esc(item.type)} / ${esc(item.typeVi)}</em>
          <button type="button" class="btn-relearn" data-item-type="${esc(item.itemType)}" data-id="${esc(item.id)}">Học lại<br>学習に戻す</button>
        </span>
      </div>
    `).join('')
    : '<p class="hint">Chưa có thẻ đã nhớ.<br>まだ覚えたカードはありません。</p>';

  list.querySelectorAll('.btn-relearn').forEach(button => {
    button.addEventListener('click', () => moveArchivedItemToReview(button.dataset.itemType, button.dataset.id));
  });
}

async function moveArchivedItemToReview(itemType, id) {
  if (itemType === 'word') {
    if (APP_CONFIG.learningMode === 'srs') {
      // SRSでは「学習に戻す」=未習得に戻す。レベルと期限を消して覚えるタブからやり直し
      const current = getProgress(id);
      termState.progress[id] = { ...current, srsLevel: 0, nextReviewAt: null };
      saveLocalProgress();
    }
    await saveProgress(id, 'review');
  } else if (itemType === 'image') {
    const item = getImageItems().find(candidate => candidate.id === id);
    await saveImageItemProgress(item, 'review');
  } else {
    return;
  }
  applyFilters();
  renderStats();
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
  if (!APP_CONFIG.enableFinalTest) {
    box.style.display = 'none';
    return;
  }
  if (APP_CONFIG.learningMode === 'srs') {
    // SRSモード: terminology_final_unlocks(管理開放)や小テスト完了条件は参照せず、全語のsrsLevel>=2だけで判定する。
    const { total, level2Count, unlocked } = srsFinalUnlockStatus();
    box.classList.toggle('locked', !unlocked);
    button.disabled = !unlocked;
    status.textContent = unlocked
      ? '先生の前で受けられます / Có thể làm bài trước giáo viên'
      : `レベル2以上: ${level2Count} / ${total} / Cấp 2 trở lên: ${level2Count} / ${total}`;
    return;
  }
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

// SRSモード専用: テストタブの表示。小テストの回選択select・進捗バーは隠し、期限到来語数を表示する。
function renderSrsReviewOverview() {
  const planLabel = document.querySelector('#wordQuizBox .quiz-plan strong');
  const select = document.getElementById('quizSetSelect');
  const summary = document.getElementById('quizSetSummary');
  const progressWrap = document.querySelector('#wordQuizBox .test-progress');
  const progressText = document.getElementById('testProgressText');
  if (select) select.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'none';
  if (progressText) progressText.style.display = 'none';
  if (planLabel) planLabel.textContent = 'Ôn tập / 復習';

  const due = getDueSrsWords();
  if (summary) {
    if (due.length) {
      summary.textContent = `Ôn tập hôm nay / 今日の復習: ${due.length}語`;
    } else {
      const nextAt = getNextUpcomingReviewAt();
      summary.textContent = nextAt
        ? `Hôm nay không có bài ôn tập / 今日の復習はありません（次回 ${new Date(nextAt).toLocaleDateString('ja-JP')}）`
        : 'Hôm nay không có bài ôn tập / 今日の復習はありません';
    }
  }

  const startBtn = document.getElementById('startQuizBtn');
  if (startBtn) {
    startBtn.innerHTML = '復習を始める<br>Bắt đầu ôn tập';
    startBtn.disabled = due.length === 0;
  }

  renderFinalQuizOverview();
}

function getImageItems() {
  return window[APP_CONFIG.imageGlobal]?.items || [];
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
  if (test) {
    if (APP_CONFIG.learningMode === 'srs') renderSrsReviewOverview(); else renderQuizOverview();
  }
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
  // SRSモードでは terminology_final_unlocks(管理開放)・小テスト完了条件を見ず、srsFinalUnlockStatus()だけで判定する。
  const unlocked = APP_CONFIG.learningMode === 'srs' ? srsFinalUnlockStatus().unlocked : isFinalQuizUnlocked();
  if (!unlocked) {
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

// SRSモード専用: 復習セッション開始。期限到来語だけを出題する。
// 既存のクイズUI(renderQuiz/answerQuiz/finishQuiz)をquiz.kind:'srs'として流用する。
function startSrsReview() {
  const dueIds = new Set(getDueSrsWords().map(term => term.id));
  if (!dueIds.size) return;
  const questions = shuffle(getUnifiedTestItems().filter(item => item.type === 'word' && dueIds.has(item.id)));
  termState.quiz = {
    kind: 'srs',
    setNumber: null,
    questions,
    index: 0,
    correct: 0,
    answers: [],
    answered: false,
  };
  document.getElementById('quizResult').classList.add('hidden');
  renderQuiz();
}

function normalizeAnswerKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

// 誤答候補を最大3件選ぶ。
// 1) 正解と同じanswer（ベトナム語の意味）を持つ候補は除外する（「正解が2つ見える」事故の防止）。
// 2) word問題は正解と同じcategoryの候補を優先し、足りない分だけ全プールから補充する（食材の問題にポジション名が混ざる等を防ぐ）。
// 3) 選ばれる候補同士でもanswerが重複しないようにする。
// 候補が3件に満たない場合はそのまま少ない件数を返す（呼び出し側は3択以下でも壊れない前提）。
function pickQuizDistractors(question, pool) {
  const correctKey = normalizeAnswerKey(question.answer);
  const sameType = pool.filter(item => item.type === question.type
    && item.id !== question.id
    && normalizeAnswerKey(item.answer) !== correctKey);

  const usedAnswers = new Set([correctKey]);
  const picked = [];

  const takeFrom = candidates => {
    if (picked.length >= 3) return;
    for (const item of shuffle(candidates)) {
      if (picked.length >= 3) break;
      const key = normalizeAnswerKey(item.answer);
      if (usedAnswers.has(key)) continue;
      usedAnswers.add(key);
      picked.push(item);
    }
  };

  if (question.type === 'word' && question.source?.category) {
    const sameCategory = sameType.filter(item => item.source?.category === question.source.category);
    takeFrom(sameCategory);
  }
  if (picked.length < 3) takeFrom(sameType);

  return picked;
}

function renderQuiz() {
  const quiz = termState.quiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishQuiz();
    return;
  }
  const question = quiz.questions[quiz.index];
  const options = shuffle([question, ...pickQuizDistractors(question, getUnifiedTestItems())]);
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
  if (question.type === 'word' && quiz.kind !== 'final') {
    // quiz.kind==='srs' はstartSrsReview()経由でのみ発生し、それ自体がlearningMode==='srs'の時にしか呼ばれない。
    if (quiz.kind === 'srs') updateSrsQuizProgress(question.id, ok);
    else updateQuizProgress(question.id, ok);
  }
  document.querySelectorAll('.quiz-option').forEach(button => {
    button.disabled = true;
    if (button.dataset.id === question.id) button.classList.add('correct');
    if (button.dataset.id === selectedId && !ok) button.classList.add('wrong');
  });
  const feedbackText = ok ? '正解です / Đúng rồi' : `正解 / Đáp án: ${question.answer}`;
  let feedbackHtml = esc(feedbackText);
  // SRS復習の答え合わせ直後のみ、その語の解説(noteJa/noteVi)を小さく添える。総合テスト・キンレイ小テストでは出さない。
  if (quiz.kind === 'srs' && question.type === 'word') {
    const note = question.source || {};
    if (note.noteJa || note.noteVi) {
      const noteLines = [note.noteJa, note.noteVi].filter(Boolean).map(esc).join('<br>');
      feedbackHtml += `<div class="term-note" style="margin-top:8px;font-weight:normal">${noteLines}</div>`;
    }
  }
  document.getElementById('quizFeedback').innerHTML = feedbackHtml;
  document.getElementById('nextQuizBtn').disabled = false;
  renderStats();
  renderList();
}

async function finishQuiz() {
  const quiz = termState.quiz;
  if (!quiz) return;
  const isFinal = quiz.kind === 'final';
  // quiz.kind==='srs' はSRSモードの復習セッションでのみ発生する（startSrsReview()参照）。
  const isSrsReview = quiz.kind === 'srs';
  const rate = quiz.questions.length ? Math.round((quiz.correct / quiz.questions.length) * 100) : 0;
  document.getElementById('quizPrompt').textContent = isFinal
    ? '総合修了テスト完了 / Hoàn thành'
    : isSrsReview
      ? '復習完了 / Đã ôn xong'
      : 'テスト完了 / Hoàn thành';
  document.getElementById('quizOptions').innerHTML = '';
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizQuestionImg').style.display = 'none';
  document.getElementById('nextQuizBtn').disabled = true;
  document.getElementById('quizResult').classList.remove('hidden');
  document.getElementById('quizResult').innerHTML = isFinal
    ? `<strong>総合修了テスト 完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>修了テストの結果を保存しました。<br>Đã lưu kết quả kiểm tra hoàn thành.</p>`
    : isSrsReview
      ? `<strong>復習完了：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>お疲れさまでした。<br>Bạn đã hoàn thành buổi ôn tập.</p>`
      : rate === 100
        ? `<strong>第${quiz.setNumber}回 100%：${quiz.correct} / ${quiz.questions.length}問 正解</strong><p>次の回が開きました。<br>Đã mở bài tiếp theo.</p>`
        : `<strong>第${quiz.setNumber}回：${quiz.correct} / ${quiz.questions.length}問 正解 (${rate}%)</strong><p>全問正解すると次の回が開きます。もう一度この回を受けてください。<br>Cần đúng 100% để mở bài tiếp theo.</p>`;
  if (!isFinal && !isSrsReview && rate === 100) {
    saveCompletedTestSet(quiz.setNumber);
    const sets = getQuizSets();
    if (termState.quizSetIndex < sets.length - 1) termState.quizSetIndex += 1;
  }
  if (isSrsReview) renderSrsReviewOverview(); else renderQuizOverview();

  // 復習セッション(srs)はquiz_resultsに行を作らない。進捗はterminology_progress側で既に保存済み。
  if (isSrsReview) return;
  if (!termState.profile?.id) return;
  const ok = await writeWithRetry(() => supabase.from('terminology_quiz_results').insert({
    trainee_id: termState.profile.id,
    set_id: isFinal ? FINAL_QUIZ_SET_ID : `${APP_CONFIG.quizSetPrefix}-${String(quiz.setNumber).padStart(2, '0')}`,
    total_questions: quiz.questions.length,
    correct_count: quiz.correct,
    score_rate: rate,
    answers_json: quiz.answers,
  }));
  if (!ok) {
    const resultEl = document.getElementById('quizResult');
    if (resultEl) resultEl.innerHTML += '<p style="color:#c62828">結果を保存できませんでした。先生に伝えてください。<br>Không lưu được kết quả. Hãy báo với giáo viên.</p>';
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
    if (item?.type === 'word') {
      if (APP_CONFIG.learningMode === 'srs') applySrsCardLearned(item.id);
      await saveProgress(item.id, 'learned');
    }
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
  document.getElementById('startQuizBtn').addEventListener('click', () => {
    if (APP_CONFIG.learningMode === 'srs') startSrsReview(); else startQuiz();
  });
  document.getElementById('startFinalQuizBtn').addEventListener('click', startFinalQuiz);
  document.getElementById('nextQuizBtn').addEventListener('click', () => {
    if (!termState.quiz) return;
    termState.quiz.index += 1;
    renderQuiz();
  });
}

(async function init() {
  if (APP_CONFIG.learningMode === 'srs') {
    // SRSモード: 「テスト」タブを「復習」タブの表記に変更する。
    const testTabBtn = document.getElementById('testModeBtn');
    if (testTabBtn) testTabBtn.innerHTML = 'Ôn tập<br>ふくしゅう';
  }
  const auth = await checkTerminologyAuth();
  if (!auth) return;
  termState.profile = auth.profile;
  document.getElementById('student-bar').style.display = 'flex';
  document.getElementById('student-name').textContent = auth.profile.name_katakana || auth.profile.name_romaji || '';
  document.getElementById('student-id-display').textContent = `（${auth.profile.student_id || ''}）`;
  termState.terms = window[APP_CONFIG.vocabGlobal]?.terms || [];
  termState.progress = loadLocalProgress();
  termState.imageProgress = loadImageProgress();
  await logStudySession();
  await loadStudyTime();
  setupStudyTimeTracking();
  await loadSupabaseProgress();
  await loadSupabaseImageProgress();
  await loadSupabaseQuizHistory();
  await loadFinalTestUnlock();
  setupEvents();
  applyFilters();
  renderStats();
})();
