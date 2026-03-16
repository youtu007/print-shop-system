// server/routes/printers.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

function canAccessPrinter(admin, printerId) {
  if (admin.role === 'super' || admin.role === 'shop_op') return true;
  return !!db.prepare('SELECT 1 FROM admin_printer_access WHERE admin_id=? AND printer_id=?').get(admin.id, printerId);
}

// Public: list printers for customer-facing pages
router.get('/public', (req, res) => {
  res.json(db.prepare("SELECT id,name,location,status,paper_remaining FROM printers").all());
});

// Admin: list printers (filtered by permission for printer_op)
router.get('/', requireAuth, (req, res) => {
  let printers;
  if (req.admin.role === 'super' || req.admin.role === 'shop_op') {
    printers = db.prepare('SELECT * FROM printers').all();
  } else {
    printers = db.prepare(`
      SELECT p.* FROM printers p
      JOIN admin_printer_access a ON p.id = a.printer_id
      WHERE a.admin_id = ?
    `).all(req.admin.id);
  }
  res.json(printers);
});

router.get('/:id', requireAuth, (req, res) => {
  if (!canAccessPrinter(req.admin, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const p = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

router.post('/', requireAuth, requireRole('super'), (req, res) => {
  const { name, location } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO printers VALUES (?,?,?,?,?,?)').run(id, name, location, 'offline', 500, Date.now());
  res.json(db.prepare('SELECT * FROM printers WHERE id = ?').get(id));
});

router.put('/:id', requireAuth, (req, res) => {
  if (!canAccessPrinter(req.admin, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const { status, paper_remaining } = req.body;
  const p = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (status) db.prepare('UPDATE printers SET status=?, last_heartbeat=? WHERE id=?').run(status, Date.now(), req.params.id);
  if (paper_remaining !== undefined) db.prepare('UPDATE printers SET paper_remaining=? WHERE id=?').run(paper_remaining, req.params.id);
  res.json(db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, requireRole('super'), (req, res) => {
  db.prepare('DELETE FROM printers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
