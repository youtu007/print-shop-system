// server/routes/groups.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Admin: upload group
router.post('/', requireAuth, upload.array('photos', 30), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'no files' });
  const id = uuidv4();
  const code = genCode();
  const photos = req.files.map(f => ({
    thumbnail: `/uploads/${f.filename}`,
    original: `/uploads/${f.filename}`
  }));
  db.prepare('INSERT INTO photo_groups VALUES (?,?,?,?,?,?,?)').run(
    id, req.body.title || `group-${id.slice(0,6)}`, code,
    req.admin.id, 0, Date.now(), JSON.stringify(photos)
  );
  res.json({ id, code, thumbnails: photos.map(p => p.thumbnail) });
});

// Upload single temp file (for mini-program step-by-step upload)
router.post('/upload-temp', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Create group from already-uploaded URLs
router.post('/create-from-urls', requireAuth, (req, res) => {
  const { title, urls } = req.body;
  if (!urls || !urls.length) return res.status(400).json({ error: 'no urls' });
  const id = uuidv4();
  const code = genCode();
  const photos = urls.map(u => ({ thumbnail: u, original: u }));
  db.prepare('INSERT INTO photo_groups VALUES (?,?,?,?,?,?,?)').run(
    id, title || `group-${id.slice(0,6)}`, code,
    req.admin.id, 0, Date.now(), JSON.stringify(photos)
  );
  res.json({ id, code, photo_count: photos.length });
});

// Admin: list groups
router.get('/', requireAuth, (req, res) => {
  const groups = req.admin.role === 'super'
    ? db.prepare('SELECT * FROM photo_groups ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM photo_groups WHERE uploaded_by = ? ORDER BY created_at DESC').all(req.admin.id);
  res.json(groups.map(g => ({ ...g, photos: JSON.parse(g.photos) })));
});

// Public: find by 6-digit code
router.get('/by-code/:code', (req, res) => {
  const g = db.prepare('SELECT * FROM photo_groups WHERE code = ?').get(req.params.code);
  if (!g) return res.status(404).json({ error: 'not found' });
  const photos = JSON.parse(g.photos);
  if (g.is_paid) return res.json({ id: g.id, title: g.title, is_paid: 1, images: photos.map(p => p.original) });
  res.json({ id: g.id, title: g.title, is_paid: 0, thumbnails: photos.map(p => p.thumbnail) });
});

// Public: get by id
router.get('/:id', (req, res) => {
  const g = db.prepare('SELECT * FROM photo_groups WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'not found' });
  const photos = JSON.parse(g.photos);
  if (g.is_paid) return res.json({ id: g.id, title: g.title, is_paid: 1, images: photos.map(p => p.original) });
  res.json({ id: g.id, title: g.title, is_paid: 0, thumbnails: photos.map(p => p.thumbnail) });
});

// Mock pay
router.post('/:id/pay', (req, res) => {
  const g = db.prepare('SELECT * FROM photo_groups WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE photo_groups SET is_paid = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Download (paid only)
router.get('/:id/download', (req, res) => {
  const g = db.prepare('SELECT * FROM photo_groups WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'not found' });
  if (!g.is_paid) return res.status(403).json({ error: 'payment required' });
  res.json({ originals: JSON.parse(g.photos).map(p => p.original) });
});

module.exports = router;
