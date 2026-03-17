/* ═══════════════════════════════════════════════════════
   dashboard.js — لوحة إدارة مولد المعايدات
   Supabase (بدون backend — يشتغل على GitHub Pages)
═══════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xnpubpmwwalvknrtrmjd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Fy68RT1C8D3NS5ofXHK8Dg_5xtYby4N';

const SB_HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json'
};

/* ── State ── */
let statsData     = null;
let timeChart     = null;
let currentPeriod = 'daily';

/* ════════════════════════════════════════
   LOAD: جيب كل البيانات من Supabase
════════════════════════════════════════ */
async function loadStats() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=2000`,
      { headers: SB_HEADERS }
    );

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const events = await res.json();

    statsData = processEvents(events);

    renderStatCards(statsData);
    renderTemplateBars(statsData.byTemplate);
    renderTimeChart(statsData, currentPeriod);
    renderTable(statsData.recent);

  } catch (err) {
    console.error('خطأ:', err);
    showError(err.message);
  } finally {
    btn.classList.remove('spinning');
  }
}

/* ════════════════════════════════════════
   PROCESS: احسب الإحصائيات محلياً
════════════════════════════════════════ */
function processEvents(events) {
  if (!events || !events.length) {
    return {
      totals:     { total_generates: 0, total_downloads: 0, unique_visitors: 0 },
      byTemplate: [],
      daily:      [],
      weekly:     [],
      monthly:    [],
      recent:     []
    };
  }

  /* ── إجماليات ── */
  const totals = {
    total_generates: events.filter(e => e.action === 'generate').length,
    total_downloads: events.filter(e => e.action === 'download').length,
    unique_visitors: new Set(events.map(e => e.session_id).filter(Boolean)).size
  };

  /* ── حسب القالب ── */
  const tmplMap = {};
  events.forEach(e => {
    const key = e.template_id;
    if (!tmplMap[key]) tmplMap[key] = {
      template_id:   e.template_id,
      template_name: e.template_name,
      generates: 0,
      downloads: 0
    };
    if (e.action === 'generate') tmplMap[key].generates++;
    if (e.action === 'download') tmplMap[key].downloads++;
  });
  const byTemplate = Object.values(tmplMap).sort((a, b) => b.generates - a.generates);

  /* ── يومي — آخر 14 يوم ── */
  const dailyMap = {};
  const now      = new Date();
  for (let i = 13; i >= 0; i--) {
    const d   = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { day: key, generates: 0, downloads: 0 };
  }
  events.forEach(e => {
    const day = (e.created_at || '').slice(0, 10);
    if (dailyMap[day]) {
      if (e.action === 'generate') dailyMap[day].generates++;
      if (e.action === 'download') dailyMap[day].downloads++;
    }
  });
  const daily = Object.values(dailyMap);

  /* ── أسبوعي — آخر 8 أسابيع ── */
  const weeklyMap = {};
  events.forEach(e => {
    const d    = new Date(e.created_at);
    const week = `${d.getFullYear()}-W${String(getWeekNum(d)).padStart(2, '0')}`;
    if (!weeklyMap[week]) weeklyMap[week] = { week, generates: 0, downloads: 0 };
    if (e.action === 'generate') weeklyMap[week].generates++;
    if (e.action === 'download') weeklyMap[week].downloads++;
  });
  const weekly = Object.values(weeklyMap)
    .sort((a, b) => a.week > b.week ? 1 : -1)
    .slice(-8);

  /* ── شهري — آخر 6 أشهر ── */
  const monthlyMap = {};
  events.forEach(e => {
    const month = (e.created_at || '').slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { month, generates: 0, downloads: 0 };
    if (e.action === 'generate') monthlyMap[month].generates++;
    if (e.action === 'download') monthlyMap[month].downloads++;
  });
  const monthly = Object.values(monthlyMap)
    .sort((a, b) => a.month > b.month ? 1 : -1)
    .slice(-6);

  return { totals, byTemplate, daily, weekly, monthly, recent: events.slice(0, 50) };
}

/* ════════════════════════════════════════
   RENDER: بطاقات الإحصائيات
════════════════════════════════════════ */
function renderStatCards(data) {
  const { totals, byTemplate } = data;
  const top = byTemplate?.[0];

  const cards = [
    {
      icon: '🎨', highlight: true,
      label: 'إجمالي التوليدات',
      value: totals.total_generates,
      sub:   'بطاقة مولّدة'
    },
    {
      icon: '⬇️',
      label: 'إجمالي التحميلات',
      value: totals.total_downloads,
      sub:   'بطاقة محمّلة'
    },
    {
      icon: '👤',
      label: 'الزوار الفريدون',
      value: totals.unique_visitors,
      sub:   'جلسة مختلفة'
    },
    {
      icon: '🏆',
      label: 'أكثر قالب استخداماً',
      value: top ? top.template_name : '—',
      sub:   top ? `${top.generates} توليد` : 'لا توجد بيانات'
    }
  ];

  document.getElementById('stat-cards').innerHTML = cards.map(c => `
    <div class="stat-card ${c.highlight ? 'highlight' : ''}">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════
   RENDER: أشرطة القوالب
════════════════════════════════════════ */
function renderTemplateBars(byTemplate) {
  const el = document.getElementById('tmpl-bars');
  if (!byTemplate || !byTemplate.length) {
    el.innerHTML = `<div class="empty-state"><span class="ei">📭</span>لا توجد بيانات بعد</div>`;
    return;
  }
  const max = Math.max(...byTemplate.map(t => t.generates), 1);
  el.innerHTML = byTemplate.map(t => {
    const pct = Math.round((t.generates / max) * 100);
    return `
      <div class="tmpl-bar-row">
        <div class="tmpl-bar-label">
          <strong>${escHtml(t.template_name)}</strong>
          <span>${t.generates} توليد · ${t.downloads} تحميل</span>
        </div>
        <div class="tmpl-bar-track">
          <div class="tmpl-bar-fill" style="width:0%" data-target="${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  requestAnimationFrame(() => {
    document.querySelectorAll('.tmpl-bar-fill').forEach(el => {
      el.style.width = el.dataset.target;
    });
  });
}

/* ════════════════════════════════════════
   RENDER: مخطط الزمن
════════════════════════════════════════ */
function renderTimeChart(data, period) {
  const rows   = data[period] || [];
  const canvas = document.getElementById('time-chart');

  const labels    = rows.map(d => {
    if (period === 'daily')   return formatDay(d.day);
    if (period === 'weekly')  return (d.week || '').replace('W', 'أسبوع ');
    if (period === 'monthly') return formatMonth(d.month);
    return '';
  });

  const cfg = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'توليد',
          data: rows.map(d => d.generates),
          backgroundColor: 'rgba(107,51,32,0.75)',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'تحميل',
          data: rows.map(d => d.downloads),
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
          position: 'top', rtl: true,
          labels: { font: { family: 'Cairo', size: 11, weight: '600' }, color: '#3A1C0C', boxWidth: 12, boxHeight: 12 }
        },
        tooltip: { rtl: true, titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
      },
      scales: {
        x: { ticks: { font: { family: 'Cairo', size: 10 }, color: '#A07858', maxRotation: 0 }, grid: { display: false } },
        y: { ticks: { font: { family: 'Cairo', size: 10 }, color: '#A07858', stepSize: 1 }, grid: { color: 'rgba(212,184,152,0.3)' }, beginAtZero: true }
      }
    }
  };

  if (timeChart) { timeChart.data = cfg.data; timeChart.update('active'); }
  else           { timeChart = new Chart(canvas, cfg); }
}

function switchPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (statsData) renderTimeChart(statsData, period);
}

/* ════════════════════════════════════════
   RENDER: جدول الأحداث الأخيرة
════════════════════════════════════════ */
function renderTable(events) {
  const tbody = document.getElementById('events-tbody');
  document.getElementById('tbl-count').textContent = `${events?.length ?? 0} سجل`;

  if (!events || !events.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="ei">📭</span>لا توجد أحداث بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = events.map(e => `
    <tr>
      <td style="color:var(--muted);font-size:11px">${e.id}</td>
      <td><strong>${escHtml(e.entered_name || '—')}</strong></td>
      <td>${escHtml(e.template_name || '—')}</td>
      <td><span class="badge badge-${e.action}">${e.action === 'generate' ? '🎨 توليد' : '⬇️ تحميل'}</span></td>
      <td style="color:var(--muted);font-size:11px;direction:ltr;text-align:left">${formatDate(e.created_at)}</td>
    </tr>
  `).join('');
}

/* ════════════════════════════════════════
   SIDEBAR & BOTTOM NAV
════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
}
function setBnActive(el) {
  document.querySelectorAll('.bn-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

/* Scroll sync */
window.addEventListener('scroll', () => {
  const sections = ['overview', 'charts', 'recent'];
  let current = 'overview';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 80) current = id;
  });
  document.querySelectorAll('.sb-link').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  document.querySelectorAll('.bn-item').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === '#' + current));
}, { passive: true });

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function getWeekNum(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - y) / 86400000) + 1) / 7);
}

function formatDay(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatMonth(str) {
  if (!str) return '';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const m = parseInt(str.split('-')[1], 10);
  return months[m - 1] || str;
}

function formatDate(str) {
  if (!str) return '';
  return str.replace('T', ' ').slice(0, 16);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(msg) {
  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card" style="grid-column:1/-1;text-align:center;padding:32px">
      <span style="font-size:32px">⚠️</span>
      <p style="margin-top:8px;color:var(--muted);font-size:13px">
        تعذّر الاتصال بـ Supabase<br>
        <code style="font-size:11px;opacity:.7">${msg || ''}</code>
      </p>
    </div>`;
}

/* ── تشغيل عند الفتح + تحديث كل 30 ثانية ── */
loadStats();
setInterval(loadStats, 30_000);
