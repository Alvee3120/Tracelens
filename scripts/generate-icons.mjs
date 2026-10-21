#!/usr/bin/env node
/**
 * Zero-dependency PWA icon generator for TraceLens.
 *
 * Draws the TraceLens mark (a lens ring with a pen nib and a traced stroke)
 * into an RGBA buffer and encodes PNGs by hand (zlib deflate + CRC32), so the
 * repo needs no native image tooling.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs to public/: favicon.svg is hand-written, the PNGs are produced here.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const ICON_DIR = join(PUBLIC_DIR, 'icons');

const BG = [11, 11, 15, 255];
const ACCENT = [94, 234, 212, 255];
const ACCENT_DIM = [15, 118, 110, 255];
const PAPER = [241, 245, 249, 220];

/* ------------------------------------------------------------------ PNG ---- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------- raster ---- */

function createCanvas(size) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = BG[0];
    data[i * 4 + 1] = BG[1];
    data[i * 4 + 2] = BG[2];
    data[i * 4 + 3] = BG[3];
  }
  return data;
}

function blend(pixels, size, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const a = Math.max(0, Math.min(1, alpha));
  const srcA = (color[3] / 255) * a;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c += 1) {
    const src = color[c];
    const dst = pixels[i + c];
    pixels[i + c] = Math.round((src * srcA + dst * dstA * (1 - srcA)) / outA);
  }
  pixels[i + 3] = Math.round(outA * 255);
}

/** Signed distance from a point to a rounded rectangle (negative = inside). */
function roundedRectSdf(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function drawIcon(size, { maskable }) {
  const pixels = createCanvas(size);
  const s = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  // Maskable icons must keep their art inside a safe circle (~80% diameter).
  const inset = maskable ? size * 0.24 : size * 0.12;
  const ringRadius = size / 2 - inset;
  const ringWidth = Math.max(2, 26 * s);
  const innerRadius = ringRadius - ringWidth;

  // 1. Optional rounded-square plate for the maskable + "any" variants.
  if (!maskable) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const d = roundedRectSdf(x + 0.5, y + 0.5, cx, cy, size / 2, size / 2, size * 0.22);
        blend(pixels, size, x, y, [17, 17, 24, 255], Math.max(0, Math.min(1, 0.5 - d)));
      }
    }
  }

  // 2. Paper sheet tucked inside the lens, with faint guide lines.
  const paperHalfW = innerRadius * 0.62;
  const paperHalfH = innerRadius * 0.72;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = roundedRectSdf(x + 0.5, y + 0.5, cx, cy, paperHalfW, paperHalfH, 10 * s);
      blend(pixels, size, x, y, PAPER, Math.max(0, Math.min(1, 0.9 - d)));
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const y = cy - paperHalfH * 0.55 + (i * paperHalfH * 1.1) / 3;
    for (let x = cx - paperHalfW * 0.6; x < cx + paperHalfW * 0.6; x += 1) {
      blend(pixels, size, Math.round(x), Math.round(y), [100, 116, 139, 120], 0.5);
    }
  }

  // 3. Traced stroke across the paper (the "sketch").
  const stroke = [
    [cx - paperHalfW * 0.5, cy + paperHalfH * 0.4],
    [cx - paperHalfW * 0.1, cy - paperHalfH * 0.35],
    [cx + paperHalfW * 0.35, cy + paperHalfH * 0.15],
  ];
  const strokeWidth = Math.max(2, 16 * s);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let d = Infinity;
      for (let i = 0; i < stroke.length - 1; i += 1) {
        const [ax, ay] = stroke[i];
        const [bx, by] = stroke[i + 1];
        d = Math.min(d, distanceToSegment(x + 0.5, y + 0.5, ax, ay, bx, by));
      }
      blend(pixels, size, x, y, ACCENT_DIM, Math.max(0, Math.min(1, strokeWidth - d)));
    }
  }

  // 4. The lens ring on top of everything.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const edge = Math.abs(dist - (ringRadius - ringWidth / 2));
      const alpha = Math.max(0, Math.min(1, ringWidth / 2 - edge));
      if (alpha > 0) blend(pixels, size, x, y, ACCENT, alpha);
    }
  }

  // 5. Pen nib at the end of the stroke, pointing down-right.
  const nibTip = [cx + paperHalfW * 0.5, cy + paperHalfH * 0.62];
  const nibLen = innerRadius * 0.5;
  const nibHalf = 18 * s;
  const nibAngle = Math.atan2(nibTip[1] - cy, nibTip[0] - cx);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5 - nibTip[0];
      const py = y + 0.5 - nibTip[1];
      const along = px * Math.cos(nibAngle - Math.PI) + py * Math.sin(nibAngle - Math.PI);
      const across = -px * Math.sin(nibAngle - Math.PI) + py * Math.cos(nibAngle - Math.PI);
      if (along >= 0 && along <= nibLen && Math.abs(across) <= nibHalf * (1 - along / nibLen)) {
        blend(pixels, size, x, y, ACCENT, 1);
      }
    }
  }

  return pixels;
}

/* --------------------------------------------------------------- render ---- */

function toSvg({ maskable }) {
  const plate = maskable
    ? ''
    : '<rect x="26" y="26" width="460" height="460" rx="112" fill="#111118"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="TraceLens">
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#0b0b0f"/>
  ${plate}
  <rect x="176" y="128" width="160" height="248" rx="16" fill="#f1f5f9" opacity="0.92"/>
  <path d="M212 300 L246 196 L292 268" fill="none" stroke="#0f766e" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#5eead4" stroke-width="26"/>
  <path d="M300 300 L344 388 L300 372 Z" fill="#5eead4"/>
</svg>
`;
}

function main() {
  mkdirSync(ICON_DIR, { recursive: true });

  const targets = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512.png', size: 512, maskable: true },
  ];

  for (const { name, size, maskable } of targets) {
    const png = encodePng(size, size, drawIcon(size, { maskable }));
    writeFileSync(join(ICON_DIR, name), png);
    console.info(`wrote public/icons/${name} (${png.length} bytes)`);
  }

  const apple = encodePng(180, 180, drawIcon(180, { maskable: false }));
  writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), apple);
  console.info(`wrote public/apple-touch-icon.png (${apple.length} bytes)`);

  writeFileSync(join(ICON_DIR, 'icon.svg'), toSvg({ maskable: false }));
  writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), toSvg({ maskable: false }));
  console.info('wrote public/icons/icon.svg and public/favicon.svg');
}

main();
