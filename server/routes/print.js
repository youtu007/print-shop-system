// server/routes/print.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const db = require('../db');
const { autoLayout } = require('../utils/layout');
const { requireAuth, requireRole } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Auto-layout preview
router.post('/layout', upload.array('images', 20), async (req, res) => {
  try {
    const { size = '6寸' } = req.body;
    const paths = req.files.map(f => f.path);
    const previewUrl = await autoLayout(paths, size, uploadsDir);
    res.json({ preview_url: previewUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ID photo processing
router.post('/id-photo', upload.single('image'), async (req, res) => {
  try {
    const { size = '1寸' } = req.body;
    const sizeMap = { '1寸': { w: 295, h: 413 }, '2寸': { w: 413, h: 579 } };
    const dim = sizeMap[size] || sizeMap['1寸'];
    const cropped = await sharp(req.file.path).resize(dim.w, dim.h, { fit: 'cover' }).toBuffer();
    const cols = 4, rows = 2;
    const composites = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        composites.push({ input: cropped, left: c * dim.w, top: r * dim.h });
      }
    }
    const outName = `idphoto-${uuidv4()}.jpg`;
    const outPath = path.join(uploadsDir, outName);
    await sharp({ create: { width: dim.w * cols, height: dim.h * rows, channels: 3, background: '#ffffff' } })
      .composite(composites).jpeg({ quality: 90 }).toFile(outPath);
    res.json({ preview_url: `/uploads/${outName}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit self-service print job
router.post('/self-service', async (req, res) => {
  try {
    const { printer_id, spec, layout_preview_url, submitted_by } = req.body;
    const id = uuidv4();
    await db.run(
      'INSERT INTO print_jobs VALUES (?,?,?,?,?,?,?,?,?)',
      [id, 'self_service', printer_id, null, submitted_by || null, JSON.stringify(spec), layout_preview_url || null, 'pending', Date.now()]
    );
    res.json({ id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Customer: get job status
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await db.get('SELECT * FROM print_jobs WHERE id = ?', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'not found' });
    res.json({ ...job, spec: JSON.parse(job.spec) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/print/prices — 公开，小程序用于计算价格
const DEFAULT_PRINT_PRICES = { photo: {'1寸':0.5,'2寸':0.8,'3寸':1.5,'5寸':3.0,'6寸':5.0,'A4':8.0}, doc: {color:2.0, bw:0.5} };
router.get('/prices', async (req, res) => {
  try {
    const row = await db.get('SELECT value FROM settings WHERE `key` = ?', ['print_prices']);
    res.json(row ? JSON.parse(row.value) : DEFAULT_PRINT_PRICES);
  } catch (e) {
    // settings 表尚未建立时返回默认值，不影响使用
    res.json(DEFAULT_PRINT_PRICES);
  }
});

// PUT /api/print/prices — 管理员修改收费标准
router.put('/prices', requireAuth, requireRole('super', 'printer_op'), async (req, res) => {
  try {
    const prices = req.body;
    // 确保 settings 表存在（兼容旧库未迁移的情况）
    await db.run('CREATE TABLE IF NOT EXISTS settings (`key` VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL)');
    await db.run(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
      ['print_prices', JSON.stringify(prices), JSON.stringify(prices)]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
