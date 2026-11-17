// One-off: converts the display face (Big Shoulders Display 900, OFL) into three.js typeface
// JSON holding only the glyphs the intro forges. Re-run after changing the name in data/portfolio.ts:
//   node scripts/build-typeface.mjs
// Mirrors three/examples/jsm/loaders/TTFLoader.js `convert`, minus the CDN import it uses at runtime.
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff';
const GLYPHS = 'DHEERAJ';

const buf = readFileSync(SRC);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const r = Math.round;
const glyphs = {};
for (const ch of new Set(GLYPHS)) {
  const g = font.charToGlyph(ch);
  let o = '';
  for (const c of g.path.commands) {
    const type = c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase();
    o += type + ' ';
    if (c.x !== undefined) o += `${r(c.x * scale)} ${r(c.y * scale)} `;
    if (c.x1 !== undefined) o += `${r(c.x1 * scale)} ${r(c.y1 * scale)} `;
    if (c.x2 !== undefined) o += `${r(c.x2 * scale)} ${r(c.y2 * scale)} `;
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: r(g.advanceWidth * scale), x_min: r(bb.x1 * scale), x_max: r(bb.x2 * scale), o };
}
const json = {
  glyphs,
  familyName: 'Big Shoulders Display Black (subset)',
  ascender: r(font.ascender * scale),
  descender: r(font.descender * scale),
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
  resolution: 1000,
};
writeFileSync('src/assets/name-typeface.json', JSON.stringify(json));
console.log('glyphs:', Object.keys(glyphs).join(''), 'bytes:', JSON.stringify(json).length);
