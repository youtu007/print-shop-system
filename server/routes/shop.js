// server/routes/shop.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public: product list
router.get('/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM shop_products').all());
});

// Admin: create product
router.post('/products', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  const { name, description, price, image_url } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO shop_products VALUES (?,?,?,?,?)').run(id, name, description || '', price, image_url || null);
  res.json(db.prepare('SELECT * FROM shop_products WHERE id = ?').get(id));
});

// Admin: edit product
router.put('/products/:id', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  const { name, description, price, image_url } = req.body;
  db.prepare('UPDATE shop_products SET name=?, description=?, price=?, image_url=? WHERE id=?')
    .run(name, description, price, image_url, req.params.id);
  res.json(db.prepare('SELECT * FROM shop_products WHERE id = ?').get(req.params.id));
});

// Admin: delete product
router.delete('/products/:id', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  db.prepare('DELETE FROM shop_products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Public: place order (unpaid)
router.post('/orders', (req, res) => {
  const { customer_name, phone, address, items, total_price } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO shop_orders VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, customer_name, phone, address, JSON.stringify(items), total_price, 0, 'packing', Date.now()
  );
  const order = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(id);
  res.json({ ...order, items: JSON.parse(order.items) });
});

// Public: confirm delivery (用户确认收货)
router.post('/orders/:id/confirm', (req, res) => {
  const order = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (order.delivery_status !== 'shipping') {
    return res.status(400).json({ error: '订单不在配送中' });
  }
  db.prepare('UPDATE shop_orders SET delivery_status = ? WHERE id = ?').run('delivered', req.params.id);
  const updated = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  res.json({ ...updated, items: JSON.parse(updated.items) });
});

// Public: pay for order (mock)
router.post('/orders/:id/pay', (req, res) => {
  const order = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (order.is_paid === 1) return res.status(400).json({ error: 'already paid' });
  db.prepare('UPDATE shop_orders SET is_paid = 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  res.json({ ...updated, items: JSON.parse(updated.items) });
});

// Public: single order status
router.get('/orders/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json({ ...o, items: JSON.parse(o.items) });
});

// Public: batch get orders by ids
router.get('/orders/batch', (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : []
  if (!ids.length) return res.json([])
  const placeholders = ids.map(() => '?').join(',')
  const orders = db.prepare(`SELECT * FROM shop_orders WHERE id IN (${placeholders})`).all(...ids)
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })))
});

// Admin: list orders
router.get('/orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM shop_orders ORDER BY created_at DESC').all();
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// Admin: update delivery status
router.put('/orders/:id', requireAuth, requireRole('super', 'shop_op', 'delivery_op'), (req, res) => {
  const { delivery_status } = req.body;
  db.prepare('UPDATE shop_orders SET delivery_status = ? WHERE id = ?').run(delivery_status, req.params.id);
  res.json(db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id));
});

// Public: get banners
router.get('/banners', (req, res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort ASC').all());
});

// Admin: create banner
router.post('/banners', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  const { image_url, link, sort } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO banners VALUES (?,?,?,?,?)').run(id, image_url, link || '', sort || 0, Date.now());
  res.json(db.prepare('SELECT * FROM banners WHERE id = ?').get(id));
});

// Admin: delete banner
router.delete('/banners/:id', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
