// server/routes/admin.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const hash = (p) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex');
};

// Dashboard — role-adaptive statistics
router.get('/dashboard', requireAuth, (req, res) => {
  const role = req.admin.role;
  const result = {};

  if (role === 'super' || role === 'printer_op') {
    if (role === 'super') {
      result.online_printers = db.prepare("SELECT COUNT(*) as c FROM printers WHERE status = 'online'").get().c;
      result.total_printers = db.prepare("SELECT COUNT(*) as c FROM printers").get().c;
    } else {
      const accessIds = db.prepare('SELECT printer_id FROM admin_printer_access WHERE admin_id = ?').all(req.admin.id).map(r => r.printer_id);
      if (accessIds.length > 0) {
        const placeholders = accessIds.map(() => '?').join(',');
        result.online_printers = db.prepare(`SELECT COUNT(*) as c FROM printers WHERE status = 'online' AND id IN (${placeholders})`).get(...accessIds).c;
        result.total_printers = accessIds.length;
      } else {
        result.online_printers = 0;
        result.total_printers = 0;
      }
    }
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    result.today_jobs = db.prepare('SELECT COUNT(*) as c FROM print_jobs WHERE created_at >= ?').get(todayStart.getTime()).c;
    result.total_groups = db.prepare('SELECT COUNT(*) as c FROM photo_groups').get().c;
  }

  if (role === 'super' || role === 'shop_op') {
    result.pending_orders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status != 'delivered'").get().c;
    result.total_products = db.prepare("SELECT COUNT(*) as c FROM shop_products").get().c;
  }

  if (role === 'super' || role === 'delivery_op') {
    result.packing_orders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'packing'").get().c;
    result.shipping_orders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'shipping'").get().c;
    result.delivered_orders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'delivered'").get().c;
  }

  if (role === 'super') {
    result.total_admins = db.prepare("SELECT COUNT(*) as c FROM admins").get().c;
  }

  res.json(result);
});

// List admins (super only)
router.get('/admins', requireAuth, requireRole('super'), (req, res) => {
  res.json(db.prepare('SELECT id, username, role, created_at FROM admins').all());
});

// Create admin (super only)
router.post('/admins', requireAuth, requireRole('super'), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'missing fields' });
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO admins VALUES (?,?,?,?,?)').run(id, username, hash(password), role, Date.now());
    res.json({ id, username, role });
  } catch {
    res.status(400).json({ error: 'username already exists' });
  }
});

// Delete admin (super only, cannot delete self)
router.delete('/admins/:id', requireAuth, requireRole('super'), (req, res) => {
  if (req.params.id === req.admin.id) return res.status(400).json({ error: 'cannot delete yourself' });
  db.prepare('DELETE FROM admin_printer_access WHERE admin_id = ?').run(req.params.id);
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Assign printer access (super only)
router.put('/admins/:id/access', requireAuth, requireRole('super'), (req, res) => {
  const { printer_ids } = req.body;
  db.prepare('DELETE FROM admin_printer_access WHERE admin_id = ?').run(req.params.id);
  const ins = db.prepare('INSERT INTO admin_printer_access VALUES (?,?)');
  (printer_ids || []).forEach(pid => ins.run(req.params.id, pid));
  res.json({ ok: true });
});

// Get printer access for an admin (super only)
router.get('/admins/:id/access', requireAuth, requireRole('super'), (req, res) => {
  const rows = db.prepare('SELECT printer_id FROM admin_printer_access WHERE admin_id = ?').all(req.params.id);
  res.json(rows.map(r => r.printer_id));
});

module.exports = router;
