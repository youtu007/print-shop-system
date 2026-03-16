// server/routes/admin.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const hash = (p) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex'); };

// Dashboard summary
router.get('/dashboard', requireAuth, (req, res) => {
  const onlinePrinters = db.prepare("SELECT COUNT(*) as c FROM printers WHERE status = 'online'").get().c;
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayJobs = db.prepare('SELECT COUNT(*) as c FROM print_jobs WHERE created_at >= ?').get(todayStart.getTime()).c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status != 'delivered'").get().c;
  const totalGroups = db.prepare('SELECT COUNT(*) as c FROM photo_groups').get().c;
  res.json({ online_printers: onlinePrinters, today_jobs: todayJobs, pending_orders: pendingOrders, total_groups: totalGroups });
});

// List admins (super only)
router.get('/admins', requireAuth, requireRole('super'), (req, res) => {
  res.json(db.prepare('SELECT id, username, role, created_at FROM admins').all());
});

// Create sub-admin (super only)
router.post('/admins', requireAuth, requireRole('super'), (req, res) => {
  const { username, password, role } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO admins VALUES (?,?,?,?,?)').run(id, username, hash(password), role, Date.now());
    res.json({ id, username, role });
  } catch {
    res.status(400).json({ error: 'username already exists' });
  }
});

// Assign printer access
router.put('/admins/:id/access', requireAuth, requireRole('super'), (req, res) => {
  const { printer_ids } = req.body;
  db.prepare('DELETE FROM admin_printer_access WHERE admin_id = ?').run(req.params.id);
  const ins = db.prepare('INSERT INTO admin_printer_access VALUES (?,?)');
  (printer_ids || []).forEach(pid => ins.run(req.params.id, pid));
  res.json({ ok: true });
});

module.exports = router;
