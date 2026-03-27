// server/routes/shop.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Buffer.from(file.originalname, 'latin1').toString('utf8')}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Upload file and detect page count
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileUrl = `/uploads/${req.file.filename}`;
    let pageCount = 1;
    let previewUrl = null;

    if (ext === '.pdf') {
      const { PDFDocument } = require('pdf-lib');
      const buf = fs.readFileSync(req.file.path);
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount() || 1;
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      pageCount = 1;
      try {
        const sharp = require('sharp');
        const thumbName = `thumb-${req.file.filename}.jpg`;
        await sharp(req.file.path).resize(400, 400, { fit: 'inside' }).jpeg({ quality: 80 }).toFile(path.join(uploadsDir, thumbName));
        previewUrl = `/uploads/${thumbName}`;
      } catch(e) {}
    }

    res.json({ file_url: fileUrl, file_name: req.file.originalname, page_count: pageCount, preview_url: previewUrl, file_size: req.file.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: product list
router.get('/products', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM shop_products'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: create product
router.post('/products', requireAuth, requireRole('super', 'shop_op'), async (req, res) => {
  try {
    const { name, description, price, image_url, need_file, file_type, price_unit } = req.body;
    const id = uuidv4();
    await db.run('INSERT INTO shop_products VALUES (?,?,?,?,?,?,?,?)', [id, name, description || '', price, image_url || null, need_file ? 1 : 0, file_type || 'doc', price_unit || 'per_item']);
    res.json(await db.get('SELECT * FROM shop_products WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: edit product
router.put('/products/:id', requireAuth, requireRole('super', 'shop_op'), async (req, res) => {
  try {
    const { name, description, price, image_url, need_file, file_type, price_unit } = req.body;
    await db.run(
      'UPDATE shop_products SET name=?, description=?, price=?, image_url=?, need_file=?, file_type=?, price_unit=? WHERE id=?',
      [name, description, price, image_url, need_file ? 1 : 0, file_type || 'doc', price_unit || 'per_item', req.params.id]
    );
    res.json(await db.get('SELECT * FROM shop_products WHERE id = ?', [req.params.id]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete product
router.delete('/products/:id', requireAuth, requireRole('super', 'shop_op'), async (req, res) => {
  try {
    await db.run('DELETE FROM shop_products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: place order
router.post('/orders', async (req, res) => {
  try {
    const { customer_name, phone, address, items, total_price } = req.body;
    const id = uuidv4();
    await db.run(
      'INSERT INTO shop_orders VALUES (?,?,?,?,?,?,?,?,?)',
      [id, customer_name, phone, address, JSON.stringify(items), total_price, 0, 'packing', Date.now()]
    );
    const order = await db.get('SELECT * FROM shop_orders WHERE id = ?', [id]);
    res.json({ ...order, items: JSON.parse(order.items) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: confirm delivery
router.post('/orders/:id/confirm', async (req, res) => {
  try {
    const order = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not found' });
    if (order.delivery_status !== 'shipping') {
      return res.status(400).json({ error: '订单不在配送中' });
    }
    await db.run('UPDATE shop_orders SET delivery_status = ? WHERE id = ?', ['delivered', req.params.id]);
    const updated = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    res.json({ ...updated, items: JSON.parse(updated.items) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: pay for order (mock)
router.post('/orders/:id/pay', async (req, res) => {
  try {
    const order = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'not found' });
    if (order.is_paid === 1) return res.status(400).json({ error: 'already paid' });
    await db.run('UPDATE shop_orders SET is_paid = 1 WHERE id = ?', [req.params.id]);
    const updated = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    res.json({ ...updated, items: JSON.parse(updated.items) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: get orders by phone number
router.get('/orders/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json([]);
    const orders = await db.all('SELECT * FROM shop_orders WHERE phone = ? ORDER BY created_at DESC', [phone]);
    res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: single order status
router.get('/orders/:id', async (req, res) => {
  try {
    const o = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    if (!o) return res.status(404).json({ error: 'not found' });
    res.json({ ...o, items: JSON.parse(o.items) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: batch get orders by ids
router.get('/orders/batch', async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    if (!ids.length) return res.json([]);
    const placeholders = ids.map(() => '?').join(',');
    const orders = await db.all(`SELECT * FROM shop_orders WHERE id IN (${placeholders})`, ids);
    res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: list orders
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM shop_orders ORDER BY created_at DESC');
    res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete order
router.delete('/orders/:id', requireAuth, requireRole('super', 'shop_op', 'delivery_op'), async (req, res) => {
  try {
    await db.run('DELETE FROM shop_orders WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: update delivery status
router.put('/orders/:id', requireAuth, requireRole('super', 'shop_op', 'delivery_op'), async (req, res) => {
  try {
    const { delivery_status } = req.body;
    await db.run('UPDATE shop_orders SET delivery_status = ? WHERE id = ?', [delivery_status, req.params.id]);
    const order = await db.get('SELECT * FROM shop_orders WHERE id = ?', [req.params.id]);
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: get banners
router.get('/banners', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM banners ORDER BY sort ASC'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: create banner
router.post('/banners', requireAuth, requireRole('super', 'shop_op'), async (req, res) => {
  try {
    const { image_url, link, sort } = req.body;
    const id = uuidv4();
    await db.run('INSERT INTO banners VALUES (?,?,?,?,?)', [id, image_url, link || '', sort || 0, Date.now()]);
    res.json(await db.get('SELECT * FROM banners WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete banner
router.delete('/banners/:id', requireAuth, requireRole('super', 'shop_op'), async (req, res) => {
  try {
    await db.run('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
