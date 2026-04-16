// ===== テストレンダラー: JSON問題データ → HTML =====
// 各問題タイプごとのレンダリング関数を持つ

(function() {
'use strict';

const R = window.TestRenderer = {};

// テストIDに基づくアセットベースパス
let _basePath = '';
R.setBasePath = function(testId) {
  _basePath = 'static/' + testId + '/';
};

// アセットパスを解決
function asset(src) {
  if (!src) return '';
  return _basePath + src;
}

// select要素を生成
function makeSelect(fieldId, options, style) {
  const sel = document.createElement('select');
  sel.id = fieldId;
  if (style) sel.style.cssText = style;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  sel.appendChild(blank);
  options.forEach(opt => {
    const o = document.createElement('option');
    if (typeof opt === 'object') {
      o.value = opt.value;
      o.textContent = opt.label;
    } else {
      o.value = opt;
      o.textContent = opt;
    }
    sel.appendChild(o);
  });
  return sel;
}

// ===== 問題タイプ別レンダラー =====

// image_select: 画像グリッド + ドロップダウン
R.render_image_select = function(q, container) {
  const block = createQBlock(q.title_html);
  // 画像行
  const imgRow = document.createElement('div');
  imgRow.className = 'img-row';
  q.images.forEach(img => {
    const item = document.createElement('div');
    item.className = 'img-item';
    item.innerHTML = `<img src="${asset(img.src)}"><label>${img.label}</label>`;
    imgRow.appendChild(item);
  });
  block.appendChild(imgRow);
  // 回答行
  const ansRow = document.createElement('div');
  ansRow.className = 'answer-row';
  q.items.forEach(item => {
    const box = document.createElement('div');
    box.className = 'answer-box';
    box.innerHTML = `<span>${item.label}</span>`;
    box.appendChild(makeSelect(item.field_id, item.options));
    ansRow.appendChild(box);
  });
  block.appendChild(ansRow);
  container.appendChild(block);
};

// image_select_grid: 画像テーブル + ドロップダウン
R.render_image_select_grid = function(q, container) {
  const block = createQBlock(q.title_html);
  const table = document.createElement('table');
  table.className = 'qa-table';
  table.style.width = '100%';
  q.rows.forEach(row => {
    // 画像行
    const imgTr = document.createElement('tr');
    row.images.forEach(img => {
      const td = document.createElement('td');
      td.style.cssText = 'text-align:center;width:25%';
      td.innerHTML = `<img src="${asset(img.src)}" style="max-height:60px;max-width:100%">`;
      imgTr.appendChild(td);
    });
    table.appendChild(imgTr);
    // 選択行
    const selTr = document.createElement('tr');
    row.items.forEach((item, idx) => {
      const td = document.createElement('td');
      td.textContent = item.label;
      let opts = item.options;
      // dynamic_options の場合: correct_pool + extra_pool から選択肢を生成
      if (!opts && q.dynamic_options && q.correct_pool) {
        const correct = q.correct_pool[row.items.indexOf(item) + (q.rows.indexOf(row) * row.items.length)];
        const others = [...q.correct_pool.filter(x => x !== correct), ...(q.extra_pool || [])];
        const n = q.distractors_per_item || 3;
        const shuffled = others.sort(() => Math.random() - 0.5).slice(0, n);
        opts = [correct, ...shuffled].sort(() => Math.random() - 0.5);
      }
      td.appendChild(makeSelect(item.field_id, opts || [], 'width:100%;font-size:11px'));
      selTr.appendChild(td);
    });
    table.appendChild(selTr);
  });
  block.appendChild(table);
  container.appendChild(block);
};

// tile_sort_buckets: カテゴリ分類
R.render_tile_sort_buckets = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.style.cssText = 'font-size:12px;color:#888;margin-bottom:10px';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  // タイルプール
  const pool = document.createElement('div');
  pool.className = 'g3-pool';
  pool.id = 'g3-pool';
  q.tiles.forEach(tile => {
    const t = document.createElement('div');
    t.className = 'g3-tile';
    t.dataset.key = tile.key;
    t.textContent = tile.label;
    t.onclick = function(e) { g3TileClick(e, this); };
    pool.appendChild(t);
  });
  block.appendChild(pool);
  // バケット
  const bucketsDiv = document.createElement('div');
  bucketsDiv.className = 'g3-buckets';
  q.buckets.forEach(b => {
    const bucket = document.createElement('div');
    bucket.className = 'g3-bucket';
    const bucketId = 'g3-b-' + b.id.replace('g3_', '');
    bucket.onclick = function() { g3BucketClick(bucketId); };
    bucket.innerHTML = `<div class="g3-bucket-label">${b.label}</div><div class="g3-bucket-drop" id="${bucketId}"></div>`;
    bucketsDiv.appendChild(bucket);
  });
  if (q.none_bucket) {
    const nb = document.createElement('div');
    nb.className = 'g3-bucket g3-bucket-none';
    nb.onclick = function() { g3BucketClick('g3-b-none'); };
    nb.innerHTML = `<div class="g3-bucket-label">${q.none_bucket.label}</div><div class="g3-bucket-drop" id="g3-b-none"></div>`;
    bucketsDiv.appendChild(nb);
  }
  block.appendChild(bucketsDiv);
  // リセットボタン
  const resetDiv = document.createElement('div');
  resetDiv.style.cssText = 'text-align:right;margin-top:6px';
  resetDiv.innerHTML = '<button type="button" onclick="g3Reset()" style="font-size:12px;padding:4px 12px;border-radius:4px;border:1px solid #bbb;background:#fff;cursor:pointer;color:#555">↺ Đặt lại</button>';
  block.appendChild(resetDiv);
  // Hidden fields
  q.buckets.forEach(b => {
    const h = document.createElement('input');
    h.type = 'hidden';
    h.id = b.id;
    block.appendChild(h);
  });
  container.appendChild(block);
};

// table_fill: 表の穴埋め
R.render_table_fill = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const note = document.createElement('div');
    note.className = 'q-instruction';
    note.textContent = q.instruction;
    block.appendChild(note);
  }
  q.tables.forEach((tbl, ti) => {
    const table = document.createElement('table');
    table.className = 'qa-table';
    table.style.width = '100%';
    if (ti > 0) table.style.marginTop = '10px';
    if (tbl.headers) {
      const headTr = document.createElement('tr');
      tbl.headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        headTr.appendChild(th);
      });
      table.appendChild(headTr);
    }
    // 行構造: items が col を持つ場合は1行に配置、label を持つ場合は行ごとに配置
    const hasCol = tbl.items.some(item => item.col !== undefined);
    if (hasCol) {
      const bodyTr = document.createElement('tr');
      tbl.items.forEach(item => {
        const td = document.createElement('td');
        if (item.field_id === null) {
          td.className = 'already';
          td.style.cssText = 'text-align:center;font-size:11px';
          td.textContent = item.fixed_value;
        } else if (item.input_type === 'text') {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.id = item.field_id;
          inp.style.cssText = 'width:100%;font-size:11px;padding:4px 2px';
          td.appendChild(inp);
        } else {
          td.appendChild(makeSelect(item.field_id, item.options || [], 'width:100%;font-size:11px;padding:4px 2px'));
        }
        bodyTr.appendChild(td);
      });
      table.appendChild(bodyTr);
    } else {
      // label + input per row
      tbl.items.forEach(item => {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td');
        tdLabel.textContent = item.label || '';
        tdLabel.style.cssText = 'font-size:13px;padding:6px 8px;white-space:nowrap';
        tr.appendChild(tdLabel);
        const tdInput = document.createElement('td');
        if (item.input_type === 'text') {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.id = item.field_id;
          inp.style.cssText = 'width:100%;font-size:13px;padding:4px 6px;border:1px solid #ccc;border-radius:4px';
          tdInput.appendChild(inp);
        } else {
          tdInput.appendChild(makeSelect(item.field_id, item.options || [], 'width:100%;font-size:13px'));
        }
        tr.appendChild(tdInput);
        table.appendChild(tr);
      });
    }
    block.appendChild(table);
  });
  container.appendChild(block);
};

// select_dynamic_pool: プール+妨害選択肢の動的生成
R.render_select_dynamic_pool = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  const tableScroll = document.createElement('div');
  tableScroll.className = 'table-scroll';
  const table = document.createElement('table');
  table.className = 'qa-table';
  table.style.width = '100%';
  // ヘッダー
  const headTr = document.createElement('tr');
  headTr.innerHTML = '<th colspan="2">Nhật→Việt</th><th colspan="2">Nhật→Việt</th>';
  table.appendChild(headTr);
  // 正解とプール
  const primaryAnswers = q.pool_correct.map(a => a.split('／')[0].trim());
  const extraPool = (q.pool_extra || []).map(a => a.split('／')[0].trim());
  // 行を構築（2列配置）
  for (let i = 0; i < q.items.length; i += 2) {
    const tr = document.createElement('tr');
    for (let j = 0; j < 2 && (i + j) < q.items.length; j++) {
      const item = q.items[i + j];
      const idx = i + j;
      const correct = primaryAnswers[idx];
      const pool = [...primaryAnswers.filter((_, k) => k !== idx), ...extraPool];
      const distractors = pool.sort(() => Math.random() - 0.5).slice(0, q.distractors_per_item || 3);
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
      const tdLabel = document.createElement('td');
      tdLabel.style.whiteSpace = 'nowrap';
      tdLabel.textContent = item.label;
      tr.appendChild(tdLabel);
      const tdSel = document.createElement('td');
      tdSel.appendChild(makeSelect(item.field_id, options));
      tr.appendChild(tdSel);
    }
    table.appendChild(tr);
  }
  tableScroll.appendChild(table);
  block.appendChild(tableScroll);
  container.appendChild(block);
};

// fill_particle: 文中の助詞穴埋め
R.render_fill_particle = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  if (q.example_html) {
    const ex = document.createElement('div');
    ex.className = 'sentence';
    ex.innerHTML = 'Ví dụ）　' + q.example_html;
    block.appendChild(ex);
  }
  q.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'sentence';
    let html = item.sentence_html;
    item.fields.forEach(f => {
      const selectHtml = `<span class="fill-inline"><select id="${f.field_id}" class="sel-particle"><option value="">-</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select></span>`;
      html = html.replace('{' + f.field_id + '}', selectHtml);
    });
    div.innerHTML = html;
    block.appendChild(div);
  });
  container.appendChild(block);
};

// select_in_sentence: 文中の選択問題
R.render_select_in_sentence = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin:8px 0;line-height:3';
  q.items.forEach(item => {
    const p = document.createElement('p');
    p.className = 'sentence';
    let html = item.sentence_html;
    item.fields.forEach(f => {
      const selectHtml = `<span class="fill-inline"><select id="${f.field_id}" style="font-size:14px;padding:3px;border-radius:4px;border:1px solid #aaa"><option value="">Chọn</option>${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></span>`;
      html = html.replace('{' + f.field_id + '}', selectHtml);
    });
    p.innerHTML = html;
    wrap.appendChild(p);
  });
  block.appendChild(wrap);
  container.appendChild(block);
};

// word_puzzle: 語順並べ替え
R.render_word_puzzle = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  const puzzleContainer = document.createElement('div');
  puzzleContainer.id = 'bq3-puzzles';
  block.appendChild(puzzleContainer);
  q.puzzles.forEach(p => {
    const h = document.createElement('input');
    h.type = 'hidden';
    h.id = p.field_id;
    block.appendChild(h);
  });
  container.appendChild(block);
  // パズル初期化（DOMに追加された後に呼ぶ）
  setTimeout(() => {
    if (typeof initB3Puzzles === 'function') {
      window._b3Words = q.puzzles.map(p => p.words);
      initB3Puzzles();
    }
  }, 0);
};

// select_choice: 選択式問題
R.render_select_choice = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  if (q.example_html) {
    const ex = document.createElement('div');
    ex.className = 'sentence';
    ex.innerHTML = 'Ví dụ）' + q.example_html;
    block.appendChild(ex);
    const hr = document.createElement('hr');
    hr.className = 'thin';
    block.appendChild(hr);
  }
  q.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'sentence';
    div.textContent = item.prompt + ' ';
    div.appendChild(makeSelect(item.field_id, item.options));
    block.appendChild(div);
  });
  container.appendChild(block);
};

// reading_comprehension: 読解問題
R.render_reading_comprehension = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.passage_html) {
    const note = document.createElement('div');
    note.className = 'q-instruction';
    note.style.cssText = 'background:#fffde7;padding:10px;border-radius:4px;border-left:4px solid #f39c12';
    note.textContent = '※ Hãy đọc đoạn văn dưới đây rồi trả lời.';
    block.appendChild(note);
    const passage = document.createElement('div');
    passage.style.cssText = 'background:#f8f9fa;border:1px solid #ddd;border-radius:6px;padding:12px;margin:10px 0;font-size:14px;line-height:2.2';
    passage.innerHTML = q.passage_html;
    block.appendChild(passage);
  }
  const qDiv = document.createElement('div');
  qDiv.style.marginTop = '10px';
  q.items.forEach(item => {
    if (item.group_sentence && item.sub_items) {
      // グループ構造: 文 + サブ問題
      const gp = document.createElement('div');
      gp.style.cssText = 'margin-top:14px;padding:10px;background:#f8f9fa;border-radius:6px';
      const gs = document.createElement('p');
      gs.style.cssText = 'font-size:14px;font-weight:bold;color:#1a5276;margin-bottom:8px';
      gs.textContent = item.group_sentence;
      gp.appendChild(gs);
      item.sub_items.forEach(sub => {
        const sp = document.createElement('p');
        sp.style.cssText = 'font-size:13px;color:#555;margin-top:6px';
        sp.textContent = sub.question + ' ';
        if (sub.input_type === 'text') {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.id = sub.field_id;
          inp.style.cssText = 'font-size:13px;width:80px;padding:4px;border:1px solid #aaa;border-radius:4px';
          sp.appendChild(inp);
        } else {
          sp.appendChild(makeSelect(sub.field_id, sub.options || [], 'font-size:13px;padding:4px;border-radius:4px;border:1px solid #aaa'));
        }
        gp.appendChild(sp);
      });
      qDiv.appendChild(gp);
    } else {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:13px;color:#555;margin-top:12px';
      p.textContent = item.question;
      qDiv.appendChild(p);
      if (item.input_type === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.id = item.field_id;
        inp.style.cssText = 'font-size:13px;width:100%;padding:6px;border-radius:4px;border:1px solid #aaa';
        qDiv.appendChild(inp);
      } else {
        const sel = makeSelect(item.field_id, item.options || [], 'font-size:13px;width:100%;padding:6px;border-radius:4px;border:1px solid #aaa');
        qDiv.appendChild(sel);
      }
    }
  });
  block.appendChild(qDiv);
  container.appendChild(block);
};

// dialogue_fill: 会話穴埋め
R.render_dialogue_fill = function(q, container) {
  const block = createQBlock(q.title_html);
  q.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'sentence';
    if (q.items.indexOf(item) > 0) div.style.marginTop = '10px';
    let html = item.dialogue_html;
    item.fields.forEach(f => {
      const selectHtml = `<select id="${f.field_id}" style="font-size:13px;padding:4px;border-radius:4px;border:1px solid #aaa"><option value="">--</option>${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
      html = html.replace('{' + f.field_id + '}', selectHtml);
    });
    div.innerHTML = html;
    block.appendChild(div);
  });
  container.appendChild(block);
};

// radio_choice: 4択ラジオ
R.render_radio_choice = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.style.cssText = 'background:#fffde7;padding:10px;border-radius:4px;border-left:4px solid #f39c12';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  const wrap = document.createElement('div');
  wrap.style.marginTop = '12px';
  q.items.forEach(item => {
    const qDiv = document.createElement('div');
    qDiv.style.marginBottom = '18px';
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;font-weight:bold;margin-bottom:8px';
    p.textContent = item.question;
    qDiv.appendChild(p);
    const choicesDiv = document.createElement('div');
    choicesDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px';
    item.choices.forEach(c => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="${item.field_id}" value="${c.value}"> ${c.label}`;
      choicesDiv.appendChild(label);
    });
    qDiv.appendChild(choicesDiv);
    wrap.appendChild(qDiv);
  });
  block.appendChild(wrap);
  container.appendChild(block);
};

// audio_image_radio: 音声+画像選択
R.render_audio_image_radio = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.intro_audio) {
    const intro = document.createElement('div');
    intro.className = 'audio-q';
    intro.innerHTML = `<div class="qlabel">${q.intro_label || ''}</div><audio controls src="${asset(q.intro_audio)}"></audio>`;
    block.appendChild(intro);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '12px';
    aq.innerHTML = `<div class="qlabel">${item.label}</div><audio controls src="${asset(item.audio_src)}"></audio>`;
    const row = document.createElement('div');
    row.className = 'img-choice-row';
    item.choices.forEach(c => {
      const div = document.createElement('div');
      div.className = 'img-choice';
      div.innerHTML = `<img src="${asset(c.image_src)}"><p><label><input type="radio" name="${item.field_id}" value="${c.value}"> ${c.label}</label></p>`;
      row.appendChild(div);
    });
    aq.appendChild(row);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_select: 音声+ドロップダウン
R.render_audio_select = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  if (q.intro_audio) {
    const intro = document.createElement('div');
    intro.className = 'audio-q';
    intro.innerHTML = `<div class="qlabel">${q.intro_label || ''}</div><audio controls src="${asset(q.intro_audio)}"></audio>`;
    block.appendChild(intro);
  }
  // 共有画像
  if (q.image_src) {
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = 'margin:8px 0';
    imgDiv.innerHTML = `<img src="${asset(q.image_src)}" style="max-width:100%;max-height:220px;border:1px solid #ddd;border-radius:4px">`;
    block.appendChild(imgDiv);
  }
  // 共有音声ファイル群
  if (q.audio_files) {
    q.audio_files.forEach(af => {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = asset(af);
      audio.style.marginTop = '8px';
      block.appendChild(audio);
    });
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '8px';
    if (item.label) aq.innerHTML += `<div class="qlabel">${item.label}</div>`;
    if (item.audio_src) aq.innerHTML += `<audio controls src="${asset(item.audio_src)}"></audio>`;
    if (item.image_src) aq.innerHTML += `<div style="margin-top:8px"><img src="${asset(item.image_src)}" style="max-width:100%;border:1px solid #ddd;border-radius:4px"></div>`;
    if (item.question) aq.innerHTML += `<p style="font-size:13px;margin-top:8px">${item.question}</p>`;
    const ansBox = document.createElement('div');
    ansBox.className = 'answer-box';
    ansBox.style.marginTop = '6px';
    if (item.prefix) ansBox.textContent = item.prefix;
    ansBox.appendChild(makeSelect(item.field_id, item.options, ''));
    if (item.suffix) {
      const suf = document.createTextNode(item.suffix);
      ansBox.appendChild(suf);
    }
    aq.appendChild(ansBox);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_multi_select: 音声+複数ドロップダウン
R.render_audio_multi_select = function(q, container) {
  const block = createQBlock(q.title_html);
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '10px';
    aq.innerHTML = `<div class="qlabel">${item.label}</div><audio controls src="${asset(item.audio_src)}"></audio>`;
    if (item.image_src) aq.innerHTML += `<div style="margin-top:6px"><img src="${asset(item.image_src)}" style="max-width:100%;max-height:180px;border:1px solid #ddd;border-radius:4px"></div>`;
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-top:6px';
    item.fields.forEach(f => {
      p.textContent += f.prefix + ' ';
      p.appendChild(makeSelect(f.field_id, f.options));
      p.appendChild(document.createTextNode(' '));
    });
    aq.appendChild(p);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_price_country: 値段+国の問題
R.render_audio_price_country = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.intro_audio) {
    const intro = document.createElement('div');
    intro.className = 'audio-q';
    intro.innerHTML = `<div class="qlabel">${q.intro_label || ''}</div><audio controls src="${asset(q.intro_audio)}"></audio>`;
    if (q.intro_image) intro.innerHTML += `<div style="margin-top:8px"><img src="${asset(q.intro_image)}" style="max-width:100%;max-height:200px;border:1px solid #ddd;border-radius:4px"></div>`;
    block.appendChild(intro);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '10px';
    aq.innerHTML = `<div class="qlabel">${item.label}</div><audio controls src="${asset(item.audio_src)}"></audio>`;
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-top:6px';
    // 値段
    p.appendChild(document.createTextNode(item.price_field.prefix));
    p.appendChild(makeSelect(item.price_field.field_id, item.price_field.options));
    p.appendChild(document.createTextNode(item.price_field.suffix + ' '));
    // 国
    p.appendChild(document.createTextNode(item.country_field.prefix));
    p.appendChild(makeSelect(item.country_field.field_id, q.country_options));
    aq.appendChild(p);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_schedule: 時間+曜日の問題
R.render_audio_schedule = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.intro_audio) {
    const intro = document.createElement('div');
    intro.className = 'audio-q';
    intro.innerHTML = `<audio controls src="${asset(q.intro_audio)}"></audio>`;
    if (q.intro_image) intro.innerHTML += `<div style="margin-top:8px"><img src="${asset(q.intro_image)}" style="max-width:100%;border:1px solid #ddd;border-radius:4px"></div>`;
    block.appendChild(intro);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '10px';
    aq.innerHTML = `<div class="qlabel">${item.label}</div><audio controls src="${asset(item.audio_src)}"></audio>`;
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-top:6px';
    item.fields.forEach(f => {
      if (f.prefix) p.appendChild(document.createTextNode(f.prefix));
      const opts = f.use_day_options ? q.day_options : f.options;
      p.appendChild(makeSelect(f.field_id, opts));
      if (f.suffix) p.appendChild(document.createTextNode(f.suffix));
      p.appendChild(document.createTextNode(' '));
    });
    aq.appendChild(p);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_ox: ○×問題
R.render_audio_ox = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.innerHTML = `<audio controls src="${asset(item.audio_src)}"></audio>`;
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-top:4px';
    p.textContent = item.label + ' ';
    p.appendChild(makeSelect(item.field_id, item.options));
    aq.appendChild(p);
    block.appendChild(aq);
  });
  container.appendChild(block);
};

// audio_tanaka: 田中さんの一日
R.render_audio_tanaka = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.style.cssText = 'background:#fffde7;padding:10px;border-radius:4px;border-left:4px solid #f39c12';
    inst.textContent = q.instruction;
    block.appendChild(inst);
  }
  // イラスト
  if (q.illustration_src) {
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = 'text-align:center;margin:12px 0';
    imgDiv.innerHTML = `<div style="font-weight:bold;color:#1a5276;font-size:15px;margin-bottom:8px">${q.header_html || ''}</div><img src="${asset(q.illustration_src)}" style="max-width:100%;max-height:280px;object-fit:contain;border:2px solid #333;border-radius:8px">`;
    block.appendChild(imgDiv);
  }
  // 音声
  if (q.audio_src) {
    const audioDiv = document.createElement('div');
    audioDiv.style.cssText = 'margin:12px 0';
    audioDiv.innerHTML = `<audio controls src="${asset(q.audio_src)}" style="width:100%"></audio>`;
    block.appendChild(audioDiv);
  }
  // 問題
  q.items.forEach(item => {
    const qDiv = document.createElement('div');
    qDiv.style.cssText = 'margin:14px 0;padding:10px;background:#f8f9fa;border-radius:8px';
    qDiv.innerHTML = `<p style="font-size:13px;font-weight:bold;color:#1a5276;margin-bottom:6px">${item.question}</p>`;
    const ansBox = document.createElement('div');
    ansBox.className = 'answer-box';
    const opts = q.c12_option_sets ? q.c12_option_sets[item.field_id] : [];
    ansBox.appendChild(makeSelect(item.field_id, opts));
    qDiv.appendChild(ansBox);
    block.appendChild(qDiv);
  });
  container.appendChild(block);
};

// ===== ユーティリティ =====

function createQBlock(titleHtml) {
  const block = document.createElement('div');
  block.className = 'q-block';
  const title = document.createElement('div');
  title.className = 'q-title';
  title.innerHTML = titleHtml;
  block.appendChild(title);
  return block;
}

/**
 * セクション全体をレンダリング
 * @param {Array} questions - 問題JSONの配列
 * @param {HTMLElement} container - 出力先
 */
R.renderSection = function(questions, container) {
  if (!questions || !Array.isArray(questions)) return;
  questions.forEach(q => {
    const fn = R['render_' + q.type];
    if (fn) {
      try {
        fn(q, container);
      } catch (e) {
        console.error('Render error:', q.id, q.type, e);
        const div = document.createElement('div');
        div.className = 'q-block';
        div.innerHTML = `<div class="q-title">${q.title_html || q.id}</div><p style="color:red">レンダリングエラー: ${q.type} — ${e.message}</p>`;
        container.appendChild(div);
      }
    } else {
      console.warn('Unknown question type:', q.type);
      const div = document.createElement('div');
      div.className = 'q-block';
      div.innerHTML = `<div class="q-title">${q.title_html || q.id}</div><p style="color:red">未対応の問題タイプ: ${q.type}</p>`;
      container.appendChild(div);
    }
  });
};

})();
