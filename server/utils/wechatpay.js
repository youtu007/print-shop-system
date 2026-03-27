const fs = require('fs');
const path = require('path');
const https = require('https');

const config = {
  appid: process.env.WECHAT_APPID,
  appsecret: process.env.WECHAT_APPSECRET,
  mchid: process.env.WECHAT_MCHID,
  serial_no: process.env.WECHAT_SERIAL_NO,
  apiV3Key: process.env.WECHAT_API_KEY,
  notify_url: process.env.WECHAT_NOTIFY_URL,
};

// 初始化 wechatpay-node-v3 Payment 实例
let pay = null;
try {
  const certDir = path.join(__dirname, '..', 'certs');
  // 支持直接放在 certs/ 或放在子目录中（如微信下载的证书包）
  let certPath = path.join(certDir, 'apiclient_key.pem');
  if (!fs.existsSync(certPath)) {
    const subdirs = fs.readdirSync(certDir).filter(f => fs.statSync(path.join(certDir, f)).isDirectory());
    for (const d of subdirs) {
      const p = path.join(certDir, d, 'apiclient_key.pem');
      if (fs.existsSync(p)) { certPath = p; break; }
    }
  }
  // 同样查找公钥证书 apiclient_cert.pem
  let pubCertPath = certPath.replace('apiclient_key.pem', 'apiclient_cert.pem');

  if (fs.existsSync(certPath) && fs.existsSync(pubCertPath) && config.appid && config.mchid) {
    const Payment = require('wechatpay-node-v3');
    pay = new Payment({
      appid: config.appid,
      mchid: config.mchid,
      serial_no: config.serial_no,
      key: config.apiV3Key,
      privateKey: fs.readFileSync(certPath),
      publicKey: fs.readFileSync(pubCertPath),
    });
    console.log('[wechatpay] 微信支付初始化成功');
  } else {
    console.warn('[wechatpay] 证书文件或配置缺失，微信支付不可用');
  }
} catch (e) {
  console.warn('[wechatpay] 初始化失败:', e.message);
}

// 用小程序 code 换取 openid
function code2openid(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.appid}&secret=${config.appsecret}&js_code=${code}&grant_type=authorization_code`;
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: true, servername: 'api.weixin.qq.com' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.openid) resolve(result);
          else reject(new Error(result.errmsg || 'code2session failed'));
        } catch (e) { reject(e); }
      });
    }).on('error', (err) => {
      // 云环境 SSL 兼容：如果证书验证失败则跳过验证重试
      if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.message.includes('self-signed')) {
        https.get(url, { rejectUnauthorized: false }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.openid) resolve(result);
              else reject(new Error(result.errmsg || 'code2session failed'));
            } catch (e) { reject(e); }
          });
        }).on('error', reject);
      } else {
        reject(err);
      }
    });
  });
}

// access_token 内存缓存（过期前 5 分钟刷新）
let _tokenCache = { token: '', expireAt: 0 };

function httpsPost(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'api.weixin.qq.com',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      rejectUnauthorized: false,
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expireAt) {
    return Promise.resolve(_tokenCache.token);
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appsecret}`;
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.access_token) {
            _tokenCache = { token: r.access_token, expireAt: Date.now() + (r.expires_in - 300) * 1000 };
            resolve(r.access_token);
          } else {
            reject(new Error(r.errmsg || 'getAccessToken failed'));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getPhoneByCode(code) {
  const token = await getAccessToken();
  const result = await httpsPost(`/wxa/business/getuserphonenumber?access_token=${token}`, { code });
  if (result.errcode === 0 && result.phone_info) {
    return result.phone_info.phoneNumber;
  }
  throw new Error(result.errmsg || `getPhoneNumber failed (errcode: ${result.errcode})`);
}

module.exports = { pay, config, code2openid, getPhoneByCode };
