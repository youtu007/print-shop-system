const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { pay, config, code2openid, getPhoneByCode } = require('../utils/wechatpay');

// POST /api/payment/login — 小程序 wx.login code 换 openid
router.post('/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  if (!config.appid || config.appid === 'your_appid') {
    return res.status(503).json({ error: '微信AppID未配置，请在环境变量中设置WECHAT_APPID' });
  }
  try {
    const result = await code2openid(code);
    res.json({ openid: result.openid });
  } catch (e) {
    console.error('[payment/login] code2openid失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payment/user-phone — getPhoneNumber code 换手机号
router.post('/user-phone', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!config.appid || !config.appsecret) {
    return res.status(503).json({ error: '微信AppID或Secret未配置' });
  }
  try {
    const phone = await getPhoneByCode(code);
    res.json({ phone });
  } catch (e) {
    console.error('[user-phone]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payment/prepay — JSAPI 统一下单
router.post('/prepay', async (req, res) => {
  const { openid, order_id, order_type, description, total_amount } = req.body;
  if (!openid || !order_id || !total_amount) {
    return res.status(400).json({ error: 'missing required fields' });
  }
  if (!pay) return res.status(503).json({ error: '微信支付未配置' });

  const out_trade_no = `${(order_type || 'ORDER').toUpperCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const paymentId = uuidv4();

  try {
    await db.run(
      `INSERT INTO payment_orders (id, out_trade_no, order_id, order_type, openid, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [paymentId, out_trade_no, order_id, order_type || 'shop', openid, total_amount, Date.now()]
    );

    const result = await pay.transactions_jsapi({
      description: description || '打印店订单',
      out_trade_no,
      notify_url: config.notify_url.trim(),
      amount: { total: Math.round(total_amount * 100), currency: 'CNY' },
      payer: { openid }
    });
    const params = result.data || result;
    console.log('[prepay] params:', JSON.stringify(params));
    res.json({ ...params, timeStamp: String(params.timeStamp), out_trade_no });
  } catch (e) {
    await db.run('UPDATE payment_orders SET status = ? WHERE id = ?', ['failed', paymentId]);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/status/:out_trade_no — 查询支付状态
router.get('/status/:out_trade_no', async (req, res) => {
  try {
    const po = await db.get('SELECT * FROM payment_orders WHERE out_trade_no = ?', [req.params.out_trade_no]);
    if (!po) return res.status(404).json({ error: 'not found' });
    res.json(po);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 微信支付异步回调处理
async function handleNotify(req, res) {
  if (!pay) return res.status(503).json({ code: 'FAIL', message: '微信支付未配置' });
  try {
    const body = JSON.parse(req.body.toString());
    const { ciphertext, associated_data, nonce } = body.resource;
    const result = pay.decipher_gcm(ciphertext, associated_data, nonce, config.apiV3Key);
    const { out_trade_no, trade_state, transaction_id } = result;

    if (trade_state === 'SUCCESS') {
      await db.run(
        'UPDATE payment_orders SET status = ?, transaction_id = ?, paid_at = ? WHERE out_trade_no = ?',
        ['paid', transaction_id, Date.now(), out_trade_no]
      );
      const po = await db.get('SELECT * FROM payment_orders WHERE out_trade_no = ?', [out_trade_no]);
      if (po) {
        if (po.order_type === 'shop') {
          await db.run('UPDATE shop_orders SET is_paid = 1 WHERE id = ?', [po.order_id]);
        } else if (po.order_type === 'group') {
          await db.run('UPDATE photo_groups SET is_paid = 1 WHERE id = ?', [po.order_id]);
        } else if (po.order_type === 'print') {
          // 自助打印订单，payment_orders 记录即可
        }
      }
    }
    res.json({ code: 'SUCCESS', message: '' });
  } catch (e) {
    console.error('[payment notify] error:', e);
    res.status(500).json({ code: 'FAIL', message: e.message });
  }
}

module.exports = { router, handleNotify };
