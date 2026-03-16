/*
  ═══════════════════════════════════════════════════════
  مولد المعايدات — server.js
  Node.js + Express + SQLite (better-sqlite3)

  التشغيل:
    npm install
    node server.js

  الموقع العام:   http://localhost:3000
  لوحة الإدارة:   http://localhost:3000/admin
  ═══════════════════════════════════════════════════════
*/

const express  = require('express');
const Database = require('better-sqlite3');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── قاعدة البيانات ─── */
const db = new Database(path.join(__dirname, 'analytics.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT    NOT NULL,
    template_id   INTEGER NOT NULL,
    template_name TEXT    NOT NULL,
    entered_name  TEXT    NOT NULL,
    action        TEXT    NOT NULL CHECK(action IN ('generate','download')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_action     ON events(action);
  CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_template   ON events(template_id);
`);

/* ─── Middleware ─── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ════════════════════════════════════════════
   POST /api/track
   يستقبل حدث توليد أو تحميل ويحفظه في DB
   Body: { templateId, templateName, enteredName, action }
════════════════════════════════════════════ */
app.post('/api/track', (req, res) => {
  try {
    const { templateId, templateName, enteredName, action } = req.body;

    if (!templateId || !templateName || !enteredName || !action)
      return res.status(400).json({ error: 'بيانات ناقصة' });

    if (!['generate', 'download'].includes(action))
      return res.status(400).json({ error: 'action غير صحيح' });

    /* session مجهول من الـ header أو نولّد جديد */
    const sessionId = req.headers['x-session-id'] || crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO events (session_id, template_id, template_name, entered_name, action)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(sessionId, templateId, templateName, enteredName, action);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('[track error]', err.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* ════════════════════════════════════════════
   GET /api/stats
   يرجع كل الإحصائيات للوحة الإدارة
════════════════════════════════════════════ */
app.get('/api/stats', (req, res) => {
  try {
    /* الإجماليات */
    const totals = db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE action='generate') AS total_generates,
        COUNT(*) FILTER (WHERE action='download') AS total_downloads,
        COUNT(DISTINCT session_id)                AS unique_visitors
      FROM events
    `).get();

    /* استخدام كل قالب */
    const byTemplate = db.prepare(`
      SELECT
        template_id,
        template_name,
        COUNT(*) FILTER (WHERE action='generate') AS generates,
        COUNT(*) FILTER (WHERE action='download') AS downloads
      FROM events
      GROUP BY template_id, template_name
      ORDER BY generates DESC
    `).all();

    /* يومي — آخر 14 يوم */
    const daily = db.prepare(`
      SELECT
        date(created_at) AS day,
        COUNT(*) FILTER (WHERE action='generate') AS generates,
        COUNT(*) FILTER (WHERE action='download') AS downloads
      FROM events
      WHERE date(created_at) >= date('now','-13 days','localtime')
      GROUP BY day
      ORDER BY day ASC
    `).all();

    /* أسبوعي — آخر 8 أسابيع */
    const weekly = db.prepare(`
      SELECT
        strftime('%Y-W%W', created_at) AS week,
        COUNT(*) FILTER (WHERE action='generate') AS generates,
        COUNT(*) FILTER (WHERE action='download') AS downloads
      FROM events
      WHERE date(created_at) >= date('now','-55 days')
      GROUP BY week
      ORDER BY week ASC
    `).all();

    /* شهري — آخر 6 أشهر */
    const monthly = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        COUNT(*) FILTER (WHERE action='generate') AS generates,
        COUNT(*) FILTER (WHERE action='download') AS downloads
      FROM events
      WHERE date(created_at) >= date('now','-180 days')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    /* آخر 50 حدث */
    const recent = db.prepare(`
      SELECT id, template_id, template_name, entered_name, action, created_at
      FROM events
      ORDER BY id DESC
      LIMIT 50
    `).all();

    res.json({ totals, byTemplate, daily, weekly, monthly, recent });
  } catch (err) {
    console.error('[stats error]', err.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* ─── إعادة توجيه /admin → admin.html ─── */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅  الموقع: http://localhost:${PORT}`);
  console.log(`📊  الإدارة: http://localhost:${PORT}/admin\n`);
});
