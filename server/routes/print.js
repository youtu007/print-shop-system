// server/routes/print.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const db = require('../db');
const { autoLayout } = require('../utils/layout');

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
    const canvasW = dim.w * cols, canvasH = dim.h * rows;
    const composites = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        composites.push({ input: cropped, left: c * dim.w, top: r * dim.h });
      }
    }
    const outName = `idphoto-${uuidv4()}.jpg`;
    const outPath = path.join(uploadsDir, outName);
    await sharp({ create: { width: canvasW, height: canvasH, channels: 3, background: '#ffffff' } })
      .composite(composites).jpeg({ quality: 90 }).toFile(outPath);
    res.json({ preview_url: `/uploads/${outName}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit self-service print job
router.post('/self-service', (req, res) => {
  const { printer_id, spec, layout_preview_url, submitted_by } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO print_jobs VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, 'self_service', printer_id, null, submitted_by || null,
    JSON.stringify(spec), layout_preview_url || null, 'pending', Date.now()
  );
  res.json({ id, status: 'pending' });
});

// Customer: get job status
router.get('/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  res.json({ ...job, spec: JSON.parse(job.spec) });
});

module.exports = router;
