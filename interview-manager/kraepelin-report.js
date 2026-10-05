// 面接管理のクレペリン結果帳票（1人分）。面接画面の「結果PDF」から
// kraepelin-report.html?id=<記録ID>&iv=<面接名>&no=<No.N 氏名>&title=<ファイル名> で開く。
// 見出しは面接名・候補者番号・氏名。タイトルを「日付_面接名_クレペリン_No.N」にして、
// 印刷画面の「PDFに保存」で付くファイル名をそろえる。
(async function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const messageEl = document.getElementById('report-message');
  const showMessage = text => { messageEl.textContent = text; messageEl.hidden = false; };

  if (typeof supabase === 'undefined') { showMessage('読み込みに失敗しました。ページを開き直してください。'); return; }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) { window.location.href = '../login.html'; return; }
  if (!id) { showMessage('検査結果が指定されていません。'); return; }

  const { data: record, error } = await supabase
    .from('kraepelin_results')
    .select('id,name,started_at,created_at,results')
    .eq('id', id)
    .maybeSingle();
  if (error || !record) { showMessage('この検査結果を表示できません（ログインし直すか、権限を確認してください）。'); return; }

  // 記録の名前は「session:<面接ID> / No.N」なので、番号の指定が無いときも ID は出さない
  const noFromName = (String(record.name || '').match(/No\.?\s*(.+)$/i) || [])[1] || '';
  const meta = {
    startedAt: record.started_at || record.created_at,
    interviewName: params.get('iv') || '',
    candidateNo: params.get('no') || (noFromName ? `No.${noFromName}` : ''),
  };
  document.getElementById('report').hidden = false;
  // canvas の大きさが決まってから描く
  setTimeout(() => Results.render(record.results || [], meta), 50);
  document.title = params.get('title') || 'クレペリン検査結果';
  document.getElementById('print-btn').addEventListener('click', () => window.print());
})();
