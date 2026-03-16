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

// Public: place order (auto-paid)
router.post('/orders', (req, res) => {
  const { customer_name, phone, address, items, total_price } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO shop_orders VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, customer_name, phone, address, JSON.stringify(items), total_price, 1, 'packing', Date.now()
  );
  res.json({ id, delivery_status: 'packing' });
});

// Public: single order status
router.get('/orders/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json({ ...o, items: JSON.parse(o.items) });
});

// Admin: list orders
router.get('/orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM shop_orders ORDER BY created_at DESC').all();
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// Admin: update delivery status
router.put('/orders/:id', requireAuth, requireRole('super', 'shop_op'), (req, res) => {
  const { delivery_status } = req.body;
  db.prepare('UPDATE shop_orders SET delivery_status = ? WHERE id = ?').run(delivery_status, req.params.id);
  res.json(db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(req.params.id));
});

module.exports = router;
