/* ═══════════════════════════════════════════════════════
   dashboard.js v2 — SVG icons + Line chart
═══════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xnpubpmwwalvknrtrmjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHVicG13d2FsdmtucnRybWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTAyNjcsImV4cCI6MjA4OTI4NjI2N30.-uSLztdMSUejcOWG_Hdy6XSRNRG-DK6_8x6CNXFv78M';

const SB_HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json'
};

/* SVG Icons */
const IC = {
  gen:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  dl:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  usr:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  top:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  empty:`<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
};

let statsData     = null;
let timeChart     = null;
let currentPeriod = 'daily';

/* ── Load ── */
async function loadStats() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=2000`,
      { headers: SB_HEADERS }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    statsData = processEvents(await res.json());
    renderStatCards(statsData);
    renderTemplateBars(statsData.byTemplate);
    renderTimeChart(statsData, currentPeriod);
    renderTable(statsData.recent);
  } catch (e) { showError(e.message); }
  finally { btn.classList.remove('spinning'); }
}

/* ── Process ── */
function processEvents(events) {
  if (!events?.length) return {
    totals:{total_generates:0,total_downloads:0,unique_visitors:0},
    byTemplate:[],daily:[],weekly:[],monthly:[],recent:[]
  };

  const totals = {
    total_generates: events.filter(e=>e.action==='generate').length,
    total_downloads: events.filter(e=>e.action==='download').length,
    unique_visitors: new Set(events.map(e=>e.session_id).filter(Boolean)).size
  };

  const tm={};
  events.forEach(e=>{
    if(!tm[e.template_id]) tm[e.template_id]={template_id:e.template_id,template_name:e.template_name,generates:0,downloads:0};
    if(e.action==='generate') tm[e.template_id].generates++;
    if(e.action==='download') tm[e.template_id].downloads++;
  });
  const byTemplate=Object.values(tm).sort((a,b)=>b.generates-a.generates);

  /* daily */
  const dm={};
  const now=new Date();
  for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);dm[k]={day:k,generates:0,downloads:0};}
  events.forEach(e=>{const d=(e.created_at||'').slice(0,10);if(dm[d]){if(e.action==='generate')dm[d].generates++;if(e.action==='download')dm[d].downloads++;}});
  const daily=Object.values(dm);

  /* weekly */
  const wm={};
  events.forEach(e=>{const d=new Date(e.created_at);const w=`${d.getFullYear()}-W${String(getWeek(d)).padStart(2,'0')}`;if(!wm[w])wm[w]={week:w,generates:0,downloads:0};if(e.action==='generate')wm[w].generates++;if(e.action==='download')wm[w].downloads++;});
  const weekly=Object.values(wm).sort((a,b)=>a.week>b.week?1:-1).slice(-8);

  /* monthly */
  const mm={};
  events.forEach(e=>{const m=(e.created_at||'').slice(0,7);if(!mm[m])mm[m]={month:m,generates:0,downloads:0};if(e.action==='generate')mm[m].generates++;if(e.action==='download')mm[m].downloads++;});
  const monthly=Object.values(mm).sort((a,b)=>a.month>b.month?1:-1).slice(-6);

  return {totals,byTemplate,daily,weekly,monthly,recent:events.slice(0,50)};
}

/* ── Stat Cards ── */
function renderStatCards({totals,byTemplate}) {
  const top=byTemplate?.[0];
  const cards=[
    {ic:IC.gen,  hl:true,  label:'إجمالي التوليدات',    value:totals.total_generates, sub:'بطاقة مولّدة'},
    {ic:IC.dl,   hl:false, label:'إجمالي التحميلات',    value:totals.total_downloads, sub:'بطاقة محمّلة'},
    {ic:IC.usr,  hl:false, label:'الزوار الفريدون',     value:totals.unique_visitors,  sub:'جلسة مختلفة'},
    {ic:IC.top,  hl:false, label:'أكثر قالب استخداماً', value:top?top.template_name:'—', sub:top?`${top.generates} توليد`:'لا بيانات'},
  ];
  document.getElementById('stat-cards').innerHTML=cards.map(c=>`
    <div class="stat-card ${c.hl?'highlight':''}">
      <div class="stat-icon">${c.ic}</div>
      <div class="stat-body">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>
    </div>`).join('');
}

/* ── Template Bars ── */
function renderTemplateBars(bt) {
  const el=document.getElementById('tmpl-bars');
  if(!bt?.length){el.innerHTML=`<div class="empty-state">${IC.empty}<span>لا توجد بيانات</span></div>`;return;}
  const max=Math.max(...bt.map(t=>t.generates),1);
  el.innerHTML=bt.map(t=>`
    <div class="tmpl-bar-row">
      <div class="tmpl-bar-label"><strong>${escHtml(t.template_name)}</strong><span>${t.generates} توليد · ${t.downloads} تحميل</span></div>
      <div class="tmpl-bar-track"><div class="tmpl-bar-fill" style="width:0%" data-target="${Math.round(t.generates/max*100)}%"></div></div>
    </div>`).join('');
  requestAnimationFrame(()=>{document.querySelectorAll('.tmpl-bar-fill').forEach(e=>{e.style.width=e.dataset.target;});});
}

/* ── Line Chart ── */
function renderTimeChart(data,period) {
  const rows=data[period]||[];
  const labels=rows.map(d=>{
    if(period==='daily')   return formatDay(d.day);
    if(period==='weekly')  return (d.week||'').replace('W','أسبوع ');
    if(period==='monthly') return formatMonth(d.month);
    return '';
  });
  const cfg={
    type:'line',
    data:{labels,datasets:[
      {label:'توليد',data:rows.map(d=>d.generates),
       borderColor:'rgba(107,51,32,.85)',backgroundColor:'rgba(107,51,32,.07)',
       borderWidth:2.5,pointRadius:3,pointHoverRadius:5,
       pointBackgroundColor:'rgba(107,51,32,.85)',tension:.4,fill:true},
      {label:'تحميل',data:rows.map(d=>d.downloads),
       borderColor:'rgba(74,124,89,.85)',backgroundColor:'rgba(74,124,89,.06)',
       borderWidth:2.5,pointRadius:3,pointHoverRadius:5,
       pointBackgroundColor:'rgba(74,124,89,.85)',tension:.4,fill:true}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'top',rtl:true,labels:{font:{family:'Cairo',size:11,weight:'600'},color:'#3A1C0C',boxWidth:10,boxHeight:10,borderRadius:3}},
        tooltip:{rtl:true,titleFont:{family:'Cairo'},bodyFont:{family:'Cairo'},backgroundColor:'rgba(250,244,236,.96)',titleColor:'#3A1C0C',bodyColor:'#3A1C0C',borderColor:'#E0CDB4',borderWidth:1,padding:10}
      },
      scales:{
        x:{ticks:{font:{family:'Cairo',size:10},color:'#A07858',maxRotation:0},grid:{display:false}},
        y:{ticks:{font:{family:'Cairo',size:10},color:'#A07858',stepSize:1},grid:{color:'rgba(212,184,152,.2)'},beginAtZero:true}
      }
    }
  };
  if(timeChart){timeChart.data=cfg.data;timeChart.options=cfg.options;timeChart.update('active');}
  else{timeChart=new Chart(document.getElementById('time-chart'),cfg);}
}

function switchPeriod(p,btn){
  currentPeriod=p;
  document.querySelectorAll('.period-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if(statsData) renderTimeChart(statsData,p);
}

/* ── Table ── */
function renderTable(events){
  const tbody=document.getElementById('events-tbody');
  document.getElementById('tbl-count').textContent=`${events?.length??0} سجل`;
  if(!events?.length){tbody.innerHTML=`<tr><td colspan="5"><div class="empty-state">${IC.empty}<span>لا توجد أحداث بعد</span></div></td></tr>`;return;}
  tbody.innerHTML=events.map(e=>`
    <tr>
      <td style="color:var(--muted);font-size:10px">${e.id}</td>
      <td><strong>${escHtml(e.entered_name||'—')}</strong></td>
      <td>${escHtml(e.template_name||'—')}</td>
      <td><span class="badge badge-${e.action}">${e.action==='generate'?'توليد':'تحميل'}</span></td>
      <td style="color:var(--muted);font-size:10px;direction:ltr;text-align:left">${formatDate(e.created_at)}</td>
    </tr>`).join('');
}

/* ── Error ── */
function showError(msg){
  document.getElementById('stat-cards').innerHTML=`
    <div class="stat-card" style="grid-column:1/-1;padding:16px;gap:10px">
      <div class="stat-icon" style="background:rgba(185,64,64,.1);color:#B94040">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-body"><div class="stat-label" style="color:#B94040">تعذّر الاتصال بـ Supabase</div><div class="stat-sub">${msg||''}</div></div>
    </div>`;
}

/* ── Helpers ── */
function getWeek(d){const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()+4-day);const y=new Date(Date.UTC(date.getUTCFullYear(),0,1));return Math.ceil((((date-y)/86400000)+1)/7);}
function formatDay(s){if(!s)return'';const d=new Date(s);return`${d.getDate()}/${d.getMonth()+1}`;}
function formatMonth(s){if(!s)return'';const m=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];return m[parseInt(s.split('-')[1],10)-1]||s;}
function formatDate(s){if(!s)return'';return s.replace('T',' ').slice(0,16);}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

loadStats();
setInterval(loadStats,30_000);

/* ═══════════════════════════════════════════════════════
   dashboard.js v2 — SVG icons + Line chart
═══════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xnpubpmwwalvknrtrmjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHVicG13d2FsdmtucnRybWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTAyNjcsImV4cCI6MjA4OTI4NjI2N30.-uSLztdMSUejcOWG_Hdy6XSRNRG-DK6_8x6CNXFv78M';

const SB_HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json'
};

/* SVG Icons */
const IC = {
  gen:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  dl:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  usr:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  top:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  empty:`<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
};

let statsData     = null;
let timeChart     = null;
let currentPeriod = 'daily';

/* ── Load ── */
async function loadStats() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=2000`,
      { headers: SB_HEADERS }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    statsData = processEvents(await res.json());
    renderStatCards(statsData);
    renderTemplateBars(statsData.byTemplate);
    renderTimeChart(statsData, currentPeriod);
    renderTable(statsData.recent);
  } catch (e) { showError(e.message); }
  finally { btn.classList.remove('spinning'); }
}

/* ── Process ── */
function processEvents(events) {
  if (!events?.length) return {
    totals:{total_generates:0,total_downloads:0,unique_visitors:0},
    byTemplate:[],daily:[],weekly:[],monthly:[],recent:[]
  };

  const totals = {
    total_generates: events.filter(e=>e.action==='generate').length,
    total_downloads: events.filter(e=>e.action==='download').length,
    unique_visitors: new Set(events.map(e=>e.session_id).filter(Boolean)).size
  };

  const tm={};
  events.forEach(e=>{
    if(!tm[e.template_id]) tm[e.template_id]={template_id:e.template_id,template_name:e.template_name,generates:0,downloads:0};
    if(e.action==='generate') tm[e.template_id].generates++;
    if(e.action==='download') tm[e.template_id].downloads++;
  });
  const byTemplate=Object.values(tm).sort((a,b)=>b.generates-a.generates);

  /* daily */
  const dm={};
  const now=new Date();
  for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);dm[k]={day:k,generates:0,downloads:0};}
  events.forEach(e=>{const d=(e.created_at||'').slice(0,10);if(dm[d]){if(e.action==='generate')dm[d].generates++;if(e.action==='download')dm[d].downloads++;}});
  const daily=Object.values(dm);

  /* weekly */
  const wm={};
  events.forEach(e=>{const d=new Date(e.created_at);const w=`${d.getFullYear()}-W${String(getWeek(d)).padStart(2,'0')}`;if(!wm[w])wm[w]={week:w,generates:0,downloads:0};if(e.action==='generate')wm[w].generates++;if(e.action==='download')wm[w].downloads++;});
  const weekly=Object.values(wm).sort((a,b)=>a.week>b.week?1:-1).slice(-8);

  /* monthly */
  const mm={};
  events.forEach(e=>{const m=(e.created_at||'').slice(0,7);if(!mm[m])mm[m]={month:m,generates:0,downloads:0};if(e.action==='generate')mm[m].generates++;if(e.action==='download')mm[m].downloads++;});
  const monthly=Object.values(mm).sort((a,b)=>a.month>b.month?1:-1).slice(-6);

  return {totals,byTemplate,daily,weekly,monthly,recent:events.slice(0,50)};
}

/* ── Stat Cards ── */
function renderStatCards({totals,byTemplate}) {
  const top=byTemplate?.[0];
  const cards=[
    {ic:IC.gen,  hl:true,  label:'إجمالي التوليدات',    value:totals.total_generates, sub:'بطاقة مولّدة'},
    {ic:IC.dl,   hl:false, label:'إجمالي التحميلات',    value:totals.total_downloads, sub:'بطاقة محمّلة'},
    {ic:IC.usr,  hl:false, label:'الزوار الفريدون',     value:totals.unique_visitors,  sub:'جلسة مختلفة'},
    {ic:IC.top,  hl:false, label:'أكثر قالب استخداماً', value:top?top.template_name:'—', sub:top?`${top.generates} توليد`:'لا بيانات'},
  ];
  document.getElementById('stat-cards').innerHTML=cards.map(c=>`
    <div class="stat-card ${c.hl?'highlight':''}">
      <div class="stat-icon">${c.ic}</div>
      <div class="stat-body">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>
    </div>`).join('');
}

/* ── Template Bars ── */
function renderTemplateBars(bt) {
  const el=document.getElementById('tmpl-bars');
  if(!bt?.length){el.innerHTML=`<div class="empty-state">${IC.empty}<span>لا توجد بيانات</span></div>`;return;}
  const max=Math.max(...bt.map(t=>t.generates),1);
  el.innerHTML=bt.map(t=>`
    <div class="tmpl-bar-row">
      <div class="tmpl-bar-label"><strong>${escHtml(t.template_name)}</strong><span>${t.generates} توليد · ${t.downloads} تحميل</span></div>
      <div class="tmpl-bar-track"><div class="tmpl-bar-fill" style="width:0%" data-target="${Math.round(t.generates/max*100)}%"></div></div>
    </div>`).join('');
  requestAnimationFrame(()=>{document.querySelectorAll('.tmpl-bar-fill').forEach(e=>{e.style.width=e.dataset.target;});});
}

/* ── Line Chart ── */
function renderTimeChart(data,period) {
  const rows=data[period]||[];
  const labels=rows.map(d=>{
    if(period==='daily')   return formatDay(d.day);
    if(period==='weekly')  return (d.week||'').replace('W','أسبوع ');
    if(period==='monthly') return formatMonth(d.month);
    return '';
  });
  const cfg={
    type:'line',
    data:{labels,datasets:[
      {label:'توليد',data:rows.map(d=>d.generates),
       borderColor:'rgba(107,51,32,.85)',backgroundColor:'rgba(107,51,32,.07)',
       borderWidth:2.5,pointRadius:3,pointHoverRadius:5,
       pointBackgroundColor:'rgba(107,51,32,.85)',tension:.4,fill:true},
      {label:'تحميل',data:rows.map(d=>d.downloads),
       borderColor:'rgba(74,124,89,.85)',backgroundColor:'rgba(74,124,89,.06)',
       borderWidth:2.5,pointRadius:3,pointHoverRadius:5,
       pointBackgroundColor:'rgba(74,124,89,.85)',tension:.4,fill:true}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'top',rtl:true,labels:{font:{family:'Cairo',size:11,weight:'600'},color:'#3A1C0C',boxWidth:10,boxHeight:10,borderRadius:3}},
        tooltip:{rtl:true,titleFont:{family:'Cairo'},bodyFont:{family:'Cairo'},backgroundColor:'rgba(250,244,236,.96)',titleColor:'#3A1C0C',bodyColor:'#3A1C0C',borderColor:'#E0CDB4',borderWidth:1,padding:10}
      },
      scales:{
        x:{ticks:{font:{family:'Cairo',size:10},color:'#A07858',maxRotation:0},grid:{display:false}},
        y:{ticks:{font:{family:'Cairo',size:10},color:'#A07858',stepSize:1},grid:{color:'rgba(212,184,152,.2)'},beginAtZero:true}
      }
    }
  };
  if(timeChart){timeChart.data=cfg.data;timeChart.options=cfg.options;timeChart.update('active');}
  else{timeChart=new Chart(document.getElementById('time-chart'),cfg);}
}

function switchPeriod(p,btn){
  currentPeriod=p;
  document.querySelectorAll('.period-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if(statsData) renderTimeChart(statsData,p);
}

/* ── Table ── */
function renderTable(events){
  const tbody=document.getElementById('events-tbody');
  document.getElementById('tbl-count').textContent=`${events?.length??0} سجل`;
  if(!events?.length){tbody.innerHTML=`<tr><td colspan="5"><div class="empty-state">${IC.empty}<span>لا توجد أحداث بعد</span></div></td></tr>`;return;}
  tbody.innerHTML=events.map(e=>`
    <tr>
      <td style="color:var(--muted);font-size:10px">${e.id}</td>
      <td><strong>${escHtml(e.entered_name||'—')}</strong></td>
      <td>${escHtml(e.template_name||'—')}</td>
      <td><span class="badge badge-${e.action}">${e.action==='generate'?'توليد':'تحميل'}</span></td>
      <td style="color:var(--muted);font-size:10px;direction:ltr;text-align:left">${formatDate(e.created_at)}</td>
    </tr>`).join('');
}

/* ── Error ── */
function showError(msg){
  document.getElementById('stat-cards').innerHTML=`
    <div class="stat-card" style="grid-column:1/-1;padding:16px;gap:10px">
      <div class="stat-icon" style="background:rgba(185,64,64,.1);color:#B94040">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-body"><div class="stat-label" style="color:#B94040">تعذّر الاتصال بـ Supabase</div><div class="stat-sub">${msg||''}</div></div>
    </div>`;
}

/* ── Helpers ── */
function getWeek(d){const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()+4-day);const y=new Date(Date.UTC(date.getUTCFullYear(),0,1));return Math.ceil((((date-y)/86400000)+1)/7);}
function formatDay(s){if(!s)return'';const d=new Date(s);return`${d.getDate()}/${d.getMonth()+1}`;}
function formatMonth(s){if(!s)return'';const m=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];return m[parseInt(s.split('-')[1],10)-1]||s;}
function formatDate(s){if(!s)return'';return s.replace('T',' ').slice(0,16);}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

loadStats();
setInterval(loadStats,30_000);

/* ═══════════════════════════════════════
   تصدير Excel — شيتات منفصلة + تنسيق
═══════════════════════════════════════ */
function exportCSV() {
  if (!statsData) { alert('لا توجد بيانات بعد.'); return; }

  const wb = XLSX.utils.book_new();

  /* ── ألوان وأنماط مشتركة ── */
  const HEAD_STYLE = {
    fill:  { fgColor: { rgb: '6B3320' } },
    font:  { bold: true, color: { rgb: 'FAF4EC' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
    border: { bottom: { style: 'thin', color: { rgb: 'E0CDB4' } } }
  };

  const TITLE_STYLE = {
    fill:  { fgColor: { rgb: 'F0E6D3' } },
    font:  { bold: true, color: { rgb: '3A1C0C' }, sz: 13 },
    alignment: { horizontal: 'right', readingOrder: 2 }
  };

  const ROW_ODD = {
    fill: { fgColor: { rgb: 'FAF4EC' } },
    alignment: { horizontal: 'center', readingOrder: 2 },
    border: { bottom: { style: 'thin', color: { rgb: 'E0CDB4' } } }
  };

  const ROW_EVEN = {
    fill: { fgColor: { rgb: 'F7F0E6' } },
    alignment: { horizontal: 'center', readingOrder: 2 },
    border: { bottom: { style: 'thin', color: { rgb: 'E0CDB4' } } }
  };

  const HIGHLIGHT = {
    fill: { fgColor: { rgb: '6B3320' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 }
  };

  /* ════════════════════════════════════
     شيت ١ — الإجماليات
  ════════════════════════════════════ */
  function makeSheet1() {
    const { totals } = statsData;
    const ws = {};

    /* عنوان رئيسي */
    ws['A1'] = { v: '📊 ملخص الإجماليات', t: 's', s: TITLE_STYLE };
    ws['A2'] = { v: '', t: 's' };

    /* رؤوس */
    const headers = ['إجمالي التوليدات', 'إجمالي التحميلات', 'الزوار الفريدون'];
    ['A3','B3','C3'].forEach((cell, i) => {
      ws[cell] = { v: headers[i], t: 's', s: HEAD_STYLE };
    });

    /* قيم */
    ws['A4'] = { v: totals.total_generates, t: 'n', s: HIGHLIGHT };
    ws['B4'] = { v: totals.total_downloads, t: 'n', s: HIGHLIGHT };
    ws['C4'] = { v: totals.unique_visitors,  t: 'n', s: HIGHLIGHT };

    ws['!ref']  = 'A1:C4';
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 20 }];
    ws['!rows'] = [{ hpt: 30 }, { hpt: 8 }, { hpt: 24 }, { hpt: 32 }];
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:2} }];

    return ws;
  }

  /* ════════════════════════════════════
     شيت ٢ — استخدام القوالب
  ════════════════════════════════════ */
  function makeSheet2() {
    const { byTemplate } = statsData;
    const ws = {};

    ws['A1'] = { v: '🎨 استخدام القوالب', t: 's', s: TITLE_STYLE };

    const headers = ['القالب', 'التوليدات', 'التحميلات', 'المجموع'];
    ['A3','B3','C3','D3'].forEach((cell, i) => {
      ws[cell] = { v: headers[i], t: 's', s: HEAD_STYLE };
    });

    byTemplate.forEach((t, i) => {
      const row  = i + 4;
      const st   = i % 2 === 0 ? ROW_ODD : ROW_EVEN;
      ws[`A${row}`] = { v: t.template_name,              t: 's', s: st };
      ws[`B${row}`] = { v: t.generates,                   t: 'n', s: st };
      ws[`C${row}`] = { v: t.downloads,                   t: 'n', s: st };
      ws[`D${row}`] = { v: t.generates + t.downloads,     t: 'n', s: st };
    });

    const last = byTemplate.length + 3;
    ws['!ref']  = `A1:D${last}`;
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    ws['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }];
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:3} }];

    return ws;
  }

  /* ════════════════════════════════════
     شيت ٣ — السجل الكامل
  ════════════════════════════════════ */
  function makeSheet3() {
    const { recent } = statsData;
    const ws = {};

    ws['A1'] = { v: '📋 السجل الكامل للأحداث', t: 's', s: TITLE_STYLE };

    const headers = ['#', 'الاسم المدخل', 'القالب', 'الإجراء', 'التاريخ والوقت'];
    ['A3','B3','C3','D3','E3'].forEach((cell, i) => {
      ws[cell] = { v: headers[i], t: 's', s: HEAD_STYLE };
    });

    recent.forEach((e, i) => {
      const row    = i + 4;
      const st     = i % 2 === 0 ? ROW_ODD : ROW_EVEN;
      const action = e.action === 'generate' ? 'توليد' : 'تحميل';
      const date   = (e.created_at || '').replace('T', ' ').slice(0, 16);

      /* لون مختلف للتحميل */
      const actionStyle = e.action === 'download'
        ? { ...st, font: { color: { rgb: '4A7C59' }, bold: true } }
        : { ...st, font: { color: { rgb: '6B3320' }, bold: true } };

      ws[`A${row}`] = { v: e.id,               t: 'n', s: st };
      ws[`B${row}`] = { v: e.entered_name||'—', t: 's', s: st };
      ws[`C${row}`] = { v: e.template_name||'—',t: 's', s: st };
      ws[`D${row}`] = { v: action,              t: 's', s: actionStyle };
      ws[`E${row}`] = { v: date,                t: 's', s: { ...st, alignment:{ horizontal:'left' } } };
    });

    const last = recent.length + 3;
    ws['!ref']  = `A1:E${last}`;
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 20 }];
    ws['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }];
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:4} }];

    return ws;
  }

  /* ── أضف الشيتات للـ workbook ── */
  XLSX.utils.book_append_sheet(wb, makeSheet1(), '📊 الإجماليات');
  XLSX.utils.book_append_sheet(wb, makeSheet2(), '🎨 القوالب');
  XLSX.utils.book_append_sheet(wb, makeSheet3(), '📋 السجل');

  /* ── تنزيل الملف ── */
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `تقرير-المعايدات-${date}.xlsx`, { bookType: 'xlsx', cellStyles: true });
}

