const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

assert.match(
  css,
  /\.print-behavior-card\s*\{[^}]*break-inside:\s*avoid-page;[^}]*page-break-inside:\s*avoid;/s,
  '候補者カードをページ途中で分割しないこと'
);
assert.match(
  css,
  /\.print-behavior-card\s*\+\s*\.print-behavior-card\s*\{[^}]*break-before:\s*page;[^}]*page-break-before:\s*always;/s,
  '2人目以降の候補者の前で必ず改ページすること'
);
assert.match(
  css,
  /\.print-behavior-card\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,/s,
  '6設問を2列3段に配置して1ページへ収めること'
);
assert.match(
  css,
  /\.print-behavior-card h3\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
  '候補者見出しを2列全幅で表示すること'
);
assert.match(
  css,
  /\.print-behavior-card \.pb-options\s*\{[^}]*grid-auto-rows:\s*1fr;/s,
  '4つの選択肢の行高を均等にすること'
);
assert.match(
  css,
  /\.print-behavior-card \.pb-option\s*\{[^}]*height:\s*100%;[^}]*align-items:\s*center;/s,
  '選択肢の枠を均等な高さで中央揃えにすること'
);
assert.match(
  css,
  /\.print-behavior-card \.print-behavior-summary strong\s*\{[^}]*border-radius:\s*999px;[^}]*background:\s*#245da8;[^}]*color:\s*#fff;/s,
  '一言コメントのラベルを選択肢と異なる要約デザインにすること'
);
assert.match(
  css,
  /\.print-table tbody td:first-child\s*\{[^}]*position:\s*static;[^}]*box-shadow:\s*none;/s,
  '印刷時は順位列に画面用の追加シャドウ罫線を残さないこと'
);
assert.match(
  css,
  /\.print-behavior-card \.pb-analysis\s*\{[^}]*background:\s*#f6f3fb;[^}]*color:\s*#594a70;/s,
  '選択肢下の分析コメントを選択肢とは異なる注釈デザインにすること'
);
assert.match(
  css,
  /\.print-behavior-card \.pb-analysis::before\s*\{[^}]*content:\s*"判断ポイント";[^}]*background:\s*#8064a2;/s,
  '分析コメントに判断ポイントのラベルを表示すること'
);
assert.match(
  css,
  /\.print-behavior-card \.pb-option\s*\{[^}]*color:\s*#26364a;[^}]*font-weight:\s*600;/s,
  '未選択肢も印刷で読める濃い文字色と太さにすること'
);

console.log('behavior print pagination tests: ok');
