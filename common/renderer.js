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

// select要素を生成（options配列をシャッフルして正解が先頭に来ないように）
function makeSelect(fieldId, options, style) {
  const sel = document.createElement('select');
  sel.id = fieldId;
  if (style) sel.style.cssText = style;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  sel.appendChild(blank);
  // シャッフル（Fisher-Yates）
  const shuffled = (options || []).slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.forEach(opt => {
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
      td.innerHTML = item.label;
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
    inst.innerHTML = q.instruction;
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
    t.innerHTML = tile.label;
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
    note.innerHTML = q.instruction;
    block.appendChild(note);
  }
  if (q.example_html) {
    const ex = document.createElement('div');
    ex.className = 'sentence';
    ex.style.cssText = 'background:#eaf0fb;padding:8px 12px;border-radius:4px;border-left:4px solid #1a5276;margin:6px 0 10px;font-size:13px';
    ex.innerHTML = '例）' + q.example_html;
    block.appendChild(ex);
  }
  if (q.audio_src) {
    const a = document.createElement('div');
    a.style.cssText = 'margin:8px 0';
    a.innerHTML = `<audio controls src="${asset(q.audio_src)}" style="width:100%"></audio>`;
    block.appendChild(a);
  }
  // tablesがない場合: items + columns 構造をtablesに変換
  if (!q.tables && q.items) {
    q.tables = [{ headers: q.columns ? ['', ...q.columns] : null, items: q.items }];
    // items が fields を持つ → 各item = 1行（ラベル + 各fieldを列に）
    if (q.items[0] && q.items[0].fields) {
      const tbl = document.createElement('table');
      tbl.className = 'qa-table';
      tbl.style.width = '100%';
      if (q.columns) {
        const headTr = document.createElement('tr');
        const blank = document.createElement('th'); blank.textContent = ''; headTr.appendChild(blank);
        q.columns.forEach(c => {
          const th = document.createElement('th'); th.innerHTML = c; headTr.appendChild(th);
        });
        tbl.appendChild(headTr);
      }
      q.items.forEach(item => {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td');
        tdLabel.style.cssText = 'font-size:13px;padding:6px;text-align:center';
        tdLabel.innerHTML = item.label || '';
        tr.appendChild(tdLabel);
        item.fields.forEach(f => {
          const td = document.createElement('td');
          td.style.cssText = 'padding:4px;text-align:center';
          if (f.input_type === 'text') {
            const inp = document.createElement('input');
            inp.type='text'; inp.id=f.field_id;
            inp.style.cssText = 'width:100%;padding:4px;border:1px solid #aaa;border-radius:4px;font-size:13px';
            td.appendChild(inp);
          } else {
            td.appendChild(makeSelect(f.field_id, f.options || [], 'width:100%;font-size:13px'));
          }
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });
      block.appendChild(tbl);
      container.appendChild(block);
      return;
    }
  }
  if (!q.tables) { container.appendChild(block); return; }
  q.tables.forEach((tbl, ti) => {
    const table = document.createElement('table');
    table.className = 'qa-table';
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
    if (ti > 0) table.style.marginTop = '10px';
    // 各列を均等幅に
    const colCount = Math.max(
      (tbl.headers || []).length,
      ((tbl.items || []).reduce((m, it) => it.col !== undefined ? Math.max(m, it.col + 1) : m, 0))
    );
    if (colCount > 0) {
      const colgroup = document.createElement('colgroup');
      const w = (100 / colCount).toFixed(4) + '%';
      for (let i = 0; i < colCount; i++) {
        const c = document.createElement('col');
        c.style.width = w;
        colgroup.appendChild(c);
      }
      table.appendChild(colgroup);
    }
    if (tbl.headers) {
      const headTr = document.createElement('tr');
      tbl.headers.forEach(h => {
        const th = document.createElement('th');
        th.innerHTML = h;
        headTr.appendChild(th);
      });
      table.appendChild(headTr);
    }
    // 行構造判定: items が col を持ち、col が一意なら1行配置、それ以外は行ごとに配置
    const headerCount = (tbl.headers || []).length;
    const colSet = new Set(tbl.items.map(item => item.col).filter(c => c !== undefined));
    const hasColAll = tbl.items.every(item => item.col !== undefined);
    const isSingleRow = hasColAll && colSet.size === tbl.items.length;
    if (isSingleRow) {
      const bodyTr = document.createElement('tr');
      tbl.items.forEach(item => {
        const td = document.createElement('td');
        if (item.field_id === null) {
          td.className = 'already';
          td.style.cssText = 'text-align:center;font-size:12px';
          td.innerHTML = item.fixed_value;
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
        tdLabel.innerHTML = item.label || '';
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
    inst.innerHTML = q.instruction;
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
      tdLabel.innerHTML = item.label;
      tr.appendChild(tdLabel);
      const tdSel = document.createElement('td');
      const useText = q.input_type === 'text' || item.input_type === 'text';
      if (useText) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.id = item.field_id;
        inp.style.cssText = 'width:100%;font-size:13px;padding:5px 6px;border:1px solid #aaa;border-radius:4px';
        tdSel.appendChild(inp);
      } else {
        tdSel.appendChild(makeSelect(item.field_id, options));
      }
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
    inst.innerHTML = q.instruction;
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
    inst.innerHTML = q.instruction;
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
    inst.innerHTML = q.instruction;
    block.appendChild(inst);
  }
  q.puzzles.forEach((p, idx) => {
    const puzzleDiv = document.createElement('div');
    puzzleDiv.style.cssText = 'margin:16px 0;padding:12px;background:#f8f9fa;border-radius:8px';
    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:bold;color:#1a5276;margin-bottom:8px';
    title.innerHTML = `${idx + 1}）`;
    puzzleDiv.appendChild(title);

    // 回答表示エリア（選択済み）
    const answerArea = document.createElement('div');
    answerArea.style.cssText = 'min-height:44px;padding:8px;background:#fff;border:2px dashed #aaa;border-radius:6px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center';
    answerArea.dataset.placeholder = 'タップして順番に並べる →';
    puzzleDiv.appendChild(answerArea);

    // 未選択タイルエリア
    const tilesArea = document.createElement('div');
    tilesArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    puzzleDiv.appendChild(tilesArea);

    // 隠しフィールド（結果文字列）
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = p.field_id;
    puzzleDiv.appendChild(hidden);

    // 状態
    const state = { selected: [], remaining: p.words.slice() };

    function makeTile(word, inAnswer) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'puzzle-tile';
      tile.style.cssText = 'padding:6px 12px;border:1.5px solid #1a5276;background:' + (inAnswer ? '#1a5276' : '#fff') + ';color:' + (inAnswer ? '#fff' : '#1a5276') + ';border-radius:6px;cursor:pointer;font-size:14px;font-family:inherit';
      tile.innerHTML = word;
      tile.dataset.word = word;
      return tile;
    }

    function render() {
      answerArea.innerHTML = '';
      if (state.selected.length === 0) {
        const ph = document.createElement('span');
        ph.style.cssText = 'color:#aaa;font-size:12px';
        ph.textContent = answerArea.dataset.placeholder;
        answerArea.appendChild(ph);
      }
      state.selected.forEach((w, i) => {
        const t = makeTile(w, true);
        t.onclick = () => {
          // クリックで未選択側に戻す
          state.selected.splice(i, 1);
          state.remaining.push(w);
          render();
        };
        answerArea.appendChild(t);
      });
      tilesArea.innerHTML = '';
      state.remaining.forEach((w, i) => {
        const t = makeTile(w, false);
        t.onclick = () => {
          state.remaining.splice(i, 1);
          state.selected.push(w);
          render();
        };
        tilesArea.appendChild(t);
      });
      // 隠しフィールドを更新（rubyタグを除去したプレーン文字列）
      const plain = state.selected.map(w => w.replace(/<ruby>([^<]*)<rt>[^<]*<\/rt><\/ruby>/g, '$1')).join('');
      hidden.value = plain;
    }
    render();
    block.appendChild(puzzleDiv);
  });
  container.appendChild(block);
};

// select_choice: 選択式問題
R.render_select_choice = function(q, container) {
  const block = createQBlock(q.title_html);
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.innerHTML = q.instruction;
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
    if (item.sentence_html && item.fields) {
      // sentence_html with {field_id} placeholders + fields
      let html = item.sentence_html;
      item.fields.forEach(f => {
        let fieldHtml;
        if (f.input_type === 'text') {
          fieldHtml = `<input type="text" id="${f.field_id}" style="font-size:14px;padding:3px;border:1px solid #aaa;border-radius:4px;min-width:120px">`;
        } else {
          const opts = (f.options || []).map(o => {
            if (typeof o === 'object') return `<option value="${o.value}">${o.label}</option>`;
            return `<option value="${o}">${o}</option>`;
          }).join('');
          fieldHtml = `<select id="${f.field_id}" style="font-size:14px;padding:3px;border-radius:4px;border:1px solid #aaa"><option value="">--</option>${opts}</select>`;
        }
        html = html.replace('{' + f.field_id + '}', fieldHtml);
      });
      div.innerHTML = html;
    } else {
      div.innerHTML = (item.prompt || item.label || '') + ' ';
      if (item.input_type === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.id = item.field_id;
        inp.style.cssText = 'font-size:14px;padding:4px;border:1px solid #aaa;border-radius:4px;min-width:200px';
        div.appendChild(inp);
      } else {
        div.appendChild(makeSelect(item.field_id, item.options || []));
      }
    }
    block.appendChild(div);
  });
  container.appendChild(block);
};

// reading_comprehension: 読解問題
R.render_reading_comprehension = function(q, container) {
  const block = createQBlock(q.title_html);
  // passage_image: 画像で文章を提示
  if (q.passage_image) {
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = 'text-align:center;margin:10px 0';
    imgDiv.innerHTML = `<img src="${asset(q.passage_image)}" style="max-width:100%;border:1px solid #ddd;border-radius:6px">`;
    block.appendChild(imgDiv);
  }
  // sub_sections: ○×と記述などの複合構造
  if (q.sub_sections) {
    q.sub_sections.forEach(ss => {
      const ssDiv = document.createElement('div');
      ssDiv.style.cssText = 'margin-top:14px;padding:10px;background:#f8f9fa;border-radius:6px';
      if (ss.sub_title) {
        const t = document.createElement('div');
        t.style.cssText = 'font-weight:bold;color:#1a5276;margin-bottom:6px';
        t.innerHTML = ss.sub_title;
        ssDiv.appendChild(t);
      }
      if (ss.instruction) {
        const inst = document.createElement('div');
        inst.style.cssText = 'font-size:12px;color:#666;margin-bottom:6px';
        inst.innerHTML = ss.instruction;
        ssDiv.appendChild(inst);
      }
      (ss.items || []).forEach(item => {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:13px;margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
        const qSpan = document.createElement('span');
        qSpan.innerHTML = item.question || '';
        p.appendChild(qSpan);
        if (item.input_type === 'text') {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.id = item.field_id;
          inp.style.cssText = 'flex:1;min-width:200px;padding:4px;border:1px solid #aaa;border-radius:4px';
          p.appendChild(inp);
        } else {
          p.appendChild(makeSelect(item.field_id, item.options || []));
        }
        ssDiv.appendChild(p);
      });
      block.appendChild(ssDiv);
    });
    container.appendChild(block);
    return;
  }
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
      gs.innerHTML = item.group_sentence;
      gp.appendChild(gs);
      item.sub_items.forEach(sub => {
        const sp = document.createElement('p');
        sp.style.cssText = 'font-size:13px;color:#555;margin-top:6px';
        sp.innerHTML = (sub.question || '') + ' ';
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
      p.innerHTML = item.question;
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
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.innerHTML = q.instruction;
    block.appendChild(inst);
  }
  q.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'sentence';
    if (q.items.indexOf(item) > 0) div.style.marginTop = '10px';
    let html = item.dialogue_html || item.prompt_html || '';
    // 画像があれば差し込む
    if (item.image_src) {
      html = `<div style="text-align:center;margin:6px 0"><img src="${asset(item.image_src)}" style="max-width:100%;max-height:160px;border:1px solid #ddd;border-radius:4px"></div>` + html;
    }
    (item.fields || []).forEach(f => {
      let fieldHtml;
      if (f.input_type === 'text') {
        fieldHtml = `<input type="text" id="${f.field_id}" style="font-size:13px;padding:3px;border:1px solid #aaa;border-radius:4px;min-width:140px">`;
      } else {
        const opts = (f.options || []).map(o => {
          if (typeof o === 'object') return `<option value="${o.value}">${o.label}</option>`;
          return `<option value="${o}">${o}</option>`;
        }).join('');
        fieldHtml = `<select id="${f.field_id}" style="font-size:13px;padding:4px;border-radius:4px;border:1px solid #aaa"><option value="">--</option>${opts}</select>`;
      }
      html = html.replace('{' + f.field_id + '}', fieldHtml);
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
    inst.innerHTML = q.instruction;
    block.appendChild(inst);
  }
  const wrap = document.createElement('div');
  wrap.style.marginTop = '12px';
  q.items.forEach(item => {
    const qDiv = document.createElement('div');
    qDiv.style.marginBottom = '18px';
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;font-weight:bold;margin-bottom:8px';
    p.innerHTML = item.question;
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
  // 共有画像（全item共通）
  if (q.image_src) {
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = 'text-align:center;margin:8px 0';
    imgDiv.innerHTML = `<img src="${asset(q.image_src)}" style="max-width:100%;max-height:240px;border:1px solid #ddd;border-radius:6px">`;
    block.appendChild(imgDiv);
  }
  // 共有音声
  if (q.audio_src && !q.intro_audio) {
    const a = document.createElement('div');
    a.style.cssText = 'margin:8px 0';
    a.innerHTML = `<audio controls src="${asset(q.audio_src)}" style="width:100%"></audio>`;
    block.appendChild(a);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '12px';
    aq.innerHTML = `<div class="qlabel">${item.label || ''}</div>`;
    if (item.audio_src) aq.innerHTML += `<audio controls src="${asset(item.audio_src)}"></audio>`;
    if (item.choices) {
      // 画像選択
      const row = document.createElement('div');
      row.className = 'img-choice-row';
      item.choices.forEach(c => {
        const div = document.createElement('div');
        div.className = 'img-choice';
        div.innerHTML = `<img src="${asset(c.image_src)}"><p><label><input type="radio" name="${item.field_id}" value="${c.value}"> ${c.label}</label></p>`;
        row.appendChild(div);
      });
      aq.appendChild(row);
    } else if (item.options) {
      // フォールバック: シンプルな選択肢
      const ansBox = document.createElement('div');
      ansBox.className = 'answer-box';
      ansBox.style.marginTop = '6px';
      ansBox.appendChild(makeSelect(item.field_id, item.options));
      aq.appendChild(ansBox);
    }
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
    inst.innerHTML = q.instruction;
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
  // parts構造（test4 c3など）
  if (q.parts) {
    q.parts.forEach(part => {
      if (part.title) {
        const t = document.createElement('div');
        t.style.cssText = 'font-weight:bold;color:#1a5276;margin-top:10px';
        t.innerHTML = part.title;
        block.appendChild(t);
      }
      if (part.audio_src) {
        const a = document.createElement('div');
        a.style.cssText = 'margin:6px 0';
        a.innerHTML = `<audio controls src="${asset(part.audio_src)}" style="width:100%"></audio>`;
        block.appendChild(a);
      }
      (part.items || []).forEach(item => {
        const r = document.createElement('div');
        r.style.cssText = 'margin:6px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
        if (item.label) {
          const sp = document.createElement('span');
          sp.style.cssText = 'min-width:60px;font-weight:bold';
          sp.innerHTML = item.label;
          r.appendChild(sp);
        }
        if (item.audio_src) {
          const a = document.createElement('audio');
          a.controls = true; a.src = asset(item.audio_src);
          a.style.cssText = 'height:32px';
          r.appendChild(a);
        }
        if (item.fields) {
          item.fields.forEach(f => makeField(f, r));
        } else if (item.input_type === 'text') {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.id = item.field_id;
          inp.style.cssText = 'flex:1;min-width:160px;padding:4px;border:1px solid #aaa;border-radius:4px';
          r.appendChild(inp);
        } else if (item.options) {
          r.appendChild(makeSelect(item.field_id, item.options));
        }
        block.appendChild(r);
      });
    });
    container.appendChild(block);
    return;
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.style.marginTop = '8px';
    if (item.label) aq.innerHTML += `<div class="qlabel">${item.label}</div>`;
    if (item.audio_src) aq.innerHTML += `<audio controls src="${asset(item.audio_src)}"></audio>`;
    if (item.image_src) aq.innerHTML += `<div style="margin-top:8px"><img src="${asset(item.image_src)}" style="max-width:100%;border:1px solid #ddd;border-radius:4px"></div>`;
    if (item.question) aq.innerHTML += `<p style="font-size:13px;margin-top:8px">${item.question}</p>`;
    if (item.fields) {
      // 複数フィールド
      const row = document.createElement('div');
      row.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:4px';
      item.fields.forEach(f => {
        const fr = document.createElement('div');
        fr.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
        makeField(f, fr);
        row.appendChild(fr);
      });
      aq.appendChild(row);
    } else if (item.input_type === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.id = item.field_id;
      inp.style.cssText = 'width:100%;padding:6px;margin-top:6px;border:1px solid #aaa;border-radius:4px';
      if (item.placeholder) inp.placeholder = item.placeholder;
      aq.appendChild(inp);
    } else {
      const ansBox = document.createElement('div');
      ansBox.className = 'answer-box';
      ansBox.style.marginTop = '6px';
      if (item.prefix) ansBox.innerHTML = item.prefix;
      ansBox.appendChild(makeSelect(item.field_id, item.options || [], ''));
      if (item.suffix) {
        const suf = document.createTextNode(item.suffix);
        ansBox.appendChild(suf);
      }
      aq.appendChild(ansBox);
    }
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
    inst.innerHTML = q.instruction;
    block.appendChild(inst);
  }
  q.items.forEach(item => {
    const aq = document.createElement('div');
    aq.className = 'audio-q';
    aq.innerHTML = `<audio controls src="${asset(item.audio_src)}"></audio>`;
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-top:4px';
    p.innerHTML = (item.label || '') + ' ';
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
    inst.innerHTML = q.instruction;
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

// ===== test5-8 で使われる追加タイプ =====

// 共通: 指示・音声・画像・選択肢プールを描画
function renderIntro(q, block) {
  if (q.instruction) {
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.innerHTML = q.instruction;
    block.appendChild(inst);
  }
  if (q.word_bank_html) {
    const wb = document.createElement('div');
    wb.style.cssText = 'background:#fffde7;padding:10px;border-radius:6px;border-left:4px solid #f39c12;margin:8px 0;font-size:13px;line-height:1.8';
    wb.innerHTML = q.word_bank_html;
    block.appendChild(wb);
  }
  if (q.choice_pool_html) {
    const cp = document.createElement('div');
    cp.style.cssText = 'background:#eaf0fb;padding:10px;border-radius:6px;border-left:4px solid #1a5276;margin:8px 0;font-size:13px;line-height:1.8';
    cp.innerHTML = q.choice_pool_html;
    block.appendChild(cp);
  }
  if (q.example_html) {
    const ex = document.createElement('div');
    ex.style.cssText = 'background:#f0f4f8;padding:8px;border-radius:4px;font-size:12px;color:#666;margin:6px 0';
    ex.innerHTML = '例：' + q.example_html;
    block.appendChild(ex);
  }
  if (q.image_src) {
    const img = document.createElement('div');
    img.style.cssText = 'text-align:center;margin:10px 0';
    img.innerHTML = `<img src="${asset(q.image_src)}" style="max-width:100%;border:1px solid #ddd;border-radius:6px">`;
    block.appendChild(img);
  }
  if (q.audio_src) {
    const a = document.createElement('div');
    a.style.cssText = 'margin:10px 0';
    a.innerHTML = `<audio controls src="${asset(q.audio_src)}" style="width:100%"></audio>`;
    block.appendChild(a);
  }
}

// 画像ギャラリーを描画
function renderImageGallery(images, block) {
  if (!images) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0';
  images.forEach(im => {
    const cell = document.createElement('div');
    cell.style.cssText = 'text-align:center';
    cell.innerHTML = `<img src="${asset(im.image_src)}" style="max-width:120px;max-height:100px;border:1px solid #ccc;border-radius:4px"><div style="font-size:12px;font-weight:bold">${im.label || im.value}</div>`;
    row.appendChild(cell);
  });
  block.appendChild(row);
}

// 1つのフィールドを描画して要素を返す
function makeField(f, parentEl) {
  if (f.prefix) parentEl.appendChild(document.createTextNode(f.prefix));
  if (f.label) {
    const sp = document.createElement('span');
    sp.style.cssText = 'font-weight:bold;color:#555;margin-right:4px';
    sp.innerHTML = f.label;
    parentEl.appendChild(sp);
  }
  let el;
  if (f.input_type === 'text') {
    el = document.createElement('input');
    el.type = 'text'; el.id = f.field_id;
    el.style.cssText = 'font-size:13px;padding:4px 8px;border:1px solid #aaa;border-radius:4px;min-width:200px;margin:2px';
  } else {
    el = makeSelect(f.field_id, f.options || [], 'font-size:13px;margin:2px');
  }
  parentEl.appendChild(el);
  if (f.suffix) parentEl.appendChild(document.createTextNode(f.suffix));
}

// free_text / word_conjugation: テキスト入力リスト
R.render_free_text = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:10px 0;padding:8px;background:#f8f9fa;border-radius:6px';
    if (item.prompt_html || item.label) {
      const p = document.createElement('div');
      p.style.cssText = 'font-size:14px;margin-bottom:6px';
      p.innerHTML = item.prompt_html || item.label;
      row.appendChild(p);
    }
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = item.field_id;
    inp.style.cssText = 'width:100%;padding:6px;border:1px solid #aaa;border-radius:4px;font-size:14px;box-sizing:border-box';
    row.appendChild(inp);
    block.appendChild(row);
  });
  container.appendChild(block);
};
R.render_word_conjugation = R.render_free_text;
R.render_image_text_answer = R.render_free_text;

// audio_free_text / audio_image_select: 音声 + テキスト入力リスト
R.render_audio_free_text = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  if (q.images) renderImageGallery(q.images, block);
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:13px;font-weight:bold;min-width:160px';
    lbl.innerHTML = item.label || item.prompt_html || '';
    row.appendChild(lbl);
    if (item.audio_src) {
      const a = document.createElement('audio');
      a.controls = true; a.src = asset(item.audio_src);
      a.style.cssText = 'height:32px';
      row.appendChild(a);
    }
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = item.field_id;
    inp.style.cssText = 'flex:1;min-width:200px;padding:5px;border:1px solid #aaa;border-radius:4px;font-size:13px';
    row.appendChild(inp);
    block.appendChild(row);
  });
  container.appendChild(block);
};
R.render_audio_image_select = R.render_audio_free_text;

// audio_table_ox_text: 音声 + 表（複数フィールド/行）
R.render_audio_table_ox_text = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  const table = document.createElement('table');
  table.className = 'qa-table';
  table.style.width = '100%';
  if (q.columns) {
    const headTr = document.createElement('tr');
    const blank = document.createElement('th'); blank.textContent = ''; headTr.appendChild(blank);
    q.columns.forEach(c => {
      const th = document.createElement('th'); th.innerHTML = c; headTr.appendChild(th);
    });
    table.appendChild(headTr);
  }
  q.items.forEach(item => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.style.cssText = 'font-size:13px;padding:6px';
    tdLabel.innerHTML = item.label || '';
    tr.appendChild(tdLabel);
    (item.fields || []).forEach(f => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:4px';
      makeField(f, td);
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  block.appendChild(table);
  container.appendChild(block);
};

// audio_text_image_select: 音声付きitem + テキスト入力 + 画像選択
R.render_audio_text_image_select = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  if (q.image_choices) renderImageGallery(q.image_choices, block);
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:14px 0;padding:10px;background:#f8f9fa;border-radius:6px';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-weight:bold;color:#1a5276;font-size:14px';
    lbl.innerHTML = item.label || '';
    head.appendChild(lbl);
    if (item.audio_src) {
      const a = document.createElement('audio');
      a.controls = true; a.src = asset(item.audio_src);
      a.style.cssText = 'height:32px';
      head.appendChild(a);
    }
    row.appendChild(head);
    (item.fields || []).forEach(f => {
      const fr = document.createElement('div');
      fr.style.cssText = 'margin:4px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap';
      makeField(f, fr);
      row.appendChild(fr);
    });
    block.appendChild(row);
  });
  container.appendChild(block);
};

// audio_double_select: 音声 + 画像ギャラリー + 各itemに2つの選択
R.render_audio_double_select = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  if (q.condition_images) renderImageGallery(q.condition_images, block);
  if (q.reason_choices_html) {
    const rc = document.createElement('div');
    rc.style.cssText = 'background:#eaf0fb;padding:8px;border-radius:4px;font-size:13px;margin:8px 0';
    rc.innerHTML = q.reason_choices_html;
    block.appendChild(rc);
  }
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-weight:bold;min-width:50px';
    lbl.innerHTML = item.label || '';
    row.appendChild(lbl);
    if (item.audio_src) {
      const a = document.createElement('audio');
      a.controls = true; a.src = asset(item.audio_src);
      a.style.cssText = 'height:32px';
      row.appendChild(a);
    }
    (item.fields || []).forEach(f => {
      const fr = document.createElement('span');
      fr.style.cssText = 'display:inline-flex;align-items:center;gap:4px';
      makeField(f, fr);
      row.appendChild(fr);
    });
    block.appendChild(row);
  });
  container.appendChild(block);
};

// audio_select_text: 音声 + 画像 + テンプレート文（{field_id}埋め込み）
R.render_audio_select_text = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:10px 0;padding:8px;background:#f8f9fa;border-radius:6px;font-size:14px;line-height:2';
    if (item.template_html) {
      // テンプレートを展開: {field_id} → 入力要素
      let html = item.template_html;
      const placeholders = [];
      (item.fields || []).forEach(f => {
        const ph = `__FIELD_${f.field_id}__`;
        placeholders.push({ph, f});
        html = html.replace(`{${f.field_id}}`, ph);
      });
      // 一旦HTMLを設定してからプレースホルダを実要素に置換
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      placeholders.forEach(({ph, f}) => {
        const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue.includes(ph)) {
            const parent = node.parentNode;
            const before = node.nodeValue.substring(0, node.nodeValue.indexOf(ph));
            const after = node.nodeValue.substring(node.nodeValue.indexOf(ph) + ph.length);
            const span = document.createElement('span');
            makeField(f, span);
            parent.insertBefore(document.createTextNode(before), node);
            parent.insertBefore(span, node);
            parent.insertBefore(document.createTextNode(after), node);
            parent.removeChild(node);
            break;
          }
        }
      });
      while (tmp.firstChild) row.appendChild(tmp.firstChild);
    } else {
      (item.fields || []).forEach(f => makeField(f, row));
    }
    block.appendChild(row);
  });
  container.appendChild(block);
};

// select_from_pool: プールから選択
R.render_select_from_pool = function(q, container) {
  const block = createQBlock(q.title_html);
  renderIntro(q, block);
  q.items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;font-size:14px;line-height:2';
    if (item.sentence_html) {
      let html = item.sentence_html;
      (item.fields || [item]).forEach(f => {
        const fid = f.field_id;
        if (html.includes(`{${fid}}`)) {
          html = html.replace(`{${fid}}`, `<select id="${fid}" data-pool="1"></select>`);
        }
      });
      row.innerHTML = html;
      // optionsを設定
      (item.fields || [item]).forEach(f => {
        const sel = row.querySelector(`#${f.field_id}`);
        if (sel) {
          const blank = document.createElement('option'); blank.value=''; blank.textContent='--';
          sel.appendChild(blank);
          (f.options || q.pool_options || []).forEach(o => {
            const op = document.createElement('option');
            if (typeof o === 'object') { op.value=o.value; op.textContent=o.label; }
            else { op.value=o; op.textContent=o; }
            sel.appendChild(op);
          });
        }
      });
    } else if (item.prompt_html || item.label) {
      const p = document.createElement('span');
      p.innerHTML = (item.prompt_html || item.label) + ' ';
      row.appendChild(p);
      const opts = item.options || q.pool_options || [];
      row.appendChild(makeSelect(item.field_id, opts));
    }
    block.appendChild(row);
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
