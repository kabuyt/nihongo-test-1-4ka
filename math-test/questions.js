// 数学検定5級 第1回 1次（計算技能検定）全30問。
// 受験者はベトナム人技能実習生のため設問文はベトナム語。数式は言語非依存でそのまま表示。
// すべて4択。answer は options 内の正解の 0 始まりインデックス。
// 注意: (28) は原本の解答冊子が y=-9x と誤植。x=-6・y=-54 → k=-54/-6=9 なので正解は y=9x。
const QUESTIONS = [
  // 1. 計算
  { id: 1, sectionTitle: '1. Hãy làm các phép tính sau', math: '0.28 × 6.8',
    options: ['1.904', '19.04', '0.1904', '190.4'], answer: 0 },
  { id: 2, math: '9.01 ÷ 5.3',
    options: ['0.17', '1.7', '17', '1.07'], answer: 1 },
  { id: 3, math: '2/3 + 1/5',
    options: ['3/8', '11/15', '13/15', '3/15'], answer: 2 },
  { id: 4, math: '5/6 − 1/12',
    options: ['2/3', '3/4', '1/2', '4/6'], answer: 1 },
  { id: 5, math: '3 3/20 × 2/15',
    options: ['21/50', '3/50', '9/100', '7/50'], answer: 0 },
  { id: 6, math: '7/12 ÷ 1 5/9',
    options: ['5/8', '8/3', '3/8', '9/8'], answer: 2 },
  { id: 7, math: '7/10 × 1 1/14 ÷ 27/32',
    options: ['9/8', '7/9', '8/9', '4/9'], answer: 2 },
  { id: 8, math: '84 × ( 7/12 − 10/21 )',
    options: ['9', '12', '7', '6'], answer: 0 },
  { id: 9, math: '9 − (−3) − 18',
    options: ['−12', '−6', '0', '−24'], answer: 1 },
  { id: 10, math: '(−3)² + (−4)³',
    options: ['73', '−73', '−55', '55'], answer: 2 },
  { id: 11, math: '−8x + 2 − (−3x + 1)',
    options: ['−11x + 1', '−5x + 1', '−5x + 3', '−5x − 1'], answer: 1 },
  { id: 12, math: '0.7(6x − 1) + 1.4(8x − 2)',
    options: ['15.4x + 3.5', '4.2x − 3.5', '15.4x − 3.5', '15.4x − 2.1'], answer: 2 },

  // 2. 最大公約数
  { id: 13, sectionTitle: '2. Hãy tìm ước chung lớn nhất của các số trong ngoặc', math: '( 16, 36 )',
    options: ['2', '4', '8', '12'], answer: 1 },
  { id: 14, math: '( 54, 108, 126 )',
    options: ['9', '18', '27', '6'], answer: 1 },

  // 3. 最小公倍数
  { id: 15, sectionTitle: '3. Hãy tìm bội số chung nhỏ nhất của các số trong ngoặc', math: '( 14, 49 )',
    options: ['686', '7', '98', '196'], answer: 2 },
  { id: 16, math: '( 3, 15, 21 )',
    options: ['21', '45', '315', '105'], answer: 3 },

  // 4. 最も簡単な整数の比
  { id: 17, sectionTitle: '4. Hãy chuyển các tỉ số sau sang tỉ số nguyên đơn giản nhất', math: '63 : 36',
    options: ['7 : 4', '9 : 4', '7 : 6', '21 : 12'], answer: 0 },
  { id: 18, math: '3/8 : 7/12',
    options: ['14 : 9', '3 : 7', '9 : 14', '8 : 12'], answer: 2 },

  // 5. □にあてはまる数
  { id: 19, sectionTitle: '5. Hãy điền số thích hợp vào ô vuông trong phép tính sau', math: '3 : 4 = 12 : □',
    options: ['9', '16', '13', '48'], answer: 1 },
  { id: 20, math: '0.8 : 3.6 = 26 : □',
    options: ['58.5', '117', '5.78', '130'], answer: 1 },

  // 6. 方程式
  { id: 21, sectionTitle: '6. Hãy giải phương trình sau đây', math: '9x − 7 = 7x − 15',
    options: ['x = −11', 'x = 4', 'x = −4', 'x = −1'], answer: 2 },
  { id: 22, math: '(2x − 3)/5 = (9x + 5)/4',
    options: ['x = 1', 'x = −1', 'x = −2', 'x = 0'], answer: 1 },

  // 7. 各問
  { id: 23, sectionTitle: '7. Hãy trả lời các câu hỏi sau đây',
    prompt: 'Các điểm số phía dưới là điểm bài kiểm tra của bạn Aoi. Điểm trung bình là bao nhiêu?', math: '10, 8, 8, 10, 9',
    options: ['8', '9', '9.5', '45'], answer: 1 },
  { id: 24, prompt: 'Hình lăng trụ ngũ giác sau có bao nhiêu mặt?', image: 'assets/q24_prism.png',
    options: ['5', '6', '7', '10'], answer: 2 },
  { id: 25, prompt: 'Trong hình dưới, đường thẳng AB là trục đối xứng của 1 phần hình vẽ. Hãy chọn vị trí (ア〜エ) để tạo thành 1 hình đối xứng trục.', image: 'assets/q25_symmetry.png',
    options: ['ア', 'イ', 'ウ', 'エ'], answer: 0 },
  { id: 26, prompt: 'Tìm Mốt (giá trị xuất hiện nhiều nhất) của dữ liệu dưới đây.', math: '2, 4, 4, 4, 5, 8, 8, 9',
    options: ['8', '4', '5', '4.5'], answer: 1 },
  { id: 27, prompt: 'Hãy tìm giá trị của biểu thức sau khi x = −7.', math: '3x − 5',
    options: ['−16', '−26', '16', '26'], answer: 1 },
  { id: 28, prompt: 'y tỷ lệ thuận với x. Khi x = −6 thì y = −54. Hãy lập công thức của y theo x.',
    options: ['y = −9x', 'y = 9x', 'y = x/9', 'y = 54x'], answer: 1 },
  { id: 29, prompt: 'y tỷ lệ nghịch với x. Khi x = −6 thì y = 3. Hãy tìm y khi x = 2.',
    options: ['y = 9', 'y = −9', 'y = −1', 'y = −18'], answer: 1 },
  { id: 30, prompt: 'Tam giác ABC có đoạn thẳng AH là đường cao ứng với cạnh đáy BC. Hãy chọn cách viết đúng thể hiện AH vuông góc với BC (ký hiệu ⊥).', image: 'assets/q30_triangle.png',
    options: ['AB ⊥ AC', 'BC ⊥ AH', 'AB ⊥ BC', 'AC ⊥ BC'], answer: 1 },
];
