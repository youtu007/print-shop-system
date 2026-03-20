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
const productCount = db.prepare('SELECT COUNT(*) as c FROM shop_products').get().c;
if (adminCount === 0 || productCount === 0) {
  const { v4: uuidv4 } = require('uuid');
  const crypto = require('crypto');
  // Use PBKDF2 with random salt: store as "salt:hash"
  const hash = (p) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex'); };

  const superId = uuidv4();
  db.prepare(`INSERT INTO admins VALUES (?,?,?,?,?)`).run(superId, 'admin', hash('admin123'), 'super', Date.now());
  db.prepare(`INSERT INTO admins VALUES (?,?,?,?,?)`).run(uuidv4(), 'printer_user', hash('123456'), 'printer_op', Date.now());
  db.prepare(`INSERT INTO admins VALUES (?,?,?,?,?)`).run(uuidv4(), 'shop_user', hash('123456'), 'shop_op', Date.now());
  db.prepare(`INSERT INTO admins VALUES (?,?,?,?,?)`).run(uuidv4(), 'delivery_user', hash('123456'), 'delivery_op', Date.now());

  const p1 = uuidv4(), p2 = uuidv4(), p3 = uuidv4();
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p1, '打印机-A', '前台', 'online', 450, Date.now());
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p2, '打印机-B', '二楼', 'busy', 120, Date.now());
  db.prepare(`INSERT INTO printers VALUES (?,?,?,?,?,?)`).run(p3, '打印机-C', '三楼', 'offline', 0, Date.now() - 7200000);

  const products = [
    // 基础文印 - A4
    [uuidv4(), 'A4黑白打印/复印', '单面普通纸', 1.0, null],
    [uuidv4(), 'A4彩色打印/复印', '单面普通纸', 2.0, null],
    // 基础文印 - A3
    [uuidv4(), 'A3黑白打印/复印', '单面普通纸', 2.0, null],
    [uuidv4(), 'A3彩色打印/复印', '单面普通纸', 4.0, null],
    // 证件照/小照片
    [uuidv4(), '6寸光面相片', '拍照+冲印', 8.0, null],
    [uuidv4(), '证件照电子档', '白底/蓝底/红底', 5.0, null],
    // 名片
    [uuidv4(), '名片制作', '铜版纸/哑粉纸，100张/盒', 30.0, null],
    [uuidv4(), '特种纸名片', '含烫金工艺', 50.0, null],
    // 装订装帧
    [uuidv4(), '无线胶装', 'A4≤50页，含皮纹纸封面', 8.0, null],
    [uuidv4(), '骑马钉装订', 'A4≤20页', 3.0, null],
    [uuidv4(), '铁圈装订', 'A4，含磨砂片', 15.0, null],
    [uuidv4(), '硬壳精装', 'A4/A3，含封面设计覆膜', 100.0, null],
    // 广告物料
    [uuidv4(), '宣传单页', '157g铜版纸A4/张', 1.5, null],
    [uuidv4(), '易拉宝', '80×200cm，含支架画面', 100.0, null],
    [uuidv4(), 'X展架', '60×160cm', 60.0, null],
    [uuidv4(), '背胶PP写真', '室内展板/㎡', 40.0, null],
    [uuidv4(), '条幅', '70cm常规/米', 10.0, null],
    [uuidv4(), '不干胶贴纸', '定制尺寸', 3.0, null],
    // 工程/特殊品
    [uuidv4(), 'CAD出图/A1', '白图', 5.0, null],
    [uuidv4(), 'CAD出图/A0', '白图', 8.0, null],
    [uuidv4(), '硫酸图打印', 'A1/A0，加急加价30%', 10.0, null],
    // 增值服务
    [uuidv4(), '塑封A4', '普通塑封膜', 3.0, null],
    [uuidv4(), '塑封A3', '普通塑封膜', 5.0, null],
    [uuidv4(), '文档扫描', '单页/多页', 2.0, null],
    [uuidv4(), '标书排版制作', '商务标书', 400.0, null],
  ];
  const ins = db.prepare(`INSERT INTO shop_products VALUES (?,?,?,?,?)`);
  products.forEach(p => ins.run(...p));
}

module.exports = db;
