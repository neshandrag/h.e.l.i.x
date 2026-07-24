// public/helix-icon.png is a flat, fully-opaque icon (light glyph on a solid
// dark background, no real alpha channel) with a lot of empty padding around
// the actual glyph. This derives transparency from luminance relative to the
// background tone, recolors the glyph with the brand gradient (emerald accent
// -> soft green), and crops to that bounding box so the icon fills its
// rendered size instead of mostly padding.
// Run with:
//   node scripts/recolor-icon.js
// Requires `pngjs` (installed as a dev dependency).
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, '..', 'public', 'helix-icon.png');
const OUT = path.join(__dirname, '..', 'public', 'helix-icon-gradient.png');

// Theme accent: --accent #2ECC71 → --accent-2 #A8E6C1
const TOP = [46, 204, 113];
const BOTTOM = [168, 230, 193];
const PADDING = 6;

const src = PNG.sync.read(fs.readFileSync(SRC));

const bgLuminance = 0.2126 * src.data[0] + 0.7152 * src.data[1] + 0.0722 * src.data[2];

function alphaAt(x, y) {
  const i = (src.width * y + x) << 2;
  const luminance = 0.2126 * src.data[i] + 0.7152 * src.data[i + 1] + 0.0722 * src.data[i + 2];
  const rawAlpha = Math.max(0, Math.min(1, (luminance - bgLuminance) / (255 - bgLuminance)));
  return rawAlpha ** 0.6;
}

let minX = src.width;
let maxX = 0;
let minY = src.height;
let maxY = 0;
const THRESHOLD = 0.08;

for (let y = 0; y < src.height; y += 1) {
  for (let x = 0; x < src.width; x += 1) {
    if (alphaAt(x, y) > THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const glyphW = maxX - minX + 1;
const glyphH = maxY - minY + 1;
const outW = glyphW + PADDING * 2;
const outH = glyphH + PADDING * 2;
const out = new PNG({ width: outW, height: outH });

for (let y = 0; y < glyphH; y += 1) {
  const t = y / (glyphH - 1);
  const r = Math.round(TOP[0] + (BOTTOM[0] - TOP[0]) * t);
  const g = Math.round(TOP[1] + (BOTTOM[1] - TOP[1]) * t);
  const b = Math.round(TOP[2] + (BOTTOM[2] - TOP[2]) * t);
  for (let x = 0; x < glyphW; x += 1) {
    const a = alphaAt(minX + x, minY + y);
    const di = (outW * (y + PADDING) + (x + PADDING)) << 2;
    out.data[di] = r;
    out.data[di + 1] = g;
    out.data[di + 2] = b;
    out.data[di + 3] = Math.round(a * 255);
  }
}

fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(
  `Wrote ${OUT} (${outW}x${outH}), cropped from glyph bbox [${minX},${minY}]-[${maxX},${maxY}] of source ${src.width}x${src.height}`
);
