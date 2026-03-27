// server/routes/groups.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create group from cloud:// fileIDs (uploaded by mini-program via wx.cloud.uploadFile)
router.post('/create-from-urls', requireAuth, async (req, res) => {
  try {
    const { title, urls } = req.body;
    if (!urls || !urls.length) return res.status(400).json({ error: 'no urls' });
    const id = uuidv4();
    const code = genCode();
    const photos = urls.map(u => ({ thumbnail: u, original: u }));
    await db.run(
      'INSERT INTO photo_groups VALUES (?,?,?,?,?,?,?,?)',
      [id, title || `group-${id.slice(0, 6)}`, code, req.admin.id, 0, Date.now(), JSON.stringify(photos), 0]
    );
    res.json({ id, code, photo_count: photos.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: list groups
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = req.admin.role === 'super'
      ? await db.all('SELECT * FROM photo_groups ORDER BY created_at DESC')
      : await db.all('SELECT * FROM photo_groups WHERE uploaded_by = ? ORDER BY created_at DESC', [req.admin.id]);
    res.json(groups.map(g => ({ ...g, photos: JSON.parse(g.photos) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: find by 6-digit code
router.get('/by-code/:code', async (req, res) => {
  try {
    const g = await db.get('SELECT * FROM photo_groups WHERE code = ?', [req.params.code]);
    if (!g) return res.status(404).json({ error: 'not found' });
    const photos = JSON.parse(g.photos);
    if (g.is_paid) {
      return res.json({ id: g.id, title: g.title, is_paid: 1, images: photos.map(p => p.original) });
    }
    res.json({ id: g.id, title: g.title, is_paid: 0, thumbnails: photos.map(p => p.thumbnail) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: get by id
router.get('/:id', async (req, res) => {
  try {
    const g = await db.get('SELECT * FROM photo_groups WHERE id = ?', [req.params.id]);
    if (!g) return res.status(404).json({ error: 'not found' });
    const photos = JSON.parse(g.photos);
    if (g.is_paid) {
      return res.json({ id: g.id, title: g.title, is_paid: 1, images: photos.map(p => p.original) });
    }
    res.json({ id: g.id, title: g.title, is_paid: 0, thumbnails: photos.map(p => p.thumbnail) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mock pay
router.post('/:id/pay', async (req, res) => {
  try {
    const g = await db.get('SELECT * FROM photo_groups WHERE id = ?', [req.params.id]);
    if (!g) return res.status(404).json({ error: 'not found' });
    await db.run('UPDATE photo_groups SET is_paid = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download (paid only)
router.get('/:id/download', async (req, res) => {
  try {
    const g = await db.get('SELECT * FROM photo_groups WHERE id = ?', [req.params.id]);
    if (!g) return res.status(404).json({ error: 'not found' });
    if (!g.is_paid) return res.status(403).json({ error: 'payment required' });
    res.json({ originals: JSON.parse(g.photos).map(p => p.original) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
