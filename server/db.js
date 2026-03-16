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
