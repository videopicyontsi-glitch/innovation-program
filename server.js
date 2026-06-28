const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const db = new Database(path.join(DATA_DIR, 'progress.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    session_id INTEGER,
    domain TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT '',
    PRIMARY KEY (session_id, domain)
  );
  CREATE TABLE IF NOT EXISTS session_general (
    session_id INTEGER PRIMARY KEY,
    general_notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT ''
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all progress
app.get('/api/progress', (req, res) => {
  const rows = db.prepare('SELECT * FROM progress').all();
  const general = db.prepare('SELECT * FROM session_general').all();
  res.json({ rows, general });
});

// POST upsert progress for a session+domain
app.post('/api/progress', (req, res) => {
  const { session_id, domain, status, notes } = req.body;
  const now = new Date().toLocaleDateString('he-IL');
  db.prepare(`
    INSERT INTO progress (session_id, domain, status, notes, updated_at)
    VALUES (?,?,?,?,?)
    ON CONFLICT(session_id, domain) DO UPDATE SET
      status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at
  `).run(session_id, domain, status||'pending', notes||'', now);
  res.json({ ok: true });
});

// POST upsert general notes for a session
app.post('/api/progress/general', (req, res) => {
  const { session_id, general_notes } = req.body;
  const now = new Date().toLocaleDateString('he-IL');
  db.prepare(`
    INSERT INTO session_general (session_id, general_notes, updated_at)
    VALUES (?,?,?)
    ON CONFLICT(session_id) DO UPDATE SET
      general_notes=excluded.general_notes, updated_at=excluded.updated_at
  `).run(session_id, general_notes||'', now);
  res.json({ ok: true });
});

// POST verify admin password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ ok: true });
  else res.status(401).json({ ok: false, error: 'סיסמה שגויה' });
});

app.listen(PORT, () => console.log('Server running on port', PORT));
