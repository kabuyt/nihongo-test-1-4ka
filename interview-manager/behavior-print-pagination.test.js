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

console.log('behavior print pagination tests: ok');
