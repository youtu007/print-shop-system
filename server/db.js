// server/db.js — MySQL via mysql2/promise
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const addr = process.env.MYSQL_ADDRESS || 'localhost:3306';
const colonIdx = addr.lastIndexOf(':');
const host = colonIdx > 0 ? addr.slice(0, colonIdx) : addr;
const port = colonIdx > 0 ? parseInt(addr.slice(colonIdx + 1)) : 3306;
const user = process.env.MYSQL_USERNAME || process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || process.env.TCB_MYSQL_DATABASE || 'printer_demo';

let pool;

const db = {
  async get(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },
  async all(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
  },

  async init() {
    // 1. 建库
    const conn = await mysql.createConnection({ host, port, user, password });
    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();

    // 2. 建连接池
    pool = mysql.createPool({
      host, port, user, password, database,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });

    // 3. 建表
    await db.run(`CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'printer_op',
      created_at BIGINT NOT NULL
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS admin_printer_access (
      admin_id VARCHAR(36) NOT NULL,
      printer_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (admin_id, printer_id)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS printers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      location VARCHAR(200) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'offline',
      paper_remaining INT NOT NULL DEFAULT 500,
      last_heartbeat BIGINT NOT NULL,
      ip_address VARCHAR(100) DEFAULT '',
      printer_type VARCHAR(50) DEFAULT 'doc',
      connection_type VARCHAR(50) DEFAULT 'network',
      is_active TINYINT(1) DEFAULT 1
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS photo_groups (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      code VARCHAR(10) NOT NULL UNIQUE,
      uploaded_by VARCHAR(36) NOT NULL,
      is_paid TINYINT(1) NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      photos TEXT NOT NULL,
      price DOUBLE NOT NULL DEFAULT 0
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS print_jobs (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      printer_id VARCHAR(36) NOT NULL,
      group_id VARCHAR(36),
      submitted_by VARCHAR(200),
      spec TEXT NOT NULL,
      layout_preview_url TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS shop_products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DOUBLE NOT NULL,
      image_url TEXT,
      need_file TINYINT(1) NOT NULL DEFAULT 0,
      file_type VARCHAR(50) DEFAULT 'doc',
      price_unit VARCHAR(50) DEFAULT 'per_item'
    )`);

    // 兼容已有数据库：增加新字段
    try {
      const cols = await db.all('SHOW COLUMNS FROM shop_products');
      const colNames = cols.map(c => c.Field);
      if (!colNames.includes('need_file')) await db.run('ALTER TABLE shop_products ADD COLUMN need_file TINYINT(1) NOT NULL DEFAULT 0');
      if (!colNames.includes('file_type')) await db.run("ALTER TABLE shop_products ADD COLUMN file_type VARCHAR(50) DEFAULT 'doc'");
      if (!colNames.includes('price_unit')) await db.run("ALTER TABLE shop_products ADD COLUMN price_unit VARCHAR(50) DEFAULT 'per_item'");
    } catch(e) {}

    await db.run(`CREATE TABLE IF NOT EXISTS shop_orders (
      id VARCHAR(36) PRIMARY KEY,
      customer_name VARCHAR(200) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT NOT NULL,
      items TEXT NOT NULL,
      total_price DOUBLE NOT NULL,
      is_paid TINYINT(1) NOT NULL DEFAULT 1,
      delivery_status VARCHAR(50) NOT NULL DEFAULT 'packing',
      created_at BIGINT NOT NULL
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS banners (
      id VARCHAR(36) PRIMARY KEY,
      image_url TEXT NOT NULL,
      link VARCHAR(500) DEFAULT '',
      sort INT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS payment_orders (
      id VARCHAR(36) PRIMARY KEY,
      out_trade_no VARCHAR(100) UNIQUE NOT NULL,
      order_id VARCHAR(36) NOT NULL,
      order_type VARCHAR(50) NOT NULL DEFAULT 'shop',
      openid VARCHAR(100) NOT NULL,
      total_amount DOUBLE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      transaction_id VARCHAR(100),
      created_at BIGINT NOT NULL,
      paid_at BIGINT
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )`);

    // 4. 种子数据
    const hash = (p) => {
      const salt = crypto.randomBytes(16).toString('hex');
      return salt + ':' + crypto.pbkdf2Sync(p, salt, 1000, 32, 'sha256').toString('hex');
    };

    const adminRow = await db.get('SELECT COUNT(*) as c FROM admins');
    if (adminRow.c === 0) {
      await db.run('INSERT INTO admins VALUES (?,?,?,?,?)', [uuidv4(), 'admin', hash('admin123'), 'super', Date.now()]);
      await db.run('INSERT INTO admins VALUES (?,?,?,?,?)', [uuidv4(), 'printer_user', hash('123456'), 'printer_op', Date.now()]);
      await db.run('INSERT INTO admins VALUES (?,?,?,?,?)', [uuidv4(), 'shop_user', hash('123456'), 'shop_op', Date.now()]);
      await db.run('INSERT INTO admins VALUES (?,?,?,?,?)', [uuidv4(), 'delivery_user', hash('123456'), 'delivery_op', Date.now()]);

      await db.run('INSERT INTO printers VALUES (?,?,?,?,?,?,?,?,?,?)', [uuidv4(), '打印机-A', '前台', 'online', 450, Date.now(), '192.168.1.100', 'both', 'network', 1]);
      await db.run('INSERT INTO printers VALUES (?,?,?,?,?,?,?,?,?,?)', [uuidv4(), '打印机-B', '二楼', 'busy', 120, Date.now(), '192.168.1.101', 'doc', 'network', 1]);
      await db.run('INSERT INTO printers VALUES (?,?,?,?,?,?,?,?,?,?)', [uuidv4(), '打印机-C', '三楼', 'offline', 0, Date.now() - 7200000, '', 'photo', 'usb', 0]);
    }

    const productRow = await db.get('SELECT COUNT(*) as c FROM shop_products');
    if (productRow.c === 0) {
      // [id, name, desc, price, image_url, need_file, file_type, price_unit]
      const products = [
        [uuidv4(), 'A4黑白打印/复印', '单面普通纸', 1.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), 'A4彩色打印/复印', '单面普通纸', 2.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), 'A3黑白打印/复印', '单面普通纸', 2.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), 'A3彩色打印/复印', '单面普通纸', 4.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '6寸光面相片', '拍照+冲印', 8.0, null, 1, 'photo', 'per_page'],
        [uuidv4(), '证件照电子档', '白底/蓝底/红底', 5.0, null, 1, 'photo', 'per_page'],
        [uuidv4(), '名片制作', '铜版纸/哑粉纸，100张/盒', 30.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '特种纸名片', '含烫金工艺', 50.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '无线胶装', 'A4≤50页，含皮纹纸封面', 8.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '骑马钉装订', 'A4≤20页', 3.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '铁圈装订', 'A4，含磨砂片', 15.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '硬壳精装', 'A4/A3，含封面设计覆膜', 100.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '宣传单页', '157g铜版纸A4/张', 1.5, null, 1, 'doc', 'per_page'],
        [uuidv4(), '易拉宝', '80×200cm，含支架画面', 100.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), 'X展架', '60×160cm', 60.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '背胶PP写真', '室内展板/㎡', 40.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '条幅', '70cm常规/米', 10.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '不干胶贴纸', '定制尺寸', 3.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), 'CAD出图/A1', '白图', 5.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), 'CAD出图/A0', '白图', 8.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '硫酸图打印', 'A1/A0，加急加价30%', 10.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '塑封A4', '普通塑封膜', 3.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '塑封A3', '普通塑封膜', 5.0, null, 0, 'doc', 'per_item'],
        [uuidv4(), '文档扫描', '单页/多页', 2.0, null, 1, 'doc', 'per_page'],
        [uuidv4(), '标书排版制作', '商务标书', 400.0, null, 1, 'doc', 'per_item'],
      ];
      for (const p of products) {
        await db.run('INSERT INTO shop_products VALUES (?,?,?,?,?,?,?,?)', p);
      }
    }

    const settingsRow = await db.get('SELECT COUNT(*) as c FROM settings');
    if (settingsRow.c === 0) {
      const defaultPrices = { photo: {'1寸':0.5,'2寸':0.8,'3寸':1.5,'5寸':3.0,'6寸':5.0,'A4':8.0}, doc: {color:2.0, bw:0.5} };
      await db.run('INSERT INTO settings (`key`, value) VALUES (?, ?)', ['print_prices', JSON.stringify(defaultPrices)]);
    }

    console.log('[db] MySQL 初始化完成，数据库：' + database);
  }
};

module.exports = db;
