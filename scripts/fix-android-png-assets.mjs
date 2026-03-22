/**
 * Re-encode app PNGs as Android-friendly 8-bit sRGB PNGs.
 * Fixes AAPT "file failed to compile" on some exported PNGs (profiles, 16-bit, etc.).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '..', 'assets', 'images');

const files = ['icon.png', 'splash-icon.png', 'adaptive-icon.png', 'favicon.png'];

async function fixPng(name) {
  const p = path.join(imagesDir, name);
  if (!fs.existsSync(p)) {
    console.warn('skip (missing):', name);
    return;
  }
  const tmp = p + '.tmp.png';
  // Force 8-bit sRGB PNG without exotic chunks (fixes many AAPT compile failures).
  await sharp(p)
    .rotate()
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(tmp);
  fs.renameSync(tmp, p);
  console.log('fixed:', name);
}

for (const f of files) {
  await fixPng(f);
}
console.log('done');
