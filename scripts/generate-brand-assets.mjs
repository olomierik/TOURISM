/**
 * Derives every brand asset in the repository from one source file.
 *
 *   node scripts/generate-brand-assets.mjs            # write the assets
 *   node scripts/generate-brand-assets.mjs --dry      # report, write nothing
 *
 * The source is `brand/logo-source.jpg`, the artwork as it was supplied. Each
 * icon, favicon and email mark is produced from it here rather than exported by
 * hand somewhere else, because the previous set was: eight files in four sizes
 * with no record of what made them, so changing the logo meant recreating all
 * eight and hoping they matched. Now it is one command and they cannot drift.
 *
 * Requires sharp, which Next installs; `npm i -D sharp` if it is ever missing.
 * It is not part of the build — the outputs are committed.
 *
 * --------------------------------------------------------------------------
 * Why the artwork is traced rather than resized
 *
 * The supplied file is a JPEG of a two-colour drawing. Resizing it to 32px
 * gives a grey smudge with compression noise in it, and no amount of
 * sharpening recovers the glacier tongues on the summit, which are the detail
 * that makes this mountain read as a specific mountain. So the two flat
 * colours are thresholded into masks and the masks are contour-traced into
 * paths: the result is the drawing itself, scalable, and about 10 kB.
 *
 * Hand-redrawing it was the alternative and was tried first. It lost both the
 * glacier tongues and the branch lacework inside the canopy, which together
 * are most of what distinguishes this mark from any mountain-and-tree logo.
 *
 * --------------------------------------------------------------------------
 * Why there are three crops of one drawing
 *
 * The artwork is 2.06:1. Letterboxed into a square app icon the content ends
 * up half the height it could be, and at favicon size that is the difference
 * between a mountain and a smudge. Measured at the sizes they are actually
 * used at:
 *
 *   FULL  the artwork as supplied. Correct above ~120px, unreadable below it.
 *   ICON  the far-left shoulder cropped away, 1.77:1. Fills a square icon
 *         properly while keeping the whole composition — peak, snow, sun,
 *         tree, trunk and ground.
 *   MARK  the summit and the sun, 1.46:1, for 16 to 48px. Cropped close enough
 *         that the snow cap and the sun each get real pixels: the wider crops
 *         letterbox into a square tile and spend half its height on nothing,
 *         which at 32px is the difference between a mountain and a wedge. The
 *         tree is reduced to the band it becomes at this size anyway.
 *
 * All three are the same path data under a different viewBox, so they cannot
 * disagree with each other.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'brand', 'logo-source.jpg');
const DRY = process.argv.includes('--dry');

/** Sampled from the artwork itself, not picked by eye. See the README beside it. */
const PINE = '#1E3228';
const GOLD = '#C79843';
/** The app's own --background in light mode, so an icon matches the splash. */
const PAPER = '#FDFCFA';

// Tracing. SUPERSAMPLE smooths the thresholded edge; EPS_FINE is the tolerance
// for the committed vector, EPS_COARSE for the copy inlined into the header,
// which is never drawn above ~96px and does not need 10 kB of precision.
const SUPERSAMPLE = 3;
const EPS_FINE = 0.7;
const EPS_COARSE = 3.0;
const MIN_AREA_FINE = 10;
const MIN_AREA_COARSE = 40;
/** The wordmark starts here; everything below it is type, which is not traced. */
const WORDMARK_TOP = 470;

const out = [];
const write = (rel, buf) => {
  const path = join(ROOT, rel);
  mkdirSync(dirname(path), { recursive: true });
  const before = existsSync(path) ? readFileSync(path).length : null;
  if (!DRY) writeFileSync(path, buf);
  out.push({ rel, bytes: buf.length, was: before });
};

// ---------------------------------------------------------------------------
// Masks
// ---------------------------------------------------------------------------
const meta = await sharp(SOURCE).metadata();
const W = Math.round(meta.width * SUPERSAMPLE);
const H = Math.round(meta.height * SUPERSAMPLE);

const { data, info } = await sharp(SOURCE)
  .resize(W, H, { kernel: 'lanczos3' })
  // JPEG ringing along a hard edge traces as fur. A median pass removes it
  // without rounding the corners the way a blur would.
  .median(3)
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const isGreen = (c) => c[0] < 130 && c[1] < 140 && c[2] < 140;
const isGold = (c) => !isGreen(c) && c[0] > 120 && c[0] - c[2] > 45 && c[0] - c[1] > 14;

const cut = Math.round(WORDMARK_TOP * SUPERSAMPLE);
function maskOf(test) {
  const m = new Uint8Array(info.width * info.height);
  for (let y = 0; y < Math.min(cut, info.height); y++) {
    for (let x = 0; x < info.width; x++) {
      if (test(px(x, y))) m[y * info.width + x] = 1;
    }
  }
  return m;
}
const greenMask = maskOf(isGreen);
const goldMask = maskOf(isGold);

// ---------------------------------------------------------------------------
// Contours — marching squares along the crack edges of a mask
// ---------------------------------------------------------------------------
function contours(mask, w, h) {
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const seen = new Set();
  const loops = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!get(x, y) || get(x, y - 1) || seen.has(`${x},${y},t`)) continue;
      const loop = [];
      let cx = x;
      let cy = y;
      let dir = 'r';
      let guard = 0;
      while (guard++ < 8_000_000) {
        const side = dir === 'r' ? 't' : dir === 'd' ? 'r' : dir === 'l' ? 'b' : 'l';
        const key = `${cx},${cy},${side}`;
        if (seen.has(key)) break;
        seen.add(key);

        if (dir === 'r') loop.push([cx, cy]);
        else if (dir === 'd') loop.push([cx + 1, cy]);
        else if (dir === 'l') loop.push([cx + 1, cy + 1]);
        else loop.push([cx, cy + 1]);

        // Turn so the filled region stays on the right hand.
        if (dir === 'r') {
          if (get(cx + 1, cy - 1)) { cy -= 1; dir = 'u'; }
          else if (get(cx + 1, cy)) cx += 1;
          else dir = 'd';
        } else if (dir === 'd') {
          if (get(cx + 1, cy + 1)) { cx += 1; dir = 'r'; }
          else if (get(cx, cy + 1)) cy += 1;
          else dir = 'l';
        } else if (dir === 'l') {
          if (get(cx - 1, cy + 1)) { cy += 1; dir = 'd'; }
          else if (get(cx - 1, cy)) cx -= 1;
          else dir = 'u';
        } else {
          if (get(cx - 1, cy - 1)) { cx -= 1; dir = 'l'; }
          else if (get(cx, cy - 1)) cy -= 1;
          else dir = 'r';
        }
        if (cx === x && cy === y && dir === 'r') break;
      }
      if (loop.length > 3) loops.push(loop);
    }
  }
  return loops;
}

const areaOf = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a) / 2;
};

/** Douglas-Peucker, iterative: a 40,000-point loop would overflow a recursive one. */
function simplify(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    if (e <= s + 1) continue;
    const [x1, y1] = pts[s];
    const [x2, y2] = pts[e];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    let best = -1;
    let bestD = eps;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best !== -1) {
      keep[best] = 1;
      stack.push([s, best], [best, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// Bounds across both masks, so every crop is expressed against the artwork.
let minX = Infinity;
let maxX = -1;
let minY = Infinity;
let maxY = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = y * info.width + x;
    if (greenMask[i] || goldMask[i]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const VB_W = 200;
const scale = VB_W / (maxX - minX);
const VB_H = +((maxY - minY) * scale).toFixed(2);

const greenLoops = contours(greenMask, info.width, info.height);
const goldLoops = contours(goldMask, info.width, info.height);

const toPath = (loops, eps, minArea) =>
  loops
    .filter((l) => areaOf(l) >= minArea * SUPERSAMPLE * SUPERSAMPLE)
    .map((l) => simplify(l, eps * SUPERSAMPLE))
    .filter((pts) => pts.length >= 3)
    .map(
      (pts) =>
        pts
          .map(
            ([x, y], i) =>
              `${i === 0 ? 'M' : 'L'}${((x - minX) * scale).toFixed(2)} ` +
              `${((y - minY) * scale).toFixed(2)}`,
          )
          .join('') + 'Z',
    )
    .join('');

const fine = {
  gold: toPath(goldLoops, EPS_FINE, MIN_AREA_FINE),
  green: toPath(greenLoops, EPS_FINE, MIN_AREA_FINE),
};
const coarse = {
  gold: toPath(goldLoops, EPS_COARSE, MIN_AREA_COARSE),
  green: toPath(greenLoops, EPS_COARSE, MIN_AREA_COARSE),
};

// ---------------------------------------------------------------------------
// Crops — see the header. Fractions of the traced box, not absolute numbers,
// so a re-trace that shifts the bounds by a pixel does not move the framing.
// ---------------------------------------------------------------------------
const CROPS = {
  full: [0, 0, VB_W, VB_H],
  icon: [0.24 * VB_W, 0, 0.76 * VB_W, 0.885 * VB_H],
  mark: [0.38 * VB_W, 0, 0.44 * VB_W, 0.62 * VB_H],
};
const viewBox = (c) => CROPS[c].map((n) => +n.toFixed(2)).join(' ');

const svgOf = (crop, paths, { ground } = {}) => {
  const [, , w, h] = CROPS[crop];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(crop)}">
${ground ? `<rect x="${CROPS[crop][0]}" y="${CROPS[crop][1]}" width="${w}" height="${h}" fill="${ground}"/>\n` : ''}<path fill="${GOLD}" fill-rule="evenodd" d="${paths.gold}"/>
<path fill="${PINE}" fill-rule="evenodd" d="${paths.green}"/>
</svg>
`;
};

// The vector of record: the artwork, transparent, at its own proportions.
write('public/brand/emblem.svg', Buffer.from(svgOf('full', fine)));

// ---------------------------------------------------------------------------
// Raster tiles
// ---------------------------------------------------------------------------
/** Renders one crop centred on a square paper tile at `inset` of its width. */
async function tile(crop, size, inset, paths = fine) {
  const [, , w, h] = CROPS[crop];
  const targetW = Math.round(size * inset);
  const targetH = Math.round((targetW * h) / w);
  const art = await sharp(Buffer.from(svgOf(crop, paths)), { density: 4000 })
    .resize({ width: targetW, height: targetH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: art, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// 0.86 rather than full bleed: an app icon with the drawing touching its edge
// looks cramped on a home screen beside icons that all keep a margin.
write('public/icon-192.png', await tile('icon', 192, 0.86));
write('public/icon-512.png', await tile('icon', 512, 0.86));
write('public/apple-touch-icon.png', await tile('icon', 180, 0.86));

// Android masks this to a circle, a squircle or a teardrop depending on the
// launcher, and only the middle 80% is guaranteed to survive. A 1.77:1 drawing
// inscribed in that circle may be 0.70 of the width; 0.62 leaves room for the
// most aggressive mask rather than the average one.
write('public/icon-maskable-512.png', await tile('icon', 512, 0.62));

// The square the manifest offers as the scalable icon.
write('public/logo.svg', Buffer.from(squareSvg()));

function squareSvg() {
  const [cx, cy, w, h] = CROPS.icon;
  const side = w;
  const dy = (side - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side.toFixed(2)} ${side.toFixed(2)}">
<rect width="${side.toFixed(2)}" height="${side.toFixed(2)}" fill="${PAPER}"/>
<g transform="translate(${(-cx).toFixed(2)} ${(dy - cy).toFixed(2)})">
<path fill="${GOLD}" fill-rule="evenodd" d="${fine.gold}"/>
<path fill="${PINE}" fill-rule="evenodd" d="${fine.green}"/>
</g>
</svg>
`;
}

// The email mark. Shown at 96px beside the live-text wordmark, so the file is
// the 2x copy — a mark that is crisp on a phone and soft on a laptop is the
// usual way a logo looks cheap in an inbox.
{
  const [, , w, h] = CROPS.icon;
  const width = 192;
  const height = Math.round((width * h) / w);
  const buf = await sharp(Buffer.from(svgOf('icon', fine)), { density: 4000 })
    .resize({ width, height, fit: 'contain', background: PAPER })
    .flatten({ background: PAPER })
    .png({ compressionLevel: 9 })
    .toBuffer();
  write('public/logo-email.png', buf);
}

// ---------------------------------------------------------------------------
// favicon.ico — 16, 32 and 48, from the MARK crop
// ---------------------------------------------------------------------------
{
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(await tile('mark', s, 0.94));

  // ICO: a 6-byte header, a 16-byte directory entry each, then the PNGs. PNG
  // payloads rather than BMP — every browser since IE11 reads them and it
  // saves three quarters of the bytes.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  let offset = 6 + 16 * sizes.length;
  const dir = [];
  for (let i = 0; i < sizes.length; i++) {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0);
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    dir.push(e);
  }
  write('app/favicon.ico', Buffer.concat([header, ...dir, ...pngs]));
}

// ---------------------------------------------------------------------------
// iOS launch screens
//
// Forty files, one per device size, each a gradient with the old mark, the
// Fraunces wordmark and a gold rule. They are not re-rendered from scratch
// here: the wordmark is set in a font librsvg will not find, and redrawing it
// badly would be worse than leaving it. The mark alone is replaced, in place.
//
// Removing the old one means reconstructing what was behind it. The ground is
// a vertical gradient, so a flat fill leaves a visible rectangle; sampling the
// same row from outside the mark's own columns rebuilds it exactly, because
// the gradient does not vary horizontally.
// ---------------------------------------------------------------------------
async function restyleSplash(file) {
  const img = sharp(file);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const at = (x, y) => {
    const i = (y * w + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // The reference column, far enough from the centred artwork to be ground.
  const refX = Math.round(w * 0.04);
  const inked = (x, y) => {
    const c = at(x, y);
    const r = at(refX, y);
    return Math.abs(c[0] - r[0]) + Math.abs(c[1] - r[1]) + Math.abs(c[2] - r[2]) > 26;
  };

  // Ink bands down the page: the mark, then the wordmark, then the rule.
  const bands = [];
  let start = -1;
  for (let y = 0; y < h; y++) {
    let any = false;
    for (let x = refX * 2; x < w - refX * 2 && !any; x += 2) if (inked(x, y)) any = true;
    if (any && start < 0) start = y;
    else if (!any && start >= 0) {
      if (y - start > 8) bands.push([start, y - 1]);
      start = -1;
    }
  }
  if (start >= 0) bands.push([start, h - 1]);
  if (!bands.length) throw new Error(`${file}: found no artwork to replace`);

  const [top, bottom] = bands[0];
  let left = w;
  let right = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = refX * 2; x < w - refX * 2; x++) {
      if (inked(x, y)) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // Rebuild the gradient across the mark's box, one row at a time.
  const patchW = right - left + 1;
  const patchH = bottom - top + 1;
  const patch = Buffer.alloc(patchW * patchH * 3);
  for (let y = 0; y < patchH; y++) {
    const [r, g, b] = at(refX, top + y);
    for (let x = 0; x < patchW; x++) {
      const i = (y * patchW + x) * 3;
      patch[i] = r;
      patch[i + 1] = g;
      patch[i + 2] = b;
    }
  }

  // The new mark, sized by the screen rather than by the shape it replaces:
  // the old one was a portrait pin and this one is a landscape scene, so
  // matching its width would make the mark half the size it should be.
  const [, , cw, cvh] = CROPS.icon;
  const markW = Math.round(w * 0.42);
  const markH = Math.round((markW * cvh) / cw);
  const dark = at(refX, Math.round(h / 2))[0] < 110;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox('icon')}">
<path fill="${GOLD}" fill-rule="evenodd" d="${fine.gold}"/>
<path fill="${dark ? '#F4EFE6' : PINE}" fill-rule="evenodd" d="${fine.green}"/>
</svg>`;
  const mark = await sharp(Buffer.from(svg), { density: 4000 })
    .resize({ width: markW, height: markH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp(file)
    .composite([
      { input: patch, raw: { width: patchW, height: patchH, channels: 3 }, left, top },
      {
        input: mark,
        left: Math.round((w - markW) / 2),
        // Centred on the box it replaced, so the gap to the wordmark below is
        // the one the layout was designed with.
        top: Math.round(top + (patchH - markH) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

{
  const dir = join(ROOT, 'public', 'splash');
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
    : [];
  for (const f of files) {
    write(join('public', 'splash', f), await restyleSplash(join(dir, f)));
  }
  if (files.length) console.log(`restyled ${files.length} launch screens`);
}

// ---------------------------------------------------------------------------
// The paths the header inlines
// ---------------------------------------------------------------------------
{
  const [x, y, w, h] = CROPS.icon.map((n) => +n.toFixed(2));
  const ts = `// Generated by scripts/generate-brand-assets.mjs — do not edit by hand.
//
// The brand mark's outlines, traced from brand/logo-source.jpg. Inlined rather
// than loaded as an <img> so the mountain can take its colour from the theme:
// it is pine on the sand ground and paper on the dark one, and an <img> cannot
// do that without shipping two files and swapping them in CSS.
//
// Simplified harder than public/brand/emblem.svg because this copy is never
// drawn above about 96px, where the extra precision is invisible and the extra
// ${(fine.green.length + fine.gold.length - coarse.green.length - coarse.gold.length).toLocaleString()} bytes are not — this sits in the header of every page.

/** The ICON crop: the artwork without its far-left shoulder. */
export const MARK_VIEW_BOX = '${x} ${y} ${w} ${h}';

/** The sun. Always gold; it is the only warm thing in the mark. */
export const MARK_SUN =
  '${coarse.gold}';

/** Kilimanjaro and the acacia. The snow and the gaps between branches are
 *  holes in this path rather than shapes of their own, so whatever is behind
 *  the mark shows through them and the cap keeps its contrast on any ground. */
export const MARK_LAND =
  '${coarse.green}';
`;
  write('components/layout/logo-paths.ts', Buffer.from(ts));
}

// ---------------------------------------------------------------------------
console.log(`traced ${greenLoops.length} green and ${goldLoops.length} gold outlines`);
console.log(`viewBox 0 0 ${VB_W} ${VB_H}  (${(VB_W / VB_H).toFixed(2)}:1)\n`);
for (const f of out) {
  const delta = f.was === null ? 'new' : `was ${(f.was / 1024).toFixed(1)} kB`;
  console.log(`  ${f.rel.padEnd(38)} ${(f.bytes / 1024).toFixed(1).padStart(7)} kB  (${delta})`);
}
console.log(DRY ? '\n--dry: nothing written' : `\n${out.length} files written`);
