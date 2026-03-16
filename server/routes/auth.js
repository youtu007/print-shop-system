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
  res.json({ ok: true });
});

module.exports = router;
