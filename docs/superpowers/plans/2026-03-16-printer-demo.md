# Printer Demo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full printer service platform demo with Express backend, Vue 3 web frontend, and WeChat mini-program.

**Architecture:** Express.js + SQLite backend serves REST API consumed by both Vue 3 (web) and WeChat mini-program. Vue 3 build is statically hosted by Express in production. Auth via JWT.

**Tech Stack:** Node.js, Express, better-sqlite3, sharp, multer, jsonwebtoken, Vue 3, Vite, Pinia, Vue Router, WeChat mini-program

**Spec:** `docs/superpowers/specs/2026-03-16-printer-demo-design.md`

---

## Chunk 1: Cleanup + Project Setup

### Task 1: Delete old files and init new structure

**Files:**
- Delete: `server.js`, `package.json`, `package-lock.json`, `node_modules/`, `weapp/` (full reset)
- Create: `server/index.js`, `server/db.js`, `server/middleware/auth.js`
- Create: `server/routes/auth.js`, `server/routes/printers.js`, `server/routes/groups.js`, `server/routes/print.js`, `server/routes/shop.js`, `server/routes/admin.js`
- Create: `server/utils/layout.js`
- Create: `package.json`

- [ ] **Step 1: Delete old project files**

```bash
cd "/Users/demean20/Desktop/121605打印机demo"
rm -f server.js package.json package-lock.json
rm -rf node_modules weapp
mkdir -p server/routes server/middleware server/utils uploads web weapp
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "printer-demo",
  "version": "1.0.0",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git init
git add package.json
git commit -m "chore: init project structure"
```

---

### Task 2: Database initialization

**Files:**
- Create: `server/db.js`

- [ ] **Step 1: Write db.js**

```js
// server/db.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'printer_op',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_printer_access (
    admin_id TEXT NOT NULL,
    printer_id TEXT NOT NULL,
    PRIMARY KEY (admin_id, printer_id)
  );

  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    paper_remaining INTEGER NOT NULL DEFAULT 500,
    last_heartbeat INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photo_groups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    uploaded_by TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    photos TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    printer_id TEXT NOT NULL,
    group_id TEXT,
    submitted_by TEXT,
    spec TEXT NOT NULL,
    layout_preview_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shop_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total_price REAL NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 1,
    delivery_status TEXT NOT NULL DEFAULT 'packing',
    created_at INTEGER NOT NULL
  );
`);

// Seed demo data if empty
const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
if (adminCount === 0) {
  const { v4: uuidv4 } = require('uuid');
  const crypto = require('crypto');
  // Use PBKDF2 with random salt: store as "salt:hash"
  const hash = (p) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex'); };

  const superId = uuidv4();
  db.prepare(`INSERT INTO admins VALUES (?,?,?,?,?)`).run(superId, 'admin', hash('admin123'), 'super', Date.now());

  const p1 = uuidv4(), p2 = uuidv4(), p3 = uuidv4();
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p1, '打印机-A', '前台', 'online', 450, Date.now());
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p2, '打印机-B', '二楼', 'busy', 120, Date.now());
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p3, '打印机-C', '三楼', 'offline', 0, Date.now() - 7200000);

  const products = [
    [uuidv4(), '6寸相片打印', '高清光面相纸，色彩还原真实', 1.5, null],
    [uuidv4(), 'A4彩色打印', '80g铜版纸，适合文档海报', 0.8, null],
    [uuidv4(), '证件照套餐', '白底/蓝底/红底，含排版打印', 12.0, null],
    [uuidv4(), '相册定制', '20页精装相册', 58.0, null],
  ];
  const ins = db.prepare(`INSERT INTO shop_products VALUES (?,?,?,?,?)`);
  products.forEach(p => ins.run(...p));
}

module.exports = db;
```

- [ ] **Step 2: Verify DB initializes without error**

```bash
node -e "require('./server/db'); console.log('DB OK')"
```

Expected: `DB OK`, `data.db` file created.

- [ ] **Step 3: Commit**

```bash
git add server/db.js
git commit -m "feat: init SQLite schema and seed demo data"
```

---

### Task 3: Auth middleware + routes

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/routes/auth.js`

- [ ] **Step 1: Write auth middleware**

```js
// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'printer-demo-secret';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
```

- [ ] **Step 2: Write auth routes**

```js
// server/routes/auth.js
const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// Verify PBKDF2 password: stored as "salt:hash"
const verify = (password, stored) => {
  const [salt, h] = stored.split(':');
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex') === h;
};

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !verify(password, admin.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: admin.role, username: admin.username });
});

router.post('/logout', (req, res) => {
  // Client-side logout — just acknowledge
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add server/middleware/auth.js server/routes/auth.js
git commit -m "feat: auth middleware and login/logout routes"
```

---

### Task 4: Express entry point

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Write server/index.js**

```js
// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/printers', require('./routes/printers'));
app.use('/api/groups',   require('./routes/groups'));
app.use('/api/print',    require('./routes/print'));
app.use('/api/shop',     require('./routes/shop'));
app.use('/api/admin',    require('./routes/admin'));

// Serve Vue build in production
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (require('fs').existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

- [ ] **Step 2: Verify server starts**

```bash
node server/index.js &
sleep 2
curl http://localhost:3000/api/auth/logout -X POST -H 'Content-Type: application/json'
kill %1
```

Expected: `{"ok":true}`

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: express entry point with all route mounts"
```

---

## Chunk 2: Backend Routes

### Task 5: Printers routes

**Files:**
- Create: `server/routes/printers.js`

- [ ] **Step 1: Write printers.js**

```js
// server/routes/printers.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

function canAccessPrinter(admin, printerId) {
  if (admin.role === 'super' || admin.role === 'shop_op') return true;
  return !!db.prepare('SELECT 1 FROM admin_printer_access WHERE admin_id=? AND printer_id=?').get(admin.id, printerId);
}

// Public (no auth): list printers for customer-facing pages
router.get('/public', (req, res) => {
  res.json(db.prepare("SELECT id,name,location,status,paper_remaining FROM printers").all());
});

// Admin: list printers (filtered by permission for printer_op)
router.get('/', requireAuth, (req, res) => {
  let printers;
  if (req.admin.role === 'super' || req.admin.role === 'shop_op') {
    printers = db.prepare('SELECT * FROM printers').all();
  } else {
    printers = db.prepare(`
      SELECT p.* FROM printers p
      JOIN admin_printer_access a ON p.id = a.printer_id
      WHERE a.admin_id = ?
    `).all(req.admin.id);
  }
  res.json(printers);
});

router.get('/:id', requireAuth, (req, res) => {
  if (!canAccessPrinter(req.admin, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const p = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

router.post('/', requireAuth, requireRole('super'), (req, res) => {
  const { name, location } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO printers VALUES (?,?,?,?,?,?)').run(id, name, location, 'offline', 500, Date.now());
  res.json(db.prepare('SELECT * FROM printers WHERE id = ?').get(id));
});

router.put('/:id', requireAuth, (req, res) => {
  if (!canAccessPrinter(req.admin, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const { status, paper_remaining } = req.body;
  const p = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (status) db.prepare('UPDATE printers SET status=?, last_heartbeat=? WHERE id=?').run(status, Date.now(), req.params.id);
  if (paper_remaining !== undefined) db.prepare('UPDATE printers SET paper_remaining=? WHERE id=?').run(paper_remaining, req.params.id);
  res.json(db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, requireRole('super'), (req, res) => {
  db.prepare('DELETE FROM printers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 2: Test login + printers**

```bash
node server/index.js &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).token)")
curl -s http://localhost:3000/api/printers -H "Authorization: Bearer $TOKEN" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).length, 'printers')"
kill %1
```

Expected: `3 printers`

- [ ] **Step 3: Commit**

```bash
git add server/routes/printers.js
git commit -m "feat: printers CRUD routes"
```

---

### Task 6: Photo groups routes

**Files:**
- Create: `server/routes/groups.js`

- [ ] **Step 1: Write groups.js**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/groups.js
git commit -m "feat: photo groups routes with upload, code lookup, pay, download"
```

---

### Task 7: Auto-layout utility + print routes

**Files:**
- Create: `server/utils/layout.js`
- Create: `server/routes/print.js`

- [ ] **Step 1: Write layout.js**

```js
// server/utils/layout.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Photo size dimensions in mm -> px at 300dpi
const SIZE_MAP = {
  '1寸': { w: 295, h: 413 },
  '2寸': { w: 413, h: 579 },
  '3寸': { w: 886, h: 591 },
  '5寸': { w: 1500, h: 1050 },
  '6寸': { w: 1800, h: 1200 },
  'A4':  { w: 2480, h: 3508 },
};

// Canvas dimensions per output sheet
const CANVAS = { 'A4': { w:2480, h:3508 }, default: { w:1800, h:1200 } };

async function autoLayout(imagePaths, sizeName, uploadsDir) {
  const size = SIZE_MAP[sizeName] || SIZE_MAP['6寸'];
  const canvas = CANVAS[sizeName] || CANVAS.default;
  const CANVAS_W = canvas.w, CANVAS_H = canvas.h;
  const cols = Math.floor(CANVAS_W / size.w);
  const rows = Math.floor(CANVAS_H / size.h);
  const perPage = Math.max(1, cols * rows);

  const composites = [];
  for (let i = 0; i < Math.min(imagePaths.length, perPage); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const buf = await sharp(imagePaths[i]).resize(size.w, size.h, { fit: 'cover' }).toBuffer();
    composites.push({ input: buf, left: col * size.w, top: row * size.h });
  }

  const outName = `layout-${uuidv4()}.jpg`;
  const outPath = path.join(uploadsDir, outName);
  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: '#ffffff' } })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outPath);

  return `/uploads/${outName}`;
}

module.exports = { autoLayout, SIZE_MAP };
```

- [ ] **Step 2: Write print.js**

```js
// server/routes/print.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { autoLayout } = require('../utils/layout');
const { requireAuth } = require('../middleware/auth');

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
    const sharp = require('sharp');
    // Crop to size, tile 8-up on canvas
    const cropped = await sharp(req.file.path).resize(dim.w, dim.h, { fit: 'cover' }).toBuffer();
    const cols = 4, rows = 2;
    const canvasW = dim.w * cols, canvasH = dim.h * rows;
    const composites = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        composites.push({ input: cropped, left: c * dim.w, top: r * dim.h });
      }
    }
    const { v4: uuidv4 } = require('uuid');
    const outName = `idphoto-${uuidv4()}.jpg`;
    const outPath = require('path').join(uploadsDir, outName);
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
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/layout.js server/routes/print.js
git commit -m "feat: auto-layout, id-photo, print job routes"
```

---

### Task 8: Shop routes

**Files:**
- Create: `server/routes/shop.js`

- [ ] **Step 1: Write shop.js**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/shop.js
git commit -m "feat: shop products and orders routes"
```

---

### Task 9: Admin routes

**Files:**
- Create: `server/routes/admin.js`

- [ ] **Step 1: Write admin.js**

```js
// server/routes/admin.js
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const hash = (p) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex'); };

// Dashboard summary
router.get('/dashboard', requireAuth, (req, res) => {
  const onlinePrinters = db.prepare("SELECT COUNT(*) as c FROM printers WHERE status = 'online'").get().c;
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayJobs = db.prepare('SELECT COUNT(*) as c FROM print_jobs WHERE created_at >= ?').get(todayStart.getTime()).c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM shop_orders WHERE delivery_status != 'delivered'").get().c;
  const totalGroups = db.prepare('SELECT COUNT(*) as c FROM photo_groups').get().c;
  res.json({ online_printers: onlinePrinters, today_jobs: todayJobs, pending_orders: pendingOrders, total_groups: totalGroups });
});

// List admins (super only)
router.get('/admins', requireAuth, requireRole('super'), (req, res) => {
  res.json(db.prepare('SELECT id, username, role, created_at FROM admins').all());
});

// Create sub-admin (super only)
router.post('/admins', requireAuth, requireRole('super'), (req, res) => {
  const { username, password, role } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO admins VALUES (?,?,?,?,?)').run(id, username, hash(password), role, Date.now());
    res.json({ id, username, role });
  } catch {
    res.status(400).json({ error: 'username already exists' });
  }
});

// Assign printer access
router.put('/admins/:id/access', requireAuth, requireRole('super'), (req, res) => {
  const { printer_ids } = req.body; // array of printer IDs
  db.prepare('DELETE FROM admin_printer_access WHERE admin_id = ?').run(req.params.id);
  const ins = db.prepare('INSERT INTO admin_printer_access VALUES (?,?)');
  (printer_ids || []).forEach(pid => ins.run(req.params.id, pid));
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 2: Verify full backend**

```bash
node server/index.js &
sleep 1
curl -s http://localhost:3000/api/shop/products | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).length, 'products')"
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).token)")
curl -s http://localhost:3000/api/admin/dashboard -H "Authorization: Bearer $TOKEN"
kill %1
```

Expected: `4 products`, dashboard JSON with counts.

- [ ] **Step 3: Commit**

```bash
git add server/routes/admin.js
git commit -m "feat: admin dashboard, account management, printer access routes"
```

---

## Chunk 3: Vue 3 Web Frontend

### Task 10: Vue 3 project setup

**Files:**
- Create: `web/` (Vite project)

- [ ] **Step 1: Scaffold Vue 3 project**

```bash
cd /Users/demean20/Desktop/121605打印机demo
npm create vite@latest web -- --template vue
cd web && npm install
npm install vue-router@4 pinia axios
```

- [ ] **Step 2: Replace web/src/main.js**

```js
// web/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

- [ ] **Step 3: Write global CSS (cartoon style)**

```css
/* web/src/style.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #FFFBF5;
  --primary: #FF6B6B;
  --green: #6BCB77;
  --yellow: #FFD93D;
  --text: #3D3D3D;
  --muted: #999;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 4px 16px rgba(0,0,0,0.08);
}

body { background: var(--bg); color: var(--text); font-family: -apple-system, 'PingFang SC', sans-serif; }

.card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 22px; border-radius: var(--radius-sm); border: none; cursor: pointer;
  font-size: 15px; font-weight: 600; transition: transform .15s, opacity .15s; }
.btn:hover { transform: translateY(-1px); opacity: .9; }
.btn:active { transform: scale(.97); }
.btn-primary { background: var(--primary); color: #fff; }
.btn-green { background: var(--green); color: #fff; }
.btn-ghost { background: #f5f5f5; color: var(--text); }
.badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.badge-online { background: #e8f9ec; color: #27ae60; }
.badge-offline { background: #f0f0f0; color: #999; }
.badge-busy { background: #fff3e0; color: #e67e22; }
.input { width: 100%; padding: 10px 14px; border: 2px solid #eee; border-radius: var(--radius-sm);
  font-size: 15px; outline: none; transition: border-color .2s; }
.input:focus { border-color: var(--primary); }
.page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
```

- [ ] **Step 4: Write router**

```js
// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',              component: () => import('../views/Home.vue') },
  { path: '/printers',     component: () => import('../views/Printers.vue') },
  { path: '/print/self',   component: () => import('../views/PrintSelf.vue') },
  { path: '/print/group',  component: () => import('../views/PrintGroup.vue') },
  { path: '/shop',         component: () => import('../views/Shop.vue') },
  { path: '/shop/orders/:id', component: () => import('../views/OrderStatus.vue') },
  { path: '/admin/login',  component: () => import('../views/admin/Login.vue') },
  { path: '/admin',        component: () => import('../views/admin/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/admin/printers', component: () => import('../views/admin/AdminPrinters.vue'), meta: { requiresAuth: true } },
  { path: '/admin/groups', component: () => import('../views/admin/AdminGroups.vue'), meta: { requiresAuth: true } },
  { path: '/admin/orders', component: () => import('../views/admin/AdminOrders.vue'), meta: { requiresAuth: true } },
  { path: '/admin/accounts', component: () => import('../views/admin/AdminAccounts.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return '/admin/login'
  }
})

export default router
```

- [ ] **Step 5: Write API client**

```js
// web/src/api/index.js
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default api
```

- [ ] **Step 6: Write auth store**

```js
// web/src/stores/auth.js
import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: localStorage.getItem('token'), role: localStorage.getItem('role'), username: localStorage.getItem('username') }),
  actions: {
    async login(username, password) {
      const { data } = await api.post('/api/auth/login', { username, password })
      this.token = data.token; this.role = data.role; this.username = data.username
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('username', data.username)
    },
    logout() {
      this.token = null; this.role = null; this.username = null
      localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('username')
    }
  }
})
```

- [ ] **Step 7: Write App.vue with nav**

```vue
<!-- web/src/App.vue -->
<template>
  <nav class="nav">
    <router-link to="/" class="nav-brand">🖨️ 打印小站</router-link>
    <div class="nav-links">
      <router-link to="/printers">打印机</router-link>
      <router-link to="/print/self">自助打印</router-link>
      <router-link to="/print/group">编组相片</router-link>
      <router-link to="/shop">商城</router-link>
      <router-link to="/admin">管理后台</router-link>
    </div>
  </nav>
  <router-view />
</template>

<style scoped>
.nav { display:flex; align-items:center; justify-content:space-between; padding:0 24px;
  height:56px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.06); position:sticky; top:0; z-index:100; }
.nav-brand { font-size:18px; font-weight:800; color:var(--primary); text-decoration:none; }
.nav-links { display:flex; gap:24px; }
.nav-links a { text-decoration:none; color:var(--text); font-weight:500; font-size:15px; }
.nav-links a.router-link-active { color:var(--primary); }
</style>
```

- [ ] **Step 8: Write vite.config.js**

```js
// web/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' } }
})
```

- [ ] **Step 9: Commit**

```bash
cd /Users/demean20/Desktop/121605打印机demo
git add web/
git commit -m "feat: Vue 3 project scaffold with router, stores, API client, global styles"
```

---

### Task 11: Customer-facing Vue pages

**Files:**
- Create: `web/src/views/Home.vue`
- Create: `web/src/views/Printers.vue`
- Create: `web/src/views/PrintSelf.vue`
- Create: `web/src/views/PrintGroup.vue`
- Create: `web/src/views/Shop.vue`
- Create: `web/src/views/OrderStatus.vue`

- [ ] **Step 1: Home.vue**

```vue
<!-- web/src/views/Home.vue -->
<template>
  <div class="home">
    <div class="hero">
      <div class="hero-emoji">🖨️</div>
      <h1>打印小站</h1>
      <p>快速打印 · 相片分享 · 本地配送</p>
    </div>
    <div class="page">
      <div class="feature-grid">
        <router-link v-for="f in features" :key="f.to" :to="f.to" class="feature-card card">
          <div class="feature-icon">{{ f.icon }}</div>
          <div class="feature-title">{{ f.title }}</div>
          <div class="feature-desc">{{ f.desc }}</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
const features = [
  { icon:'📄', title:'自助打印', desc:'上传文件，选规格，立即打印', to:'/print/self' },
  { icon:'📸', title:'编组相片', desc:'输入编号，付款后下载打印', to:'/print/group' },
  { icon:'🖨️', title:'打印机状态', desc:'查看附近打印机实时状态', to:'/printers' },
  { icon:'🛍️', title:'商城', desc:'相册、相纸，本地配送到家', to:'/shop' },
]
</script>

<style scoped>
.hero { background: linear-gradient(135deg,#ff6b6b22,#ffd93d22); text-align:center; padding:60px 20px; }
.hero-emoji { font-size:64px; margin-bottom:12px; }
.hero h1 { font-size:36px; font-weight:900; color:var(--primary); }
.hero p { color:var(--muted); margin-top:8px; font-size:17px; }
.feature-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-top:32px; }
.feature-card { text-decoration:none; color:var(--text); cursor:pointer; transition:transform .2s,box-shadow .2s; }
.feature-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,.12); }
.feature-icon { font-size:40px; margin-bottom:12px; }
.feature-title { font-size:18px; font-weight:700; margin-bottom:6px; }
.feature-desc { color:var(--muted); font-size:14px; }
</style>
```

- [ ] **Step 2: Printers.vue**

```vue
<!-- web/src/views/Printers.vue -->
<template>
  <div class="page">
    <div class="section-title">🖨️ 打印机状态</div>
    <div class="grid-2">
      <div v-for="p in printers" :key="p.id" class="card printer-card">
        <div class="printer-header">
          <span class="printer-name">{{ p.name }}</span>
          <span :class="['badge','badge-'+p.status]">{{ statusLabel[p.status] }}</span>
        </div>
        <div class="printer-info">📍 {{ p.location }}</div>
        <div class="printer-paper">
          <span>📄 剩余纸张</span>
          <div class="paper-bar"><div class="paper-fill" :style="{width: Math.min(100, p.paper_remaining/5)+'%', background: p.paper_remaining<100?'#e74c3c':'#6BCB77'}"></div></div>
          <span class="paper-count">{{ p.paper_remaining }} 张</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
const printers = ref([])
const statusLabel = { online:'在线', offline:'离线', busy:'忙碌' }
onMounted(async () => {
  try { const { data } = await api.get('/api/printers/public'); printers.value = data }
  catch { printers.value = [] }
})
</script>

<style scoped>
.printer-card { display:flex; flex-direction:column; gap:10px; }
.printer-header { display:flex; justify-content:space-between; align-items:center; }
.printer-name { font-weight:700; font-size:17px; }
.printer-info { color:var(--muted); font-size:14px; }
.printer-paper { display:flex; align-items:center; gap:8px; font-size:13px; }
.paper-bar { flex:1; height:8px; background:#eee; border-radius:99px; overflow:hidden; }
.paper-fill { height:100%; border-radius:99px; transition:width .5s; }
.paper-count { min-width:40px; text-align:right; color:var(--muted); }
</style>
```

- [ ] **Step 3: PrintGroup.vue**

```vue
<!-- web/src/views/PrintGroup.vue -->
<template>
  <div class="page">
    <div class="section-title">📸 编组相片</div>
    <div class="card" style="max-width:480px;margin:0 auto;">
      <div v-if="!group">
        <p style="margin-bottom:12px;color:var(--muted)">输入相片编号（6位数字）</p>
        <input class="input" v-model="code" placeholder="例如：123456" maxlength="6" style="margin-bottom:12px"/>
        <button class="btn btn-primary" style="width:100%" @click="lookup">🔍 查找相片</button>
        <p v-if="error" style="color:#e74c3c;margin-top:8px;font-size:14px">{{ error }}</p>
      </div>
      <div v-else>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-weight:700;font-size:17px">{{ group.title }}</span>
          <span :class="['badge', group.is_paid?'badge-online':'badge-offline']">{{ group.is_paid?'已付款':'未付款' }}</span>
        </div>
        <div class="photo-grid">
          <img v-for="(url,i) in displayPhotos" :key="i" :src="url" class="photo-thumb" />
        </div>
        <div v-if="!group.is_paid" style="margin-top:16px">
          <p style="color:var(--muted);font-size:14px;margin-bottom:10px">付款后可下载高清原图</p>
          <button class="btn btn-primary" style="width:100%" @click="pay">💳 立即付款（模拟）</button>
        </div>
        <div v-else style="margin-top:16px;display:flex;gap:10px">
          <button class="btn btn-green" style="flex:1" @click="download">⬇️ 下载原图</button>
          <button class="btn btn-ghost" style="flex:1" @click="reset">返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api'

const code = ref(''), group = ref(null), error = ref('')

const displayPhotos = computed(() =>
  group.value?.is_paid ? (group.value.images || []) : (group.value?.thumbnails || [])
)

async function lookup() {
  error.value = ''
  try {
    const { data } = await api.get(`/api/groups/by-code/${code.value}`)
    group.value = data
  } catch { error.value = '未找到该编号，请确认后重试' }
}

async function pay() {
  await api.post(`/api/groups/${group.value.id}/pay`)
  const { data } = await api.get(`/api/groups/${group.value.id}`)
  group.value = data
}

async function download() {
  const { data } = await api.get(`/api/groups/${group.value.id}/download`)
  alert('原图链接：\n' + data.originals.join('\n'))
}

function reset() { group.value = null; code.value = '' }
</script>

<style scoped>
.photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.photo-thumb { width:100%; aspect-ratio:1; object-fit:cover; border-radius:10px; }
</style>
```

- [ ] **Step 4: PrintSelf.vue**

```vue
<!-- web/src/views/PrintSelf.vue -->
<template>
  <div class="page">
    <div class="section-title">📄 自助打印</div>
    <div class="card" style="max-width:560px;margin:0 auto">
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">选择照片</label>
        <input type="file" accept="image/*" multiple @change="onFiles" class="input" />
      </div>
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">打印规格</label>
        <select v-model="size" class="input">
          <option v-for="s in sizes" :key="s">{{ s }}</option>
        </select>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">选择打印机</label>
        <select v-model="printerId" class="input">
          <option v-for="p in printers" :key="p.id" :value="p.id">{{ p.name }} - {{ p.location }} ({{ p.status }})</option>
        </select>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:12px" @click="preview" :disabled="!files.length">
        🖼️ 生成排版预览
      </button>
      <div v-if="previewUrl" style="margin-bottom:16px">
        <img :src="previewUrl" style="width:100%;border-radius:12px;border:2px solid #eee" />
      </div>
      <div v-if="previewUrl">
        <input class="input" v-model="phone" placeholder="手机号（用于查询进度）" style="margin-bottom:10px"/>
        <button class="btn btn-green" style="width:100%" @click="submit">🖨️ 提交打印</button>
      </div>
      <div v-if="jobId" style="margin-top:12px;padding:12px;background:#e8f9ec;border-radius:10px;font-size:14px">
        ✅ 提交成功！任务ID：<strong>{{ jobId }}</strong>
        <button class="btn btn-ghost" style="margin-top:8px;width:100%;font-size:13px" @click="checkJob">🔄 查看打印进度</button>
        <div v-if="jobStatus" style="margin-top:6px;color:var(--muted)">状态：{{ jobStatusLabel[jobStatus] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const sizes = ['1寸','2寸','3寸','5寸','6寸','A4']
const size = ref('6寸'), files = ref([]), printers = ref([])
const printerId = ref(''), previewUrl = ref(''), phone = ref(''), jobId = ref(''), jobStatus = ref('')
const jobStatusLabel = { pending:'等待中', printing:'打印中', done:'已完成' }

async function checkJob() {
  const { data } = await api.get(`/api/print/jobs/${jobId.value}`)
  jobStatus.value = data.status
}

onMounted(async () => {
  try {
    const { data } = await api.get('/api/printers')
    printers.value = data.filter(p => p.status !== 'offline')
    if (printers.value.length) printerId.value = printers.value[0].id
  } catch {}
})

function onFiles(e) { files.value = Array.from(e.target.files) }

async function preview() {
  const fd = new FormData()
  files.value.forEach(f => fd.append('images', f))
  fd.append('size', size.value)
  const { data } = await api.post('/api/print/layout', fd)
  previewUrl.value = data.preview_url
}

async function submit() {
  const { data } = await api.post('/api/print/self-service', {
    printer_id: printerId.value,
    spec: { size: size.value, count: files.value.length },
    layout_preview_url: previewUrl.value,
    submitted_by: phone.value || null
  })
  jobId.value = data.id
}
</script>
```

- [ ] **Step 5: Shop.vue**

```vue
<!-- web/src/views/Shop.vue -->
<template>
  <div class="page">
    <div class="section-title">🛍️ 商城</div>
    <div class="grid-2" style="margin-bottom:32px">
      <div v-for="p in products" :key="p.id" class="card product-card">
        <div class="product-img">{{ productEmoji(p.name) }}</div>
        <div class="product-name">{{ p.name }}</div>
        <div class="product-desc">{{ p.description }}</div>
        <div class="product-bottom">
          <span class="product-price">¥{{ p.price.toFixed(1) }}</span>
          <button class="btn btn-primary" style="padding:6px 14px;font-size:13px" @click="addCart(p)">加入购物车</button>
        </div>
      </div>
    </div>

    <div v-if="cart.length" class="card">
      <div class="section-title">🛒 购物车</div>
      <div v-for="item in cart" :key="item.id" class="cart-row">
        <span>{{ item.name }}</span>
        <span>x{{ item.qty }}</span>
        <span>¥{{ (item.price * item.qty).toFixed(1) }}</span>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" @click="removeCart(item)">移除</button>
      </div>
      <div style="border-top:1px solid #eee;padding-top:12px;margin-top:12px;font-weight:700">
        合计：¥{{ total.toFixed(1) }}
      </div>

      <div v-if="!showForm">
        <button class="btn btn-primary" style="width:100%;margin-top:12px" @click="showForm=true">去结算</button>
      </div>
      <div v-else style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
        <input class="input" v-model="form.name" placeholder="姓名" />
        <input class="input" v-model="form.phone" placeholder="手机号" />
        <input class="input" v-model="form.address" placeholder="配送地址" />
        <button class="btn btn-green" @click="placeOrder">💳 模拟付款下单</button>
      </div>
    </div>

    <div v-if="orderId" style="margin-top:12px;padding:16px;background:#e8f9ec;border-radius:12px">
      ✅ 下单成功！<router-link :to="'/shop/orders/'+orderId" style="color:var(--primary);font-weight:700">查看订单状态 →</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const products = ref([]), cart = ref([]), showForm = ref(false), orderId = ref('')
const form = ref({ name:'', phone:'', address:'' })

const total = computed(() => cart.value.reduce((s,i) => s + i.price * i.qty, 0))

onMounted(async () => {
  const { data } = await api.get('/api/shop/products')
  products.value = data
})

function productEmoji(name) {
  if (name.includes('证件')) return '🪪'
  if (name.includes('相册')) return '📚'
  if (name.includes('A4')) return '📄'
  return '🖼️'
}

function addCart(p) {
  const existing = cart.value.find(i => i.id === p.id)
  if (existing) existing.qty++
  else cart.value.push({ ...p, qty: 1 })
}

function removeCart(item) { cart.value = cart.value.filter(i => i.id !== item.id) }

async function placeOrder() {
  const { data } = await api.post('/api/shop/orders', {
    customer_name: form.value.name,
    phone: form.value.phone,
    address: form.value.address,
    items: cart.value.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    total_price: total.value
  })
  orderId.value = data.id
  cart.value = []
  showForm.value = false
}
</script>

<style scoped>
.product-card { display:flex; flex-direction:column; gap:8px; }
.product-img { font-size:40px; }
.product-name { font-weight:700; font-size:16px; }
.product-desc { color:var(--muted); font-size:13px; flex:1; }
.product-bottom { display:flex; justify-content:space-between; align-items:center; }
.product-price { font-size:18px; font-weight:800; color:var(--primary); }
.cart-row { display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom:1px solid #f5f5f5; }
.cart-row span:first-child { flex:1; }
</style>
```

- [ ] **Step 6: OrderStatus.vue**

```vue
<!-- web/src/views/OrderStatus.vue -->
<template>
  <div class="page">
    <div class="section-title">📦 订单状态</div>
    <div v-if="order" class="card" style="max-width:480px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div style="font-weight:700;font-size:17px;margin-bottom:4px">订单 #{{ order.id.slice(0,8) }}</div>
        <div style="color:var(--muted);font-size:13px">{{ order.customer_name }} · {{ order.phone }}</div>
        <div style="color:var(--muted);font-size:13px">{{ order.address }}</div>
      </div>
      <div class="steps">
        <div v-for="(step,i) in steps" :key="step.key" :class="['step', stepIndex >= i ? 'active' : '']">
          <div class="step-dot">{{ step.icon }}</div>
          <div class="step-label">{{ step.label }}</div>
        </div>
      </div>
      <div style="margin-top:16px;font-size:14px;color:var(--muted)">
        商品：{{ order.items.map(i=>i.name+'×'+i.qty).join('、') }}
      </div>
      <div style="font-weight:700;margin-top:8px">合计：¥{{ order.total_price?.toFixed(1) }}</div>
    </div>
    <div v-else class="card" style="max-width:480px;margin:0 auto;text-align:center;padding:40px;color:var(--muted)">
      加载中...
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'

const route = useRoute()
const order = ref(null)
const steps = [
  { key:'packing', icon:'📦', label:'配货中' },
  { key:'shipping', icon:'🚚', label:'配送中' },
  { key:'delivered', icon:'✅', label:'已送达' },
]
const stepIndex = computed(() => steps.findIndex(s => s.key === order.value?.delivery_status))

onMounted(async () => {
  const { data } = await api.get(`/api/shop/orders/${route.params.id}`)
  order.value = data
})
</script>

<style scoped>
.steps { display:flex; justify-content:space-between; position:relative; padding:10px 0; }
.steps::before { content:''; position:absolute; top:24px; left:10%; right:10%; height:3px; background:#eee; }
.step { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; position:relative; z-index:1; }
.step-dot { width:40px; height:40px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; font-size:18px; transition:background .3s; }
.step.active .step-dot { background:var(--green); }
.step-label { font-size:13px; font-weight:600; color:var(--muted); }
.step.active .step-label { color:var(--green); }
</style>
```

- [ ] **Step 7: Commit**

```bash
cd /Users/demean20/Desktop/121605打印机demo
git add web/src/views/
git commit -m "feat: customer-facing Vue pages (home, printers, print, shop, order)"
```

---

### Task 12: Admin Vue pages

**Files:**
- Create: `web/src/views/admin/Login.vue`
- Create: `web/src/views/admin/Dashboard.vue`
- Create: `web/src/views/admin/AdminPrinters.vue`
- Create: `web/src/views/admin/AdminGroups.vue`
- Create: `web/src/views/admin/AdminOrders.vue`
- Create: `web/src/views/admin/AdminAccounts.vue`

- [ ] **Step 1: Create admin views directory**

```bash
mkdir -p /Users/demean20/Desktop/121605打印机demo/web/src/views/admin
```

- [ ] **Step 2: Login.vue**

```vue
<!-- web/src/views/admin/Login.vue -->
<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
    <div class="card" style="width:360px;padding:36px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:48px">🔐</div>
        <div style="font-weight:800;font-size:22px;margin-top:8px">管理员登录</div>
      </div>
      <input class="input" v-model="username" placeholder="用户名" style="margin-bottom:12px"/>
      <input class="input" v-model="password" type="password" placeholder="密码" style="margin-bottom:16px" @keydown.enter="login"/>
      <button class="btn btn-primary" style="width:100%" @click="login">登录</button>
      <p v-if="error" style="color:#e74c3c;text-align:center;margin-top:10px;font-size:14px">{{ error }}</p>
      <p style="color:var(--muted);text-align:center;margin-top:14px;font-size:12px">演示账号：admin / admin123</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter(), auth = useAuthStore()
const username = ref(''), password = ref(''), error = ref('')

async function login() {
  try { await auth.login(username.value, password.value); router.push('/admin') }
  catch { error.value = '用户名或密码错误' }
}
</script>
```

- [ ] **Step 3: Dashboard.vue**

```vue
<!-- web/src/views/admin/Dashboard.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">📊 管理后台</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="color:var(--muted);font-size:14px">{{ auth.username }} ({{ roleLabel[auth.role] }})</span>
        <button class="btn btn-ghost" style="padding:6px 14px;font-size:13px" @click="logout">退出</button>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:28px">
      <div v-for="stat in stats" :key="stat.label" class="card stat-card">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-num">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
    <div class="admin-nav">
      <router-link v-for="link in links" :key="link.to" :to="link.to" class="card admin-link">
        {{ link.icon }} {{ link.label }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import api from '../../api'

const router = useRouter(), auth = useAuthStore()
const data = ref({})
const roleLabel = { super:'超级管理员', printer_op:'打印机管理员', shop_op:'商城管理员' }

onMounted(async () => {
  const { data: d } = await api.get('/api/admin/dashboard')
  data.value = d
})

const stats = computed(() => [
  { icon:'🟢', label:'在线打印机', value: data.value.online_printers ?? '-' },
  { icon:'📄', label:'今日打印任务', value: data.value.today_jobs ?? '-' },
  { icon:'📦', label:'待处理订单', value: data.value.pending_orders ?? '-' },
  { icon:'📸', label:'相片编组', value: data.value.total_groups ?? '-' },
])

const links = computed(() => {
  const all = [
    { to:'/admin/printers', icon:'🖨️', label:'打印机管理' },
    { to:'/admin/groups', icon:'📸', label:'相片编组' },
    { to:'/admin/orders', icon:'📦', label:'订单管理' },
    { to:'/admin/accounts', icon:'👥', label:'账号管理' },
  ]
  if (auth.role === 'shop_op') return all.filter(l => l.to === '/admin/orders')
  if (auth.role === 'printer_op') return all.filter(l => l.to !== '/admin/orders' && l.to !== '/admin/accounts')
  return all
})

async function logout() { auth.logout(); router.push('/admin/login') }
</script>

<style scoped>
.stat-card { text-align:center; }
.stat-icon { font-size:32px; margin-bottom:8px; }
.stat-num { font-size:36px; font-weight:900; color:var(--primary); }
.stat-label { color:var(--muted); font-size:14px; margin-top:4px; }
.admin-nav { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
.admin-link { text-decoration:none; color:var(--text); font-weight:600; font-size:16px; text-align:center; padding:24px; cursor:pointer; }
.admin-link:hover { background:#fff7f0; }
</style>
```

- [ ] **Step 4: AdminPrinters.vue**

```vue
<!-- web/src/views/admin/AdminPrinters.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">🖨️ 打印机管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="grid-2">
      <div v-for="p in printers" :key="p.id" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-weight:700">{{ p.name }}</span>
          <span :class="['badge','badge-'+p.status]">{{ statusLabel[p.status] }}</span>
        </div>
        <div style="color:var(--muted);font-size:13px;margin-bottom:10px">📍 {{ p.location }}</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <select v-model="p.status" class="input" style="flex:1;padding:6px 10px;font-size:13px" @change="updateStatus(p)">
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="busy">忙碌</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px">
          <span>📄 剩余：</span>
          <input type="number" v-model.number="p.paper_remaining" class="input" style="flex:1;padding:6px 10px;font-size:13px"/>
          <button class="btn btn-green" style="padding:6px 12px;font-size:12px" @click="updatePaper(p)">更新</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const printers = ref([])
const statusLabel = { online:'在线', offline:'离线', busy:'忙碌' }

onMounted(async () => {
  const { data } = await api.get('/api/printers')
  printers.value = data
})

async function updateStatus(p) {
  await api.put(`/api/printers/${p.id}`, { status: p.status })
}

async function updatePaper(p) {
  await api.put(`/api/printers/${p.id}`, { paper_remaining: p.paper_remaining })
  alert('已更新')
}
</script>
```

- [ ] **Step 5: AdminGroups.vue**

```vue
<!-- web/src/views/admin/AdminGroups.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">📸 相片编组</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="section-title" style="font-size:15px">上传新编组</div>
      <input type="file" accept="image/*" multiple @change="onFiles" class="input" style="margin-bottom:10px"/>
      <input class="input" v-model="title" placeholder="编组名称" style="margin-bottom:10px"/>
      <button class="btn btn-primary" @click="upload" :disabled="!files.length">📤 上传</button>
      <div v-if="newGroup" style="margin-top:12px;padding:12px;background:#fff3e0;border-radius:10px;font-size:14px">
        ✅ 上传成功！访问码：<strong style="font-size:20px;color:var(--primary)">{{ newGroup.code }}</strong>
      </div>
    </div>
    <div class="grid-2">
      <div v-for="g in groups" :key="g.id" class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700">{{ g.title }}</span>
          <span :class="['badge',g.is_paid?'badge-online':'badge-offline']">{{ g.is_paid?'已付款':'未付款' }}</span>
        </div>
        <div style="font-size:13px;color:var(--muted)">访问码：{{ g.code }}</div>
        <div style="font-size:13px;color:var(--muted)">{{ g.photos?.length || 0 }} 张照片</div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <img v-for="(p,i) in (g.photos||[]).slice(0,4)" :key="i" :src="p.thumbnail" style="width:48px;height:48px;object-fit:cover;border-radius:6px"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const groups = ref([]), files = ref([]), title = ref(''), newGroup = ref(null)

onMounted(async () => {
  const { data } = await api.get('/api/groups')
  groups.value = data
})

function onFiles(e) { files.value = Array.from(e.target.files) }

async function upload() {
  const fd = new FormData()
  files.value.forEach(f => fd.append('photos', f))
  fd.append('title', title.value || '未命名编组')
  const { data } = await api.post('/api/groups', fd)
  newGroup.value = data
  const { data: list } = await api.get('/api/groups')
  groups.value = list
  files.value = []; title.value = ''
}
</script>
```

- [ ] **Step 6: AdminOrders.vue**

```vue
<!-- web/src/views/admin/AdminOrders.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">📦 订单管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div v-for="o in orders" :key="o.id" class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:700">{{ o.customer_name }} · {{ o.phone }}</span>
        <span :class="['badge', statusClass[o.delivery_status]]">{{ statusLabel[o.delivery_status] }}</span>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">📍 {{ o.address }}</div>
      <div style="font-size:13px;margin-bottom:10px">{{ o.items?.map(i=>i.name+'×'+i.qty).join('、') }} · ¥{{ o.total_price?.toFixed(1) }}</div>
      <div style="display:flex;gap:8px">
        <button v-if="o.delivery_status==='packing'" class="btn btn-primary" style="font-size:13px;padding:6px 14px" @click="update(o,'shipping')">→ 配送中</button>
        <button v-if="o.delivery_status==='shipping'" class="btn btn-green" style="font-size:13px;padding:6px 14px" @click="update(o,'delivered')">→ 已送达</button>
        <span v-if="o.delivery_status==='delivered'" style="color:#27ae60;font-size:13px;font-weight:600">✅ 已完成</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const orders = ref([])
const statusLabel = { packing:'配货中', shipping:'配送中', delivered:'已送达' }
const statusClass = { packing:'badge-busy', shipping:'badge-online', delivered:'badge-offline' }

onMounted(async () => {
  const { data } = await api.get('/api/shop/orders')
  orders.value = data
})

async function update(o, status) {
  await api.put(`/api/shop/orders/${o.id}`, { delivery_status: status })
  o.delivery_status = status
}
</script>
```

- [ ] **Step 7: AdminAccounts.vue**

```vue
<!-- web/src/views/admin/AdminAccounts.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">👥 账号管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="section-title" style="font-size:15px">创建子管理员</div>
      <input class="input" v-model="form.username" placeholder="用户名" style="margin-bottom:10px"/>
      <input class="input" v-model="form.password" type="password" placeholder="密码" style="margin-bottom:10px"/>
      <select v-model="form.role" class="input" style="margin-bottom:10px">
        <option value="printer_op">打印机管理员</option>
        <option value="shop_op">商城管理员</option>
      </select>
      <button class="btn btn-primary" @click="create">➕ 创建</button>
    </div>
    <div v-for="a in admins" :key="a.id" class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <span style="font-size:24px">👤</span>
        <div style="flex:1">
          <div style="font-weight:700">{{ a.username }}</div>
          <div style="font-size:13px;color:var(--muted)">{{ roleLabel[a.role] }}</div>
        </div>
        <span :class="['badge', a.role==='super'?'badge-online':a.role==='printer_op'?'badge-busy':'badge-offline']">{{ roleLabel[a.role] }}</span>
      </div>
      <div v-if="a.role==='printer_op'" style="font-size:13px">
        <div style="margin-bottom:4px;font-weight:600">分配打印机：</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <label v-for="p in allPrinters" :key="p.id" style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
            <input type="checkbox" :value="p.id" v-model="a.assignedPrinters"/>
            {{ p.name }}
          </label>
        </div>
        <button class="btn btn-ghost" style="padding:4px 12px;font-size:12px" @click="saveAccess(a)">保存权限</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const admins = ref([]), allPrinters = ref([])
const form = ref({ username:'', password:'', role:'printer_op' })
const roleLabel = { super:'超级管理员', printer_op:'打印机管理员', shop_op:'商城管理员' }

onMounted(async () => {
  const [{ data: a }, { data: p }] = await Promise.all([
    api.get('/api/admin/admins'),
    api.get('/api/printers')
  ])
  // Add assignedPrinters tracking array to each printer_op admin
  admins.value = a.map(x => ({ ...x, assignedPrinters: [] }))
  allPrinters.value = p
})

async function create() {
  await api.post('/api/admin/admins', form.value)
  const { data } = await api.get('/api/admin/admins')
  admins.value = data.map(x => ({ ...x, assignedPrinters: [] }))
  form.value = { username:'', password:'', role:'printer_op' }
}

async function saveAccess(a) {
  await api.put(`/api/admin/admins/${a.id}/access`, { printer_ids: a.assignedPrinters })
  alert('权限已保存')
}
</script>
```

- [ ] **Step 8: Commit all admin pages**

```bash
cd /Users/demean20/Desktop/121605打印机demo
git add web/src/views/admin/
git commit -m "feat: admin Vue pages (dashboard, printers, groups, orders, accounts)"
```

---

## Chunk 4: WeChat Mini-Program

### Task 13: Mini-program setup

**Files:**
- Create: `weapp/app.js`
- Create: `weapp/app.json`
- Create: `weapp/utils/api.js`
- Create: `weapp/pages/index/`, `printers/`, `print/`, `shop/`, `order/`, `admin/`

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/demean20/Desktop/121605打印机demo
mkdir -p weapp/utils
mkdir -p weapp/pages/index weapp/pages/printers weapp/pages/print
mkdir -p weapp/pages/shop weapp/pages/order weapp/pages/admin
```

- [ ] **Step 2: Write app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pages/printers/printers",
    "pages/print/print",
    "pages/shop/shop",
    "pages/order/order",
    "pages/admin/admin"
  ],
  "window": {
    "navigationBarTitleText": "打印小站",
    "navigationBarBackgroundColor": "#FF6B6B",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#FFFBF5"
  },
  "tabBar": {
    "color": "#999",
    "selectedColor": "#FF6B6B",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/printers/printers", "text": "打印机" },
      { "pagePath": "pages/print/print", "text": "打印" },
      { "pagePath": "pages/shop/shop", "text": "商城" },
      { "pagePath": "pages/admin/admin", "text": "管理" }
    ]
  }
}
```

- [ ] **Step 3: Write app.js**

```js
// weapp/app.js
App({
  globalData: { apiBase: 'http://localhost:3000', token: '' }
})
```

- [ ] **Step 4: Write utils/api.js**

```js
// weapp/utils/api.js
const app = getApp()

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('token')
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      success: res => resolve(res.data),
      fail: reject
    })
  })
}

module.exports = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
}
```

- [ ] **Step 5: Write pages/index/**

```js
// weapp/pages/index/index.js
Page({
  onLoad() {},
  goPage(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }) }
})
```

```xml
<!-- weapp/pages/index/index.wxml -->
<view class="page">
  <view class="hero">
    <text class="hero-emoji">🖨️</text>
    <text class="hero-title">打印小站</text>
    <text class="hero-sub">快速打印 · 相片分享 · 本地配送</text>
  </view>
  <view class="grid">
    <view class="card" bindtap="goPage" data-url="/pages/print/print">
      <text class="icon">📄</text><text class="label">自助打印</text>
    </view>
    <view class="card" bindtap="goPage" data-url="/pages/print/print?tab=group">
      <text class="icon">📸</text><text class="label">编组相片</text>
    </view>
    <view class="card" bindtap="goPage" data-url="/pages/printers/printers">
      <text class="icon">🖨️</text><text class="label">打印机状态</text>
    </view>
    <view class="card" bindtap="goPage" data-url="/pages/shop/shop">
      <text class="icon">🛍️</text><text class="label">商城</text>
    </view>
  </view>
</view>
```

```css
/* weapp/pages/index/index.wxss */
.page { background: #FFFBF5; min-height: 100vh; }
.hero { text-align: center; padding: 48rpx 32rpx; background: linear-gradient(135deg,#ff6b6b22,#ffd93d22); }
.hero-emoji { font-size: 96rpx; display: block; }
.hero-title { font-size: 56rpx; font-weight: 900; color: #FF6B6B; display: block; }
.hero-sub { font-size: 28rpx; color: #999; display: block; margin-top: 8rpx; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; padding: 32rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 40rpx 20rpx; text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,.08); }
.icon { font-size: 64rpx; display: block; margin-bottom: 12rpx; }
.label { font-size: 28rpx; font-weight: 700; }
```

- [ ] **Step 6: Write printers page**

```js
// weapp/pages/printers/printers.js
const api = require('../../utils/api')
Page({
  data: { printers: [] },
  async onLoad() {
    try {
      // Use public endpoint — no auth required for customer-facing printer list
      const data = await api.get('/api/printers/public')
      this.setData({ printers: data })
    } catch { wx.showToast({ title:'加载失败', icon:'none' }) }
  }
})
```

```xml
<!-- weapp/pages/printers/printers.wxml -->
<view class="page">
  <view class="title">🖨️ 打印机状态</view>
  <view class="card" wx:for="{{printers}}" wx:key="id">
    <view class="row">
      <text class="name">{{item.name}}</text>
      <text class="badge {{item.status}}">{{item.status === 'online' ? '在线' : item.status === 'busy' ? '忙碌' : '离线'}}</text>
    </view>
    <text class="loc">📍 {{item.location}}</text>
    <text class="paper">📄 剩余纸张：{{item.paper_remaining}} 张</text>
  </view>
</view>
```

```css
/* weapp/pages/printers/printers.wxss */
.page { background:#FFFBF5; min-height:100vh; padding:24rpx; }
.title { font-size:36rpx; font-weight:800; margin-bottom:24rpx; }
.card { background:#fff; border-radius:24rpx; padding:24rpx; margin-bottom:20rpx; box-shadow:0 4rpx 16rpx rgba(0,0,0,.06); }
.row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8rpx; }
.name { font-weight:700; font-size:30rpx; }
.badge { padding:4rpx 16rpx; border-radius:99rpx; font-size:22rpx; font-weight:600; }
.online { background:#e8f9ec; color:#27ae60; }
.busy { background:#fff3e0; color:#e67e22; }
.offline { background:#f0f0f0; color:#999; }
.loc, .paper { font-size:24rpx; color:#999; display:block; margin-top:6rpx; }
```

- [ ] **Step 7: Write print page (group tab)**

```js
// weapp/pages/print/print.js
const api = require('../../utils/api')
Page({
  data: { tab: 'group', code: '', group: null, error: '' },
  onLoad(options) { if (options.tab) this.setData({ tab: options.tab }) },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, group: null, error: '' }) },
  onCodeInput(e) { this.setData({ code: e.detail.value }) },
  async lookup() {
    try {
      const data = await api.get(`/api/groups/by-code/${this.data.code}`)
      this.setData({ group: data, error: '' })
    } catch { this.setData({ error: '未找到该编号' }) }
  },
  async pay() {
    await api.post(`/api/groups/${this.data.group.id}/pay`, {})
    const data = await api.get(`/api/groups/${this.data.group.id}`)
    this.setData({ group: data })
    wx.showToast({ title: '付款成功', icon: 'success' })
  },
  async download() {
    const data = await api.get(`/api/groups/${this.data.group.id}/download`)
    wx.showModal({ title: '下载链接', content: data.originals.join('\n'), showCancel: false })
  }
})
```

```xml
<!-- weapp/pages/print/print.wxml -->
<view class="page">
  <view class="tabs">
    <view class="tab {{tab==='group'?'active':''}}" bindtap="switchTab" data-tab="group">编组相片</view>
    <view class="tab {{tab==='self'?'active':''}}" bindtap="switchTab" data-tab="self">自助打印</view>
  </view>
  <view wx:if="{{tab==='group'}}">
    <view wx:if="{{!group}}">
      <input class="input" placeholder="输入6位编号" value="{{code}}" bindinput="onCodeInput" maxlength="6"/>
      <button class="btn" bindtap="lookup">🔍 查找相片</button>
      <text wx:if="{{error}}" class="error">{{error}}</text>
    </view>
    <view wx:else>
      <text class="group-title">{{group.title}}</text>
      <view class="photo-grid">
        <image wx:for="{{group.thumbnails || group.images}}" wx:key="*this" src="{{item}}" class="photo" mode="aspectFill"/>
      </view>
      <button wx:if="{{!group.is_paid}}" class="btn btn-primary" bindtap="pay">💳 立即付款</button>
      <button wx:else class="btn btn-green" bindtap="download">⬇️ 下载原图</button>
    </view>
  </view>
  <view wx:if="{{tab==='self'}}">
    <text class="hint">自助打印请在网页端完成排版后提交</text>
  </view>
</view>
```

```css
/* weapp/pages/print/print.wxss */
.page { background:#FFFBF5; min-height:100vh; padding:24rpx; }
.tabs { display:flex; background:#fff; border-radius:20rpx; padding:8rpx; margin-bottom:24rpx; }
.tab { flex:1; text-align:center; padding:16rpx; border-radius:16rpx; font-size:28rpx; font-weight:600; color:#999; }
.tab.active { background:#FF6B6B; color:#fff; }
.input { background:#fff; border-radius:16rpx; padding:20rpx; font-size:28rpx; margin-bottom:20rpx; width:100%; }
.btn { background:#FF6B6B; color:#fff; border-radius:16rpx; padding:20rpx; font-size:28rpx; font-weight:700; margin-bottom:16rpx; border:none; width:100%; }
.btn-primary { background:#FF6B6B; }
.btn-green { background:#6BCB77; }
.error { color:#e74c3c; font-size:24rpx; }
.group-title { font-size:32rpx; font-weight:700; display:block; margin-bottom:16rpx; }
.photo-grid { display:flex; flex-wrap:wrap; gap:12rpx; margin-bottom:24rpx; }
.photo { width:200rpx; height:200rpx; border-radius:12rpx; }
.hint { font-size:28rpx; color:#999; text-align:center; display:block; margin-top:48rpx; }
```

- [ ] **Step 8: Write shop + order pages**

```js
// weapp/pages/shop/shop.js
const api = require('../../utils/api')
Page({
  data: { products: [], cart: [], showForm: false, form: { name:'', phone:'', address:'' }, orderId: '' },
  async onLoad() {
    const data = await api.get('/api/shop/products')
    this.setData({ products: data })
  },
  addCart(e) {
    const p = e.currentTarget.dataset.product
    const cart = this.data.cart
    const idx = cart.findIndex(i => i.id === p.id)
    if (idx >= 0) cart[idx].qty++
    else cart.push({ ...p, qty: 1 })
    this.setData({ cart })
  },
  get total() { return this.data.cart.reduce((s,i) => s + i.price * i.qty, 0).toFixed(1) },
  checkout() { this.setData({ showForm: true }) },
  onInput(e) {
    const form = { ...this.data.form }
    form[e.currentTarget.dataset.field] = e.detail.value
    this.setData({ form })
  },
  async placeOrder() {
    const { name, phone, address } = this.data.form
    const total = this.data.cart.reduce((s,i) => s + i.price * i.qty, 0)
    const data = await api.post('/api/shop/orders', {
      customer_name: name, phone, address,
      items: this.data.cart.map(i => ({ id:i.id, name:i.name, qty:i.qty, price:i.price })),
      total_price: total
    })
    this.setData({ orderId: data.id, cart: [], showForm: false })
    wx.showToast({ title: '下单成功', icon: 'success' })
  },
  viewOrder() { wx.navigateTo({ url: `/pages/order/order?id=${this.data.orderId}` }) }
})
```

```xml
<!-- weapp/pages/shop/shop.wxml -->
<view class="page">
  <view class="title">🛍️ 商城</view>
  <view class="grid">
    <view class="card" wx:for="{{products}}" wx:key="id">
      <text class="p-name">{{item.name}}</text>
      <text class="p-desc">{{item.description}}</text>
      <view class="p-bottom">
        <text class="p-price">¥{{item.price}}</text>
        <button class="add-btn" bindtap="addCart" data-product="{{item}}">+</button>
      </view>
    </view>
  </view>
  <view wx:if="{{cart.length}}" class="cart-panel">
    <text class="cart-title">购物车</text>
    <view wx:for="{{cart}}" wx:key="id" class="cart-row">
      <text>{{item.name}} ×{{item.qty}}</text>
      <text>¥{{item.price * item.qty}}</text>
    </view>
    <button wx:if="{{!showForm}}" class="btn" bindtap="checkout">去结算</button>
    <view wx:else>
      <input class="input" placeholder="姓名" data-field="name" bindinput="onInput"/>
      <input class="input" placeholder="手机号" data-field="phone" bindinput="onInput"/>
      <input class="input" placeholder="地址" data-field="address" bindinput="onInput"/>
      <button class="btn" bindtap="placeOrder">💳 下单</button>
    </view>
  </view>
  <view wx:if="{{orderId}}" class="success-bar" bindtap="viewOrder">
    ✅ 下单成功，查看订单状态 →
  </view>
</view>
```

```css
/* weapp/pages/shop/shop.wxss */
.page{background:#FFFBF5;min-height:100vh;padding:24rpx;}
.title{font-size:36rpx;font-weight:800;margin-bottom:24rpx;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20rpx;margin-bottom:24rpx;}
.card{background:#fff;border-radius:20rpx;padding:20rpx;box-shadow:0 4rpx 16rpx rgba(0,0,0,.06);}
.p-name{font-weight:700;font-size:26rpx;display:block;}
.p-desc{font-size:22rpx;color:#999;display:block;margin:6rpx 0;}
.p-bottom{display:flex;justify-content:space-between;align-items:center;}
.p-price{font-size:28rpx;font-weight:800;color:#FF6B6B;}
.add-btn{background:#FF6B6B;color:#fff;border-radius:99rpx;width:56rpx;height:56rpx;font-size:36rpx;line-height:56rpx;text-align:center;border:none;}
.cart-panel{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;}
.cart-title{font-weight:700;font-size:28rpx;display:block;margin-bottom:12rpx;}
.cart-row{display:flex;justify-content:space-between;padding:8rpx 0;font-size:26rpx;}
.input{background:#f5f5f5;border-radius:12rpx;padding:16rpx;font-size:26rpx;margin-bottom:12rpx;width:100%;}
.btn{background:#FF6B6B;color:#fff;border-radius:16rpx;padding:20rpx;font-size:28rpx;font-weight:700;border:none;width:100%;margin-top:8rpx;}
.success-bar{background:#e8f9ec;border-radius:16rpx;padding:20rpx;text-align:center;font-size:28rpx;font-weight:600;color:#27ae60;}
```

```js
// weapp/pages/order/order.js
const api = require('../../utils/api')
Page({
  data: { order: null },
  async onLoad(options) {
    const data = await api.get(`/api/shop/orders/${options.id}`)
    this.setData({ order: data })
  }
})
```

```xml
<!-- weapp/pages/order/order.wxml -->
<view class="page">
  <view class="title">📦 订单状态</view>
  <view wx:if="{{order}}" class="card">
    <text class="cname">{{order.customer_name}}</text>
    <text class="addr">📍 {{order.address}}</text>
    <view class="steps">
      <view class="step {{order.delivery_status==='packing'||order.delivery_status==='shipping'||order.delivery_status==='delivered'?'active':''}}">
        <text class="dot">📦</text><text class="slabel">配货中</text>
      </view>
      <view class="step-line"></view>
      <view class="step {{order.delivery_status==='shipping'||order.delivery_status==='delivered'?'active':''}}">
        <text class="dot">🚚</text><text class="slabel">配送中</text>
      </view>
      <view class="step-line"></view>
      <view class="step {{order.delivery_status==='delivered'?'active':''}}">
        <text class="dot">✅</text><text class="slabel">已送达</text>
      </view>
    </view>
  </view>
</view>
```

```css
/* weapp/pages/order/order.wxss */
.page{background:#FFFBF5;min-height:100vh;padding:24rpx;}
.title{font-size:36rpx;font-weight:800;margin-bottom:24rpx;}
.card{background:#fff;border-radius:24rpx;padding:32rpx;}
.cname{font-weight:700;font-size:30rpx;display:block;}
.addr{font-size:24rpx;color:#999;display:block;margin:8rpx 0 24rpx;}
.steps{display:flex;align-items:center;justify-content:center;}
.step{display:flex;flex-direction:column;align-items:center;gap:8rpx;flex:1;}
.step-line{flex:1;height:4rpx;background:#eee;margin:0 8rpx;margin-bottom:32rpx;}
.dot{font-size:48rpx;opacity:.3;}
.step.active .dot{opacity:1;}
.slabel{font-size:22rpx;color:#999;}
.step.active .slabel{color:#27ae60;font-weight:700;}
```

- [ ] **Step 9: Write admin page**

```js
// weapp/pages/admin/admin.js
const api = require('../../utils/api')
Page({
  data: { loggedIn: false, username: '', password: '', role: '', error: '' },
  onLoad() {
    const token = wx.getStorageSync('token')
    if (token) this.setData({ loggedIn: true, role: wx.getStorageSync('role') })
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }) },
  async login() {
    try {
      const data = await api.post('/api/auth/login', { username: this.data.username, password: this.data.password })
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('role', data.role)
      getApp().globalData.token = data.token
      this.setData({ loggedIn: true, role: data.role, error: '' })
    } catch { this.setData({ error: '用户名或密码错误' }) }
  },
  logout() {
    wx.removeStorageSync('token'); wx.removeStorageSync('role')
    getApp().globalData.token = ''
    this.setData({ loggedIn: false })
  }
})
```

```xml
<!-- weapp/pages/admin/admin.wxml -->
<view class="page">
  <view wx:if="{{!loggedIn}}">
    <view class="login-box">
      <text class="emoji">🔐</text>
      <text class="login-title">管理员登录</text>
      <input class="input" placeholder="用户名" data-field="username" bindinput="onInput"/>
      <input class="input" type="password" placeholder="密码" data-field="password" bindinput="onInput"/>
      <button class="btn" bindtap="login">登录</button>
      <text wx:if="{{error}}" class="error">{{error}}</text>
      <text class="hint">演示账号：admin / admin123</text>
    </view>
  </view>
  <view wx:else>
    <text class="welcome">👋 已登录（{{role}}）</text>
    <text class="tip">完整管理功能请使用网页端后台</text>
    <button class="logout-btn" bindtap="logout">退出登录</button>
  </view>
</view>
```

```css
/* weapp/pages/admin/admin.wxss */
.page{background:#FFFBF5;min-height:100vh;padding:24rpx;}
.login-box{background:#fff;border-radius:24rpx;padding:48rpx 32rpx;margin-top:60rpx;}
.emoji{font-size:80rpx;text-align:center;display:block;}
.login-title{font-size:40rpx;font-weight:800;text-align:center;display:block;margin:16rpx 0 32rpx;}
.input{background:#f5f5f5;border-radius:12rpx;padding:20rpx;font-size:28rpx;margin-bottom:16rpx;width:100%;}
.btn{background:#FF6B6B;color:#fff;border-radius:16rpx;padding:24rpx;font-size:30rpx;font-weight:700;border:none;width:100%;}
.error{color:#e74c3c;font-size:24rpx;text-align:center;display:block;margin-top:12rpx;}
.hint{color:#999;font-size:22rpx;text-align:center;display:block;margin-top:16rpx;}
.welcome{font-size:36rpx;font-weight:700;display:block;margin-bottom:16rpx;}
.tip{font-size:26rpx;color:#999;display:block;margin-bottom:32rpx;}
.logout-btn{background:#f5f5f5;color:#333;border-radius:16rpx;padding:20rpx;font-size:28rpx;border:none;width:100%;}
```

- [ ] **Step 10: Write page .json config files (required by WeChat DevTools)**

Each page needs a `.json` file or DevTools will error. Write empty configs:

```bash
for page in index printers print shop order admin; do
  echo '{}' > weapp/pages/$page/$page.json
done
```

- [ ] **Step 11: Write weapp/project.config.json**

Place this inside `weapp/` so WeChat DevTools finds the source root correctly:

```json
{
  "appid": "wx0000000000000000",
  "projectname": "printer-demo",
  "compileType": "miniprogram",
  "miniprogramRoot": "./",
  "setting": { "urlCheck": false }
}
```

- [ ] **Step 12: Commit mini-program**

```bash
cd /Users/demean20/Desktop/121605打印机demo
git add weapp/
git commit -m "feat: WeChat mini-program pages (index, printers, print, shop, order, admin)"
```

---

## Chunk 5: Final Integration

### Task 14: Build Vue and verify full stack

- [ ] **Step 1: Build Vue 3**

```bash
cd /Users/demean20/Desktop/121605打印机demo/web
npm run build
```

Expected: `web/dist/` created, no errors.

- [ ] **Step 2: Start server and verify web**

```bash
cd /Users/demean20/Desktop/121605打印机demo
node server/index.js &
sleep 2
curl -s http://localhost:3000/ | head -5
```

Expected: HTML response with Vue app.

- [ ] **Step 3: Kill old process and verify API**

```bash
curl -s http://localhost:3000/api/shop/products | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d).length,'products'))"
kill %1
```

Expected: `4 products`

- [ ] **Step 4: Update README**

```bash
cat > /Users/demean20/Desktop/121605打印机demo/README.md << 'EOF'
# 打印小站 Demo

## 快速启动

```bash
npm install
npm start          # 后端 http://localhost:3000

cd web
npm install
npm run dev        # Vue 开发服务器 http://localhost:5173
```

## 演示账号
- 管理员：admin / admin123

## 功能
- 打印机状态管理（含纸张余量）
- 相片编组（上传→6位码→付款→下载）
- 自助打印（自动排版）
- 证件照处理
- 商城 + 本地配送状态跟踪
- 权限体系（超级/打印机/商城管理员）
- 微信小程序（weapp/）

## 项目结构
- server/    Express后端 + SQLite
- web/       Vue 3 前端
- weapp/     微信小程序
- uploads/   上传文件
- data.db    SQLite数据库
EOF
```

- [ ] **Step 5: Final commit**

```bash
cd /Users/demean20/Desktop/121605打印机demo
git add README.md
git commit -m "chore: update README for new project"
```
