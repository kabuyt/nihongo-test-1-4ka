// ============ クレペリン検査 結果一覧 ============

let allRecords = [];
let currentRecord = null;

async function loadRecords() {
  const container = document.getElementById('list-container');
  const stats = document.getElementById('stats');

  try {
    const { data, error } = await supabase
      .from('kraepelin_results')
      .select('*')
      .order('started_at', { ascending: false, nullsFirst: false });

    if (error) {
      container.innerHTML = `<div class="empty-state" style="color:#b91c1c;">読み込みエラー: ${error.message}</div>`;
      stats.textContent = '';
      return;
    }

    allRecords = data || [];
    stats.textContent = `${allRecords.length} 件`;
    render();
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="color:#b91c1c;">読み込み失敗: ${e.message}</div>`;
  }
}

function render() {
  const container = document.getElementById('list-container');
  const search = document.getElementById('search-name').value.trim().toLowerCase();
  const filterJudgment = document.getElementById('filter-judgment').value;

  let filtered = allRecords;
  if (search) filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(search));
  if (filterJudgment) filtered = filtered.filter(r => r.judgment_type === filterJudgment);

  document.getElementById('stats').textContent = `${filtered.length} 件 / 全 ${allRecords.length} 件`;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">該当する記録がありません</div>';
    return;
  }

  const judgeLabels = {
    'typical': '定型',
    'near-typical': '準定型',
    'atypical': '非定型',
    'incomplete': '未完了',
  };

  const rows = filtered.map(r => {
    const date = r.started_at || r.created_at;
    const dateStr = formatDate(date);
    const judgeKey = r.judgment_type || 'incomplete';
    const judgeLabel = judgeLabels[judgeKey] || judgeKey;
    const avg = r.avg_correct != null ? Number(r.avg_correct).toFixed(1) : '-';
    const errPct = r.error_rate != null ? (Number(r.error_rate) * 100).toFixed(1) + '%' : '-';
    return `
      <tr class="row-hover" data-id="${r.id}">
        <td onclick="event.stopPropagation();"><input type="checkbox" class="row-check" data-id="${r.id}"></td>
        <td class="col-name">${escapeHtml(r.name || '(無名)')}</td>
        <td>${dateStr}</td>
        <td><span class="judge-badge ${judgeKey}">${judgeLabel}</span></td>
        <td>${r.judgment_score != null ? r.judgment_score : '-'}</td>
        <td>${avg}</td>
        <td>${errPct}</td>
        <td class="col-actions">
          <button class="btn-mini" onclick="event.stopPropagation();showDetail('${r.id}')">詳細</button>
          <button class="btn-mini danger" onclick="event.stopPropagation();deleteRecord('${r.id}', this)">削除</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="list-table">
      <thead>
        <tr>
          <th><input type="checkbox" id="select-all-cb" title="全選択"></th>
          <th>氏名</th>
          <th>検査日時</th>
          <th>判定</th>
          <th>スコア</th>
          <th>平均正答</th>
          <th>誤答率</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll('tr.row-hover').forEach(tr => {
    tr.addEventListener('click', (e) => {
      // チェックボックスのセル以外でクリックされた場合のみ詳細を開く
      if (e.target.closest('.row-check') || e.target.tagName === 'INPUT') return;
      showDetail(tr.dataset.id);
    });
  });

  const selectAll = document.getElementById('select-all-cb');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = () => {
      container.querySelectorAll('.row-check').forEach(cb => cb.checked = selectAll.checked);
    };
  }
}

function showDetail(id) {
  const record = allRecords.find(r => r.id === id);
  if (!record) return;
  currentRecord = record;
  document.getElementById('modal-title').textContent = `${record.name || '(無名)'} - ${formatDate(record.started_at || record.created_at)}`;
  document.getElementById('modal-bg').classList.add('show');
  document.body.style.overflow = 'hidden';
  // モーダルがレイアウトされてから描画（canvas の高さ確保のため）
  requestAnimationFrame(() => requestAnimationFrame(() => {
    Results.render(record.results || [], {
      name: record.name,
      startedAt: record.started_at || record.created_at,
    });
  }));
}

function printDetail() {
  if (!currentRecord) { window.print(); return; }
  const orig = document.title;
  const safeName = (currentRecord.name || '無名').replace(/[\\/:*?"<>|]/g, '');
  const d = new Date(currentRecord.started_at || currentRecord.created_at);
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  document.title = `クレペリン検査_${safeName}_${dateStr}`;
  window.print();
  setTimeout(() => { document.title = orig; }, 1000);
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('show');
  document.body.style.overflow = '';
}

async function deleteRecord(id, btn) {
  if (!confirm('この記録を削除します。よろしいですか？')) return;
  btn.disabled = true;
  const { error } = await supabase.from('kraepelin_results').delete().eq('id', id);
  if (error) {
    alert('削除失敗: ' + error.message);
    btn.disabled = false;
    return;
  }
  allRecords = allRecords.filter(r => r.id !== id);
  render();
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// PDF一括ダウンロード（ZIP）
async function bulkDownloadPDF() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.dataset.id);
  if (ids.length === 0) { alert('対象を選択してください'); return; }
  const targets = ids.map(id => allRecords.find(r => r.id === id)).filter(Boolean);

  const btn = document.getElementById('bulk-pdf-btn');
  const orig = btn.textContent;
  btn.disabled = true;

  // モーダルを show（display:flex）するが visibility:hidden で見えなくする
  // → html2canvas は layout 済みの DOM を撮影できる
  const modalBg = document.getElementById('modal-bg');
  const wasShown = modalBg.classList.contains('show');
  modalBg.classList.add('show');
  modalBg.style.visibility = 'hidden';

  const zip = new JSZip();
  const opts = {
    margin: [10, 10, 10, 10],
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      btn.textContent = `生成中 ${i + 1}/${targets.length}...`;
      currentRecord = r;
      Results.render(r.results || [], { name: r.name, startedAt: r.started_at || r.created_at });
      // レイアウト + canvas 描画完了を待つ（visibility:hidden 配下では rAF が発火しないので setTimeout のみ）
      await new Promise(res => setTimeout(res, 300));

      const reportEl = document.querySelector('.modal-panel .result-container');
      const blob = await html2pdf().set(opts).from(reportEl).output('blob');
      const safeName = (r.name || '無名').replace(/[\\/:*?"<>|]/g, '');
      const d = new Date(r.started_at || r.created_at);
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      zip.file(`クレペリン検査_${safeName}_${dateStr}.pdf`, blob);
    }

    btn.textContent = 'ZIP生成中...';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `クレペリン検査_一括_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('PDF生成失敗: ' + err.message);
    console.error(err);
  } finally {
    if (!wasShown) modalBg.classList.remove('show');
    modalBg.style.visibility = '';
    btn.textContent = orig;
    btn.disabled = false;
  }
}

// イベント
document.getElementById('search-name').addEventListener('input', render);
document.getElementById('filter-judgment').addEventListener('change', render);
document.getElementById('bulk-pdf-btn').addEventListener('click', bulkDownloadPDF);
document.getElementById('modal-bg').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-bg')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

loadRecords();
