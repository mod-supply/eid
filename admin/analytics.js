/* ═══════════════════════════════════════════════════════
   analytics.js
   أضف هذا الملف في index.html قبل app.js:
   <script src="analytics.js"></script>

   ثم في app.js أضف سطرين فقط:
   1. بعد generateCard    → trackEvent('generate', selectedTemplate, name)
   2. بعد downloadCard    → trackEvent('download', selectedTemplate, nameInp.value)
═══════════════════════════════════════════════════════ */

/* session مجهول — يُنشأ مرة واحدة لكل متصفح */
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

/**
 * trackEvent
 * @param {'generate'|'download'} action  نوع الحدث
 * @param {{ id, label }} template        القالب المختار
 * @param {string} enteredName            الاسم المدخل
 */
async function trackEvent(action, template, enteredName) {
  if (!template) return;
  try {
    await fetch('/api/track', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': _GC_SESSION
      },
      body: JSON.stringify({
        templateId:   template.id,
        templateName: template.label,
        enteredName:  (enteredName || '').trim() || '—',
        action
      })
    });
  } catch (_) {
    /* إذا السيرفر ما شغّال — تجاهل بصمت، الموقع يكمل */
  }
}
