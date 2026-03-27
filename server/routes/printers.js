// server/routes/printers.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

async function canAccessPrinter(admin, printerId) {
  if (admin.role === 'super' || admin.role === 'shop_op') return true;
  const row = await db.get(
    'SELECT 1 FROM admin_printer_access WHERE admin_id=? AND printer_id=?',
    [admin.id, printerId]
  );
  return !!row;
}

// Public: list printers for customer-facing pages
router.get('/public', async (req, res) => {
  try {
    const printers = await db.all(
      'SELECT id,name,location,status,paper_remaining,printer_type,connection_type FROM printers WHERE is_active = 1'
    );
    res.json(printers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: list printers (filtered by permission for printer_op)
router.get('/', requireAuth, async (req, res) => {
  try {
    let printers;
    if (req.admin.role === 'super' || req.admin.role === 'shop_op') {
      printers = await db.all('SELECT * FROM printers');
    } else {
      printers = await db.all(
        `SELECT p.* FROM printers p
         JOIN admin_printer_access a ON p.id = a.printer_id
         WHERE a.admin_id = ?`,
        [req.admin.id]
      );
    }
    res.json(printers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!(await canAccessPrinter(req.admin, req.params.id))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const p = await db.get('SELECT * FROM printers WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, requireRole('super'), async (req, res) => {
  try {
    const { name, location, ip_address, printer_type, connection_type, is_active } = req.body;
    const id = uuidv4();
    await db.run('INSERT INTO printers VALUES (?,?,?,?,?,?,?,?,?,?)', [
      id, name, location, 'offline', 500, Date.now(),
      ip_address || '', printer_type || 'doc', connection_type || 'network',
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);
    const printer = await db.get('SELECT * FROM printers WHERE id = ?', [id]);
    res.json(printer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!(await canAccessPrinter(req.admin, req.params.id))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { status, paper_remaining, ip_address, printer_type, connection_type, is_active } = req.body;
    const p = await db.get('SELECT * FROM printers WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'not found' });

    if (status !== undefined) {
      await db.run('UPDATE printers SET status=?, last_heartbeat=? WHERE id=?', [status, Date.now(), req.params.id]);
    }
    if (paper_remaining !== undefined) {
      await db.run('UPDATE printers SET paper_remaining=? WHERE id=?', [paper_remaining, req.params.id]);
    }
    if (ip_address !== undefined) {
      await db.run('UPDATE printers SET ip_address=? WHERE id=?', [ip_address, req.params.id]);
    }
    if (printer_type !== undefined) {
      await db.run('UPDATE printers SET printer_type=? WHERE id=?', [printer_type, req.params.id]);
    }
    if (connection_type !== undefined) {
      await db.run('UPDATE printers SET connection_type=? WHERE id=?', [connection_type, req.params.id]);
    }
    if (is_active !== undefined) {
      await db.run('UPDATE printers SET is_active=? WHERE id=?', [is_active ? 1 : 0, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM printers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, requireRole('super'), async (req, res) => {
  try {
    await db.run('DELETE FROM printers WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test printer connection
router.post('/test', requireAuth, requireRole('super', 'printer_op'), (req, res) => {
  const { ip_address, connection_type } = req.body;
  if (!ip_address) return res.status(400).json({ error: '请输入IP地址' });

  if (connection_type === 'network') {
    const testReq = http.request(
      { hostname: ip_address, port: 80, method: 'GET', timeout: 5000 },
      (testRes) => {
        testRes.resume();
        testRes.on('end', () => res.json({ success: true, message: '打印机连接成功' }));
      }
    );
    testReq.on('error', () => res.json({ success: false, message: '无法连接到打印机，请检查IP地址是否正确' }));
    testReq.on('timeout', () => { testReq.destroy(); res.json({ success: false, message: '连接超时，请检查网络' }); });
    testReq.end();
  } else {
    res.json({ success: true, message: `${connection_type}连接请在客户端配置` });
  }
});

module.exports = router;
