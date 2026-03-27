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
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const role = req.admin.role;
    const result = {};

    if (role === 'super' || role === 'printer_op') {
      if (role === 'super') {
        const r1 = await db.get("SELECT COUNT(*) as c FROM printers WHERE status = 'online'");
        const r2 = await db.get('SELECT COUNT(*) as c FROM printers');
        result.online_printers = r1.c;
        result.total_printers = r2.c;
      } else {
        const accessRows = await db.all('SELECT printer_id FROM admin_printer_access WHERE admin_id = ?', [req.admin.id]);
        const accessIds = accessRows.map(r => r.printer_id);
        if (accessIds.length > 0) {
          const ph = accessIds.map(() => '?').join(',');
          const r1 = await db.get(`SELECT COUNT(*) as c FROM printers WHERE status = 'online' AND id IN (${ph})`, accessIds);
          result.online_printers = r1.c;
          result.total_printers = accessIds.length;
        } else {
          result.online_printers = 0;
          result.total_printers = 0;
        }
      }
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const r3 = await db.get('SELECT COUNT(*) as c FROM print_jobs WHERE created_at >= ?', [todayStart.getTime()]);
      const r4 = await db.get('SELECT COUNT(*) as c FROM photo_groups');
      result.today_jobs = r3.c;
      result.total_groups = r4.c;
    }

    if (role === 'super' || role === 'shop_op') {
      const r5 = await db.get("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status != 'delivered'");
      const r6 = await db.get('SELECT COUNT(*) as c FROM shop_products');
      result.pending_orders = r5.c;
      result.total_products = r6.c;
    }

    if (role === 'super' || role === 'delivery_op') {
      const r7 = await db.get("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'packing'");
      const r8 = await db.get("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'shipping'");
      const r9 = await db.get("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status = 'delivered'");
      result.packing_orders = r7.c;
      result.shipping_orders = r8.c;
      result.delivered_orders = r9.c;
    }

    if (role === 'super') {
      const r10 = await db.get('SELECT COUNT(*) as c FROM admins');
      result.total_admins = r10.c;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List admins (super only)
router.get('/admins', requireAuth, requireRole('super'), async (req, res) => {
  try {
    res.json(await db.all('SELECT id, username, role, created_at FROM admins'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create admin (super only)
router.post('/admins', requireAuth, requireRole('super'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'missing fields' });
    const id = uuidv4();
    await db.run('INSERT INTO admins VALUES (?,?,?,?,?)', [id, username, hash(password), role, Date.now()]);
    res.json({ id, username, role });
  } catch (e) {
    res.status(400).json({ error: 'username already exists' });
  }
});

// Delete admin (super only, cannot delete self)
router.delete('/admins/:id', requireAuth, requireRole('super'), async (req, res) => {
  try {
    if (req.params.id === req.admin.id) return res.status(400).json({ error: 'cannot delete yourself' });
    await db.run('DELETE FROM admin_printer_access WHERE admin_id = ?', [req.params.id]);
    await db.run('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Assign printer access (super only)
router.put('/admins/:id/access', requireAuth, requireRole('super'), async (req, res) => {
  try {
    const { printer_ids } = req.body;
    await db.run('DELETE FROM admin_printer_access WHERE admin_id = ?', [req.params.id]);
    for (const pid of (printer_ids || [])) {
      await db.run('INSERT INTO admin_printer_access VALUES (?,?)', [req.params.id, pid]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get printer access for an admin (super only)
router.get('/admins/:id/access', requireAuth, requireRole('super'), async (req, res) => {
  try {
    const rows = await db.all('SELECT printer_id FROM admin_printer_access WHERE admin_id = ?', [req.params.id]);
    res.json(rows.map(r => r.printer_id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
