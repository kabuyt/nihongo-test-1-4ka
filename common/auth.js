// ===== 学生認証ヘルパー =====

let _studentProfile = null;

/**
 * 学生ログイン
 * @param {string} studentId - 学生ID（例: VJC001）
 * @param {string} birthDate - 生年月日（YYYY-MM-DD形式）
 * @returns {boolean} 成功/失敗
 */
async function studentLogin(studentId, birthDate) {
  const email = studentId.toLowerCase() + '@student.trainee.local';
  const password = birthDate.replace(/-/g, ''); // YYYYMMDD

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error('Login error:', error.message);
    return false;
  }
  return true;
}

/**
 * セッション確認。未認証ならlogin.htmlへリダイレクト。
 * @returns {{ session, profile }} trainee情報を含む
 */
async function checkStudentAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  if (!_studentProfile || _studentProfile.auth_user_id !== session.user.id) {
    const { data, error } = await supabase
      .from('trainees')
      .select('id, student_id, name_katakana, name_romaji, company, class_group, organization_id, auth_user_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (error || !data) {
      console.error('学生プロファイル取得エラー:', error);
      await supabase.auth.signOut();
      window.location.href = 'login.html';
      return null;
    }
    _studentProfile = data;
  }

  return { session, profile: _studentProfile };
}

/**
 * 現在の学生プロファイルを返す
 */
function getStudentProfile() {
  return _studentProfile;
}

/**
 * ログアウト
 */
async function studentLogout() {
  _studentProfile = null;
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

/**
 * テストアクセス権を確認
 * @param {string} testId - 'test1' etc.
 * @returns {object|null} access情報、またはnull（アクセス不可）
 */
async function checkTestAccess(testId) {
  if (!_studentProfile) return null;

  const { data, error } = await supabase
    .from('test_access')
    .select('id, test_id, is_retake, granted_at')
    .eq('trainee_id', _studentProfile.id)
    .eq('test_id', testId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * テスト一覧を取得（RPC経由）
 * @returns {Array} テスト一覧（アクセス状況・提出状況付き）
 */
async function getStudentTestList() {
  const { data, error } = await supabase.rpc('get_student_test_list');
  if (error) {
    console.error('テスト一覧取得エラー:', error);
    return [];
  }
  return data || [];
}

/**
 * テスト問題を取得（RPC経由、answer_keyは含まれない）
 * @param {string} testId
 * @param {string} section - 'goii', 'bunpo', 'chokkai'
 * @returns {Array|null} 問題データJSON
 */
async function getTestQuestions(testId, section) {
  const { data, error } = await supabase.rpc('get_test_questions', {
    p_test_id: testId,
    p_section: section
  });
  if (error) {
    console.error('問題取得エラー:', error);
    return null;
  }
  return data;
}
