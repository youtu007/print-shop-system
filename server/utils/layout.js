// server/utils/layout.js
const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SIZE_MAP = {
  '1寸': { w: 295, h: 413 },
  '2寸': { w: 413, h: 579 },
  '3寸': { w: 886, h: 591 },
  '5寸': { w: 1500, h: 1050 },
  '6寸': { w: 1800, h: 1200 },
  'A4':  { w: 2480, h: 3508 },
};

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
