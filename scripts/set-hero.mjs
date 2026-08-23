import { copyFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

/**
 * Installs a homepage hero photograph.
 *
 *   npm run hero:set -- "C:/Users/you/Downloads/elephants.jpg"
 *
 * Exists because the failure modes of "save the file to public/hero.jpg" are
 * all silent: the wrong extension, a stray space in the name, a 12 MB original
 * straight off a camera. This validates the image, strips EXIF, resizes to a
 * sensible ceiling, and removes any previous hero so two files cannot both
 * claim the slot.
 */

const [, , input] = process.argv;

if (!input) {
  console.error('Usage: npm run hero:set -- <path-to-image>');
  process.exit(1);
}

if (!existsSync(input)) {
  console.error(`No file at ${input}`);
  process.exit(1);
}

const publicDir = join(process.cwd(), 'public');
await mkdir(publicDir, { recursive: true });

let meta;
try {
  meta = await sharp(input).metadata();
} catch {
  console.error(`${basename(input)} is not an image sharp can read (${extname(input) || 'no extension'}).`);
  process.exit(1);
}

// A hero wider than this buys nothing on any screen and costs real bytes on the
// mobile connections most of this audience browses on.
const MAX_WIDTH = 2560;

const out = join(publicDir, 'hero.jpg');

// Remove any other hero.* first, or the page picks whichever it finds first and
// the change appears not to have worked.
for (const f of await readdir(publicDir)) {
  if (/^hero\.(jpe?g|png|webp|avif)$/i.test(f)) await unlink(join(publicDir, f));
}

if (meta.width && meta.width > MAX_WIDTH) {
  await sharp(input).resize({ width: MAX_WIDTH }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
} else if (meta.format === 'jpeg') {
  await copyFile(input, out);
} else {
  await sharp(input).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
}

const after = await sharp(out).metadata();
const { size } = await import('node:fs').then((m) => m.promises.stat(out));

console.log(`  installed public/hero.jpg`);
console.log(`  ${after.width}x${after.height}, ${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  from ${meta.width}x${meta.height} ${meta.format}`);
console.log('\n  Next: commit and deploy, and it replaces the drawn scene.');
