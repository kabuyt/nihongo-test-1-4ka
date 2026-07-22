// 数学検定5級 第1回 1次（計算技能検定）全30問。入力式（4択廃止）。
// 受験者はベトナム人技能実習生のため設問文はベトナム語。数式は言語非依存でそのまま表示。
// 入力タイプ:
//   number   … 数字1つ。answer は文字列。prefix/suffix で "y = □ x" のような装飾。
//   fraction … □/□（分子・分母の2枠）。answer {n, d}。約分違い(13/15 と 39/45)も自動で正解。
//   ratio    … □ : □。answer {a, b}。比が等しければ正解(7:4 と 14:8)。
//   expr     … □x + □（一次式の係数・定数の2枠）。answer {coef, cons}。
//   select   … プルダウン。options と answer(値)。図形2問のみ。
// 注意: (28) は原本の解答冊子が y=-9x と誤植。x=-6・y=-54 → k=-54/-6=9 なので正解は y=9x。
const QUESTIONS = [
  // 1. 計算
  { id: 1, sectionTitle: '1. Hãy làm các phép tính sau', math: '0.28 × 6.8', type: 'number', answer: '1.904' },
  { id: 2, math: '9.01 ÷ 5.3', type: 'number', answer: '1.7' },
  { id: 3, math: '2/3 + 1/5', type: 'fraction', answer: { n: 13, d: 15 } },
  { id: 4, math: '5/6 − 1/12', type: 'fraction', answer: { n: 3, d: 4 } },
  { id: 5, math: '3 3/20 × 2/15', type: 'fraction', answer: { n: 21, d: 50 } },
  { id: 6, math: '7/12 ÷ 1 5/9', type: 'fraction', answer: { n: 3, d: 8 } },
  { id: 7, math: '7/10 × 1 1/14 ÷ 27/32', type: 'fraction', answer: { n: 8, d: 9 } },
  { id: 8, math: '84 × ( 7/12 − 10/21 )', type: 'number', answer: '9' },
  { id: 9, math: '9 − (−3) − 18', type: 'number', answer: '-6' },
  { id: 10, math: '(−3)² + (−4)³', type: 'number', answer: '-55' },
  { id: 11, math: '−8x + 2 − (−3x + 1)', type: 'expr', answer: { coef: -5, cons: 1 } },
  { id: 12, math: '0.7(6x − 1) + 1.4(8x − 2)', type: 'expr', answer: { coef: 15.4, cons: -3.5 } },

  // 2. 最大公約数
  { id: 13, sectionTitle: '2. Hãy tìm ước chung lớn nhất của các số trong ngoặc', math: '( 16, 36 )', type: 'number', answer: '4' },
  { id: 14, math: '( 54, 108, 126 )', type: 'number', answer: '18' },

  // 3. 最小公倍数
  { id: 15, sectionTitle: '3. Hãy tìm bội số chung nhỏ nhất của các số trong ngoặc', math: '( 14, 49 )', type: 'number', answer: '98' },
  { id: 16, math: '( 3, 15, 21 )', type: 'number', answer: '105' },

  // 4. 最も簡単な整数の比
  { id: 17, sectionTitle: '4. Hãy chuyển các tỉ số sau sang tỉ số nguyên đơn giản nhất', math: '63 : 36', type: 'ratio', answer: { a: 7, b: 4 } },
  { id: 18, math: '3/8 : 7/12', type: 'ratio', answer: { a: 9, b: 14 } },

  // 5. □にあてはまる数
  { id: 19, sectionTitle: '5. Hãy điền số thích hợp vào ô vuông trong phép tính sau', math: '3 : 4 = 12 : □', type: 'number', answer: '16' },
  { id: 20, math: '0.8 : 3.6 = 26 : □', type: 'number', answer: '117' },

  // 6. 方程式
  { id: 21, sectionTitle: '6. Hãy giải phương trình sau đây', math: '9x − 7 = 7x − 15', type: 'number', prefix: 'x =', answer: '-4' },
  { id: 22, math: '(2x − 3)/5 = (9x + 5)/4', type: 'number', prefix: 'x =', answer: '-1' },

  // 7. 各問
  { id: 23, sectionTitle: '7. Hãy trả lời các câu hỏi sau đây',
    prompt: 'Các điểm số phía dưới là điểm bài kiểm tra của bạn Aoi. Điểm trung bình là bao nhiêu?', math: '10, 8, 8, 10, 9',
    type: 'number', suffix: 'điểm', answer: '9' },
  { id: 24, prompt: 'Hình lăng trụ ngũ giác sau có bao nhiêu mặt?', image: 'assets/q24_prism.png',
    type: 'number', suffix: 'mặt', answer: '7' },
  { id: 25, prompt: 'Trong hình dưới, đường thẳng AB là trục đối xứng của 1 phần hình vẽ. Hãy chọn vị trí (ア〜エ) để tạo thành 1 hình đối xứng trục.', image: 'assets/q25_symmetry.png',
    type: 'select', options: ['ア', 'イ', 'ウ', 'エ'], answer: 'ア' },
  { id: 26, prompt: 'Tìm Mốt (giá trị xuất hiện nhiều nhất) của dữ liệu dưới đây.', math: '2, 4, 4, 4, 5, 8, 8, 9',
    type: 'number', answer: '4' },
  { id: 27, prompt: 'Hãy tìm giá trị của biểu thức sau khi x = −7.', math: '3x − 5', type: 'number', answer: '-26' },
  { id: 28, prompt: 'y tỷ lệ thuận với x. Khi x = −6 thì y = −54. Hãy lập công thức của y theo x.',
    type: 'number', prefix: 'y =', suffix: 'x', answer: '9' },
  { id: 29, prompt: 'y tỷ lệ nghịch với x. Khi x = −6 thì y = 3. Hãy tìm y khi x = 2.',
    type: 'number', prefix: 'y =', answer: '-9' },
  { id: 30, prompt: 'Tam giác ABC có đoạn thẳng AH là đường cao ứng với cạnh đáy BC. Hãy chọn cách viết đúng thể hiện AH vuông góc với BC (ký hiệu ⊥).', image: 'assets/q30_triangle.png',
    type: 'select', options: ['AB ⊥ AC', 'BC ⊥ AH', 'AB ⊥ BC', 'AC ⊥ BC'], answer: 'BC ⊥ AH' },
];

// ---- 採点ロジック（app.js から利用） ----
// 全角数字・記号を半角化し空白除去
function mtNormNum(v) {
  return String(v == null ? '' : v)
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[．。]/g, '.')
    .replace(/[－ー―‐]/g, '-')
    .replace(/\s+/g, '');
}
function mtToNumber(v) {
  const s = mtNormNum(v);
  if (s === '' || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
// 回答が空でないか
function mtIsAnswered(q, ans) {
  ans = ans || {};
  if (q.type === 'fraction') return mtToNumber(ans.n) != null && mtToNumber(ans.d) != null;
  if (q.type === 'ratio') return mtToNumber(ans.a) != null && mtToNumber(ans.b) != null;
  if (q.type === 'expr') return mtToNumber(ans.coef) != null && mtToNumber(ans.cons) != null;
  if (q.type === 'select') return !!ans.value;
  return mtToNumber(ans.value) != null;
}
// 正誤判定
function mtIsCorrect(q, ans) {
  ans = ans || {};
  if (!mtIsAnswered(q, ans)) return false;
  if (q.type === 'number') return mtToNumber(ans.value) === Number(q.answer);
  if (q.type === 'fraction') {
    const n = mtToNumber(ans.n), d = mtToNumber(ans.d);
    if (d === 0) return false;
    return n * q.answer.d === d * q.answer.n; // 交差乗算（約分違いも許容）
  }
  if (q.type === 'ratio') {
    const a = mtToNumber(ans.a), b = mtToNumber(ans.b);
    if (b === 0) return false;
    return a * q.answer.b === b * q.answer.a && a * q.answer.a >= 0; // 比が等しく符号の向きも一致
  }
  if (q.type === 'expr') {
    return mtToNumber(ans.coef) === q.answer.coef && mtToNumber(ans.cons) === q.answer.cons;
  }
  if (q.type === 'select') return ans.value === q.answer;
  return false;
}
