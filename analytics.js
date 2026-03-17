/* ═══════════════════════════════════════════════════════
   analytics.js — يرسل الأحداث لـ Supabase مباشرة
═══════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xnpubpmwwalvknrtrmjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHVicG13d2FsdmtucnRybWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTAyNjcsImV4cCI6MjA4OTI4NjI2N30.-uSLztdMSUejcOWG_Hdy6XSRNRG-DK6_8x6CNXFv78M'; // ← ضع هنا الـ anon key من Legacy

const _GC_SESSION = (() => {
  let id = sessionStorage.getItem('_gc_sid');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('_gc_sid', id);
  }
  return id;
})();

async function trackEvent(action, template, enteredName) {
  if (!template) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify({
        session_id:    _GC_SESSION,
        template_id:   template.id,
        template_name: template.label,
        entered_name:  (enteredName || '').trim() || '—',
        action
      })
    });
  } catch (_) {}
}
```

---

**الملف يُحفظ في:**
```
معايدة الامداد/
├── analytics.js   ← هنا، جنب index.html
