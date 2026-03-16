/* ═══════════════════════════════════════════════════════
   admin.js — لوحة إدارة مولد المعايدات
═══════════════════════════════════════════════════════ */

/* بيانات مخزّنة من آخر fetch */
let statsData    = null;
let timeChart    = null;
let currentPeriod = 'daily';

/* ─── تحميل الإحصائيات من الـ API ─── */
async function loadStats() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');

  try {
    const res  = await fetch('/api/stats');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    statsData = await res.json();

    renderStatCards(statsData);
    renderTemplateBars(statsData.byTemplate);
    renderTimeChart(statsData, currentPeriod);
    renderTable(statsData.recent);

  } catch (err) {
    console.error('خطأ في تحميل الإحصائيات:', err);
    showError();
  } finally {
    btn.classList.remove('spinning');
  }
}

/* ════════════════════════════════════════
   STAT CARDS
════════════════════════════════════════ */
function renderStatCards(data) {
  const { totals, byTemplate } = data;
  const top = byTemplate?.[0];

const cards = [
  {
    icon: `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
</svg>`,
    label: 'إجمالي التوليدات',
    value: totals.total_generates ?? 0,
    sub: 'بطاقة مولّدة',
    highlight: true
  },
  {
    icon: `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <path d="M7 10l5 5 5-5"/>
  <path d="M12 15V3"/>
</svg>`,
    label: 'إجمالي التحميلات',
    value: totals.total_downloads ?? 0,
    sub: 'بطاقة محمّلة'
  },
  {
    icon: `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M20 21a8 8 0 1 0-16 0"/>
  <circle cx="12" cy="7" r="4"/>
</svg>`,
    label: 'الزوار الفريدون',
    value: totals.unique_visitors ?? 0,
    sub: 'جلسة مختلفة'
  },
  {
    icon: `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="8" r="7"/>
  <polyline points="8 14 12 18 16 14"/>
</svg>`,
    label: 'أكثر قالب استخداماً',
    value: top ? top.template_name : '—',
    sub: top ? `${top.generates} توليد` : 'لا توجد بيانات'
  }
];

  const container = document.getElementById('stat-cards');
  container.innerHTML = cards.map(c => `
    <div class="stat-card ${c.highlight ? 'highlight' : ''}">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════
   TEMPLATE BARS
════════════════════════════════════════ */
function renderTemplateBars(byTemplate) {
  const container = document.getElementById('tmpl-bars');
  if (!byTemplate || byTemplate.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="ei">📭</span>لا توجد بيانات بعد</div>`;
    return;
  }

  const maxVal = Math.max(...byTemplate.map(t => t.generates), 1);

  container.innerHTML = byTemplate.map(t => {
    const pct = Math.round((t.generates / maxVal) * 100);
    return `
      <div class="tmpl-bar-row">
        <div class="tmpl-bar-label">
          <strong>${t.template_name}</strong>
          <span>${t.generates} توليد · ${t.downloads} تحميل</span>
        </div>
        <div class="tmpl-bar-track">
          <div class="tmpl-bar-fill" style="width:0%" data-target="${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  /* تحريك الأشرطة */
  requestAnimationFrame(() => {
    document.querySelectorAll('.tmpl-bar-fill').forEach(el => {
      el.style.width = el.dataset.target;
    });
  });
}

/* ════════════════════════════════════════
   TIME CHART (daily / weekly / monthly)
════════════════════════════════════════ */
function renderTimeChart(data, period) {
  const periodData = data[period] || [];
  const canvas     = document.getElementById('time-chart');

  /* ترجمة المحاور */
  const labels = periodData.map(d => {
    if (period === 'daily')   return formatDay(d.day);
    if (period === 'weekly')  return d.week.replace('W', 'أسبوع ');
    if (period === 'monthly') return formatMonth(d.month);
    return d.day || d.week || d.month;
  });

  const generates = periodData.map(d => d.generates);
  const downloads = periodData.map(d => d.downloads);

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'توليد',
          data: generates,
          backgroundColor: 'rgba(107,51,32,0.75)',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'تحميل',
          data: downloads,
          backgroundColor: 'rgba(74,124,89,0.65)',
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          rtl: true,
          labels: {
            font:      { family: 'Cairo', size: 11, weight: '600' },
            color:     '#3A1C0C',
            boxWidth:  12,
            boxHeight: 12,
            borderRadius: 3
          }
        },
        tooltip: {
          rtl: true,
          titleFont: { family: 'Cairo' },
          bodyFont:  { family: 'Cairo' }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { family: 'Cairo', size: 10 },
            color: '#A07858',
            maxRotation: 0
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { family: 'Cairo', size: 10 },
            color: '#A07858',
            stepSize: 1
          },
          grid: { color: 'rgba(212,184,152,0.3)' },
          beginAtZero: true
        }
      }
    }
  };

  if (timeChart) {
    timeChart.data    = chartConfig.data;
    timeChart.update('active');
  } else {
    timeChart = new Chart(canvas, chartConfig);
  }
}

/* ─── تبديل الفترة ─── */
function switchPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (statsData) renderTimeChart(statsData, period);
}

/* ════════════════════════════════════════
   RECENT EVENTS TABLE
════════════════════════════════════════ */
function renderTable(events) {
  const tbody = document.getElementById('events-tbody');
  const count = document.getElementById('tbl-count');

  count.textContent = `${events?.length ?? 0} سجل`;

  if (!events || events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <span class="ei">📭</span>لا توجد أحداث بعد
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = events.map((e, i) => `
    <tr>
      <td style="color:var(--muted);font-size:11px">${e.id}</td>
      <td><strong>${escHtml(e.entered_name)}</strong></td>
      <td>${escHtml(e.template_name)}</td>
      <td>
        <span class="badge badge-${e.action}">
          ${e.action === 'generate' ? '🎨 توليد' : '⬇️ تحميل'}
        </span>
      </td>
      <td style="color:var(--muted);font-size:11px;direction:ltr;text-align:left">
        ${formatDate(e.created_at)}
      </td>
    </tr>
  `).join('');
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function formatDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const [, m] = monthStr.split('-');
  return months[parseInt(m, 10) - 1] || monthStr;
}

function formatDate(str) {
  if (!str) return '';
  return str.replace('T', ' ').slice(0, 16);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError() {
  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card" style="grid-column:1/-1;text-align:center;padding:32px">
      <span style="font-size:32px">⚠️</span>
      <p style="margin-top:8px;color:var(--muted);font-size:13px">
        تعذّر الاتصال بالخادم. تأكد أن <code>server.js</code> يعمل.
      </p>
    </div>`;
}

/* ─── تحميل تلقائي عند فتح الصفحة ─── */
loadStats();

/* ─── تحديث تلقائي كل 30 ثانية ─── */
setInterval(loadStats, 30_000);

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
}
