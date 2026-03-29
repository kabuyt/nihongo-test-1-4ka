// ============ 結果集計・グラフ描画・分析 ============
// 参考: 内田クレペリン精神検査の判定基準

const Results = (() => {

  function calcRowStats(row) {
    const total = row.answers.length;
    const correct = row.answers.filter(a => a.isCorrect).length;
    const wrong = total - correct;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, wrong, rate };
  }

  // ============ 定型 / 非定型 判定 ============
  function judgeTypicality(allResults) {
    const firstHalf = allResults.filter(r => r.phase === 'first');
    const secondHalf = allResults.filter(r => r.phase === 'second');
    const firstCounts = firstHalf.map(r => calcRowStats(r).correct);
    const secondCounts = secondHalf.map(r => calcRowStats(r).correct);
    const allCounts = allResults.map(r => calcRowStats(r).correct);

    const issues = [];
    let score = 100; // 定型度スコア (100=完全定型)

    if (firstCounts.length < 15 || secondCounts.length < 15) {
      return { type: 'incomplete', score: 0, issues: ['検査が未完了です'], details: {} };
    }

    const avgAll = average(allCounts);
    const errorRate = allResults.flatMap(r => r.answers).filter(a => !a.isCorrect).length /
                      allResults.flatMap(r => r.answers).length;

    // 1. 作業量が著しく少ない（1行平均20問未満）
    if (avgAll < 20) {
      issues.push('作業量が著しく少ない');
      score -= 30;
    }

    // 2. 誤答率が高い（15%以上）
    if (errorRate > 0.15) {
      issues.push('誤答が多い');
      score -= 20;
    }

    // 3. 前半U字カーブの判定
    // 定型: 最初高い → 中盤下がる → 終盤やや回復
    const firstEarly = average(firstCounts.slice(0, 3));
    const firstMid = average(firstCounts.slice(5, 10));
    const firstLate = average(firstCounts.slice(12, 15));
    const hasInitialEffort = firstEarly > firstMid;
    const hasLateRecovery = firstLate >= firstMid - 2;

    if (!hasInitialEffort) {
      issues.push('初頭努力が見られない');
      score -= 15;
    }

    // 4. 後半が前半より開始時に増加し、徐々に低下
    const secondStart = average(secondCounts.slice(0, 3));
    const lastFirstAvg = average(firstCounts.slice(-3));
    const hasBreakRecovery = secondStart > lastFirstAvg - 2;

    if (!hasBreakRecovery) {
      issues.push('休憩後の回復が乏しい');
      score -= 15;
    }

    // 5. 著しい変動（標準偏差が大きすぎ）
    const sd = stddev(allCounts);
    if (sd > 8) {
      issues.push('作業量の変動が著しい');
      score -= 20;
    }

    // 6. 途中の急激な落ち込み
    for (let i = 1; i < allCounts.length; i++) {
      if (allCounts[i] < allCounts[i - 1] * 0.5) {
        issues.push('途中で著しい作業量の低下がある');
        score -= 15;
        break;
      }
    }

    score = Math.max(0, score);

    let type;
    if (score >= 70) type = 'typical';
    else if (score >= 40) type = 'near-typical';
    else type = 'atypical';

    return {
      type,
      score,
      issues,
      details: {
        avgAll, errorRate, sd,
        hasInitialEffort, hasLateRecovery, hasBreakRecovery,
        firstEarly, firstMid, firstLate,
      }
    };
  }

  // ============ 総合判定カード ============
  function renderJudgment(judgment) {
    const card = document.getElementById('judgment-card');
    const icon = document.getElementById('judgment-icon');
    const label = document.getElementById('judgment-label');
    const desc = document.getElementById('judgment-desc');

    const configs = {
      'typical': {
        cls: 'typical',
        icon: '&#10003;',
        label: '定型曲線',
        desc: '作業曲線は定型パターンに該当します。精神面・処理能力ともに安定した傾向が見られます。',
      },
      'near-typical': {
        cls: 'near-typical',
        icon: '&#9651;',
        label: '準定型曲線',
        desc: '作業曲線は概ね定型に近いですが、一部に偏りが見られます。',
      },
      'atypical': {
        cls: 'atypical',
        icon: '&#10007;',
        label: '非定型曲線',
        desc: '作業曲線に定型パターンからの逸脱が見られます。性格や処理能力に偏りがある可能性があります。',
      },
      'incomplete': {
        cls: 'atypical',
        icon: '—',
        label: '判定不可',
        desc: '検査が完了していないため判定できません。',
      },
    };

    const cfg = configs[judgment.type];
    card.className = 'judgment-card ' + cfg.cls;
    icon.innerHTML = cfg.icon;
    label.textContent = cfg.label;

    let descText = cfg.desc;
    if (judgment.issues.length > 0 && judgment.type !== 'typical') {
      descText += '\n要因: ' + judgment.issues.join('、');
    }
    desc.textContent = descText;
  }

  // ============ 4軸評価 ============
  function renderFourAxes(allResults) {
    const container = document.getElementById('four-axes');
    const firstHalf = allResults.filter(r => r.phase === 'first');
    const secondHalf = allResults.filter(r => r.phase === 'second');
    const firstCounts = firstHalf.map(r => calcRowStats(r).correct);
    const secondCounts = secondHalf.map(r => calcRowStats(r).correct);
    const allCounts = allResults.map(r => calcRowStats(r).correct);
    const avgAll = average(allCounts);

    // 発動性: 取りかかりの良さ（最初3行 vs 全体平均）
    const first3 = average(firstCounts.slice(0, 3));
    const initiativeRatio = first3 / (avgAll || 1);
    let initiativeScore, initiativeLevel, initiativeDesc;
    if (initiativeRatio > 1.15) {
      initiativeScore = 5; initiativeLevel = '高い';
      initiativeDesc = '物事への取りかかりが早く、意欲的に作業を開始できます。';
    } else if (initiativeRatio > 1.05) {
      initiativeScore = 4; initiativeLevel = 'やや高い';
      initiativeDesc = '比較的スムーズに作業を開始でき、適度な発動性があります。';
    } else if (initiativeRatio > 0.95) {
      initiativeScore = 3; initiativeLevel = '標準';
      initiativeDesc = '安定したペースで作業を始めています。';
    } else if (initiativeRatio > 0.85) {
      initiativeScore = 2; initiativeLevel = 'やや低い';
      initiativeDesc = '作業開始時にやや慎重で、ウォームアップが必要な傾向です。';
    } else {
      initiativeScore = 1; initiativeLevel = '低い';
      initiativeDesc = '作業の立ち上がりに時間がかかり、エンジンがかかるまでに時間を要します。';
    }

    // 可変性: 気分・行動の変化（標準偏差ベース）
    const sd = stddev(allCounts);
    let variabilityScore, variabilityLevel, variabilityDesc;
    if (sd > 8) {
      variabilityScore = 5; variabilityLevel = '大きい';
      variabilityDesc = '気分や行動の変化が大きく、作業ペースにムラがあります。環境変化に敏感な傾向です。';
    } else if (sd > 5) {
      variabilityScore = 4; variabilityLevel = 'やや大きい';
      variabilityDesc = '適度な変化があり、柔軟性がある一方、安定性にやや欠ける面もあります。';
    } else if (sd > 3) {
      variabilityScore = 3; variabilityLevel = '標準';
      variabilityDesc = '適度な変動幅で、バランスの取れた可変性です。';
    } else if (sd > 1.5) {
      variabilityScore = 2; variabilityLevel = '小さい';
      variabilityDesc = '作業ペースが安定しており、堅実に取り組む傾向です。';
    } else {
      variabilityScore = 1; variabilityLevel = '非常に小さい';
      variabilityDesc = '極めて安定した作業ペースです。一方で変化への柔軟性はやや低い可能性があります。';
    }

    // 亢進性: 勢いの強さ（後半の伸び、休憩後の回復）
    const secondStart3 = average(secondCounts.slice(0, 3));
    const lastFirst3 = average(firstCounts.slice(-3));
    const recovery = secondStart3 - lastFirst3;
    const secondTrend = secondCounts.length >= 5 ?
      average(secondCounts.slice(0, 5)) - average(secondCounts.slice(-5)) : 0;

    let accelerationScore, accelerationLevel, accelerationDesc;
    if (recovery > 5 && secondTrend < 3) {
      accelerationScore = 5; accelerationLevel = '強い';
      accelerationDesc = '物事を進める勢いが強く、休憩後も高い回復力で持続的に取り組めます。';
    } else if (recovery > 2) {
      accelerationScore = 4; accelerationLevel = 'やや強い';
      accelerationDesc = '適度な勢いがあり、休憩後の回復も良好です。';
    } else if (recovery > -2) {
      accelerationScore = 3; accelerationLevel = '標準';
      accelerationDesc = '安定した勢いで作業に取り組んでいます。';
    } else if (recovery > -5) {
      accelerationScore = 2; accelerationLevel = 'やや弱い';
      accelerationDesc = '休憩後の立ち上がりにやや時間がかかる傾向です。';
    } else {
      accelerationScore = 1; accelerationLevel = '弱い';
      accelerationDesc = '持続力にやや課題があり、中断後の再開が苦手な傾向です。';
    }

    // 作業量（処理能力）
    let capacityScore, capacityLevel, capacityDesc;
    if (avgAll >= 50) {
      capacityScore = 5; capacityLevel = '非常に高い';
      capacityDesc = '極めて高い処理能力を持ち、効率的かつ正確に作業を進められます。';
    } else if (avgAll >= 40) {
      capacityScore = 4; capacityLevel = '高い';
      capacityDesc = '高い処理能力があり、安定したテンポで正確に作業できます。';
    } else if (avgAll >= 30) {
      capacityScore = 3; capacityLevel = '標準';
      capacityDesc = '標準的な処理能力で、着実に作業をこなしています。';
    } else if (avgAll >= 20) {
      capacityScore = 2; capacityLevel = 'やや低い';
      capacityDesc = '処理速度はやや控えめですが、正確さを重視する傾向が見られます。';
    } else {
      capacityScore = 1; capacityLevel = '低い';
      capacityDesc = '処理速度に課題があり、集中力の向上が望まれます。';
    }

    const axes = [
      { name: '発動性', sub: '取りかかりの良さ', score: initiativeScore, level: initiativeLevel, desc: initiativeDesc, color: '#2563eb' },
      { name: '可変性', sub: '気分・行動の変化', score: variabilityScore, level: variabilityLevel, desc: variabilityDesc, color: '#7c3aed' },
      { name: '亢進性', sub: '勢いの強さ', score: accelerationScore, level: accelerationLevel, desc: accelerationDesc, color: '#f59e0b' },
      { name: '作業量', sub: '処理能力・効率', score: capacityScore, level: capacityLevel, desc: capacityDesc, color: '#16a34a' },
    ];

    container.innerHTML = axes.map(a => {
      const bars = Array.from({ length: 5 }, (_, i) =>
        `<div class="axis-bar-segment ${i < a.score ? 'filled' : ''}" style="--bar-color: ${a.color}"></div>`
      ).join('');
      return `
        <div class="axis-card">
          <div class="axis-header">
            <div>
              <div class="axis-name">${a.name}</div>
              <div class="axis-sub">${a.sub}</div>
            </div>
            <div class="axis-level" style="color: ${a.color}">${a.level}</div>
          </div>
          <div class="axis-bar">${bars}</div>
          <div class="axis-desc">${a.desc}</div>
        </div>
      `;
    }).join('');
  }

  // ============ 作業曲線グラフ ============
  function drawChart(allResults, judgment) {
    const canvas = document.getElementById('chart-curve');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const correctCounts = allResults.map(r => calcRowStats(r).correct);
    const maxCount = Math.max(...correctCounts, 1);
    const yMax = Math.ceil(maxCount / 10) * 10 + 10;
    const n = allResults.length;
    const firstHalfCount = allResults.filter(r => r.phase === 'first').length;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // グリッド線
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = pad.top + (chartH / yTicks) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      const val = Math.round(yMax - (yMax / yTicks) * i);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, pad.left - 8, y + 4);
    }

    // 休憩区切り線
    if (firstHalfCount > 0 && firstHalfCount < n) {
      const xBreak = pad.left + (firstHalfCount - 0.5) * (chartW / (n - 1 || 1));

      // 休憩エリアの背景
      ctx.fillStyle = 'rgba(249, 250, 251, 0.8)';
      ctx.fillRect(xBreak - 15, pad.top, 30, chartH);

      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(xBreak, pad.top);
      ctx.lineTo(xBreak, pad.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('休憩', xBreak, pad.top - 8);
    }

    if (n === 0) return;

    const points = correctCounts.map((c, i) => ({
      x: pad.left + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2),
      y: pad.top + chartH - (c / yMax) * chartH,
      phase: allResults[i].phase,
      count: c,
    }));

    // エリア塗りつぶし（前半）
    const firstPts = points.filter(p => p.phase === 'first');
    if (firstPts.length >= 2) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
      ctx.beginPath();
      ctx.moveTo(firstPts[0].x, pad.top + chartH);
      firstPts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(firstPts[firstPts.length - 1].x, pad.top + chartH);
      ctx.closePath();
      ctx.fill();
    }

    // エリア塗りつぶし（後半）
    const secondPts = points.filter(p => p.phase === 'second');
    if (secondPts.length >= 2) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
      ctx.beginPath();
      ctx.moveTo(secondPts[0].x, pad.top + chartH);
      secondPts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(secondPts[secondPts.length - 1].x, pad.top + chartH);
      ctx.closePath();
      ctx.fill();
    }

    // 折れ線
    drawLine(ctx, firstPts, '#2563eb');
    drawLine(ctx, secondPts, '#f59e0b');

    // ポイント
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.phase === 'first' ? '#2563eb' : '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X軸ラベル
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    points.forEach((p, i) => {
      if (n <= 15 || i % 2 === 0) {
        ctx.fillText(i + 1, p.x, pad.top + chartH + 18);
      }
    });

    // 軸ラベル
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('行', W / 2, H - 4);

    ctx.save();
    ctx.translate(12, pad.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('正答数', 0, 0);
    ctx.restore();

    // 凡例
    const legendY = pad.top + chartH + 36;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';

    // 前半
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(W / 2 - 74, legendY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillText('前半', W / 2 - 64, legendY + 3);

    // 後半
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(W / 2 + 16, legendY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillText('後半', W / 2 + 26, legendY + 3);

    // 曲線の注釈
    const noteEl = document.getElementById('curve-note');
    if (judgment.type === 'typical') {
      noteEl.innerHTML = '<span class="note-typical">定型パターン:</span> 前半はU字型の曲線を描き、後半は休憩後に増加してから緩やかに低下しています。';
    } else if (judgment.type === 'near-typical') {
      noteEl.innerHTML = '<span class="note-near">準定型パターン:</span> 概ね定型に近い曲線ですが、一部に変動が見られます。';
    } else if (judgment.type === 'atypical') {
      noteEl.innerHTML = '<span class="note-atypical">非定型パターン:</span> 定型曲線からの逸脱が見られます。' +
        (judgment.issues.length > 0 ? '（' + judgment.issues.join('、') + '）' : '');
    }
  }

  function drawLine(ctx, pts, color) {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  // ============ 総合スコア ============
  function renderSummary(allResults) {
    const container = document.getElementById('summary-stats');
    const all = allResults.flatMap(r => r.answers);
    const totalAnswered = all.length;
    const totalCorrect = all.filter(a => a.isCorrect).length;
    const totalWrong = totalAnswered - totalCorrect;
    const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgPerRow = allResults.length > 0 ? Math.round(totalCorrect / allResults.length * 10) / 10 : 0;

    const stats = [
      { label: '総回答数', value: totalAnswered, icon: '&#9998;' },
      { label: '正答数', value: totalCorrect, icon: '&#10003;' },
      { label: '誤答数', value: totalWrong, icon: '&#10007;' },
      { label: '正答率', value: overallRate + '%', icon: '&#9733;' },
      { label: '1行平均正答', value: avgPerRow, icon: '&#8709;' },
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');
  }

  // ============ 詳細分析 ============
  function renderAnalysis(allResults) {
    const container = document.getElementById('analysis');
    const items = [];

    const firstHalf = allResults.filter(r => r.phase === 'first');
    const secondHalf = allResults.filter(r => r.phase === 'second');
    const firstCounts = firstHalf.map(r => calcRowStats(r).correct);
    const secondCounts = secondHalf.map(r => calcRowStats(r).correct);

    // 初頭努力
    if (firstCounts.length >= 3) {
      const first3Avg = average(firstCounts.slice(0, 3));
      const restAvg = average(firstCounts.slice(3));
      const effort = first3Avg - restAvg;
      let desc;
      if (effort > 3) {
        desc = `最初の3行は平均より ${effort.toFixed(1)} 問多く、初頭努力が明確に見られます。意欲的に作業に取りかかれるタイプです。`;
      } else if (effort < -3) {
        desc = '序盤はやや低調で、ウォームアップを経て本来の力を発揮するタイプです。';
      } else {
        desc = '序盤から安定した作業量で、大きな初頭努力は見られません。着実に取り組むタイプです。';
      }
      items.push({ label: '初頭努力', value: desc });
    }

    // 疲労度
    if (firstCounts.length >= 10) {
      const early = average(firstCounts.slice(0, 5));
      const late = average(firstCounts.slice(-5));
      const fatigue = early - late;
      let desc;
      if (fatigue > 5) {
        desc = `前半の前期と後期で平均 ${fatigue.toFixed(1)} 問の差があり、疲労による作業量低下が見られます。適度な休憩の活用が効果的です。`;
      } else if (fatigue > 2) {
        desc = `前半の前期と後期で平均 ${fatigue.toFixed(1)} 問の差。軽微な疲労傾向がありますが、許容範囲内です。`;
      } else {
        desc = '前半を通じて作業量の低下は少なく、高い疲労耐性が見られます。持続的な集中力があります。';
      }
      items.push({ label: '疲労耐性', value: desc });
    }

    // 休憩効果
    if (firstCounts.length >= 3 && secondCounts.length >= 3) {
      const lastFirst = average(firstCounts.slice(-3));
      const firstSecond = average(secondCounts.slice(0, 3));
      const recovery = firstSecond - lastFirst;
      let desc;
      if (recovery > 3) {
        desc = `休憩後に平均 ${recovery.toFixed(1)} 問増加。休憩を効果的に活用し、高い回復効果が得られています。`;
      } else if (recovery > -2) {
        desc = '休憩前後で作業量に大きな変化はなく、安定したペースを維持しています。';
      } else {
        desc = `休憩後に作業量が ${Math.abs(recovery).toFixed(1)} 問減少。再始動に時間がかかる傾向です。`;
      }
      items.push({ label: '休憩効果', value: desc });
    }

    // 前半 vs 後半
    if (firstCounts.length > 0 && secondCounts.length > 0) {
      const avgFirst = average(firstCounts);
      const avgSecond = average(secondCounts);
      const diff = avgSecond - avgFirst;
      let desc;
      if (diff > 2) {
        desc = `後半の平均が ${diff.toFixed(1)} 問多く、後半に調子が上がるタイプです。持久力に優れています。`;
      } else if (diff < -2) {
        desc = `前半の平均が ${Math.abs(diff).toFixed(1)} 問多く、前半に強いタイプです。短期集中力に優れています。`;
      } else {
        desc = '前半と後半の作業量はほぼ均衡しており、安定した持続力があります。';
      }
      items.push({ label: '前半 vs 後半', value: desc });
    }

    // 正確性パターン
    const allErrors = allResults.map(r => {
      const s = calcRowStats(r);
      return s.wrong;
    });
    const avgErrors = average(allErrors);
    const errorTrend = allErrors.length >= 10 ?
      average(allErrors.slice(-5)) - average(allErrors.slice(0, 5)) : 0;

    let errorDesc;
    if (avgErrors < 1) {
      errorDesc = '極めて高い正確性を維持しています。慎重かつ丁寧に取り組む性格が表れています。';
    } else if (avgErrors < 3) {
      errorDesc = '適度な正確性を保ちながら、効率的に作業を進めています。';
    } else {
      errorDesc = '誤答がやや多い傾向です。' +
        (errorTrend > 1 ? '特に後半に増加しており、疲労による注意力低下の影響が考えられます。' :
         '速度と正確性のバランスを意識すると改善が期待できます。');
    }
    items.push({ label: '正確性', value: errorDesc });

    container.innerHTML = items.map(item => `
      <div class="analysis-item">
        <div class="label">${item.label}</div>
        <div class="value">${item.value}</div>
      </div>
    `).join('');
  }

  // ============ 詳細テーブル ============
  function renderDetailTable(allResults) {
    const tbody = document.getElementById('detail-tbody');
    const allCounts = allResults.map(r => calcRowStats(r).correct);
    const maxCorrect = Math.max(...allCounts);
    const minCorrect = Math.min(...allCounts);

    tbody.innerHTML = allResults.map((r, i) => {
      const s = calcRowStats(r);
      let rowClass = '';
      if (s.correct === maxCorrect) rowClass = 'row-best';
      else if (s.correct === minCorrect) rowClass = 'row-worst';
      return `<tr class="${rowClass}">
        <td>${i + 1}</td>
        <td><span class="badge-${r.phase === 'first' ? 'first' : 'second'}">${r.phase === 'first' ? '前半' : '後半'}</span></td>
        <td>${s.correct}</td>
        <td>${s.wrong}</td>
        <td>${s.rate}%</td>
      </tr>`;
    }).join('');
  }

  // ============ ユーティリティ ============
  function average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stddev(arr) {
    const avg = average(arr);
    const sqDiffs = arr.map(v => (v - avg) ** 2);
    return Math.sqrt(average(sqDiffs));
  }

  // ============ メインレンダリング ============
  function render(allResults) {
    const judgment = judgeTypicality(allResults);
    renderJudgment(judgment);
    drawChart(allResults, judgment);
    renderFourAxes(allResults);
    renderSummary(allResults);
    renderAnalysis(allResults);
    renderDetailTable(allResults);
  }

  return { render };
})();
