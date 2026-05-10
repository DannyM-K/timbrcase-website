import sharp from 'sharp';
import { readdir, mkdir, rename, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SRC_DIR = 'public/images';
const ORIG_DIR = path.join(SRC_DIR, '_original');
const MAX_WIDTH = 1600;
const QUALITY = 80;

// Files to skip (not photos, or special)
const SKIP = new Set(['favicon.svg']);

async function main() {
  if (!existsSync(ORIG_DIR)) await mkdir(ORIG_DIR, { recursive: true });

  const files = await readdir(SRC_DIR);
  const jpgs = files.filter((f) => /\.(jpe?g)$/i.test(f) && !SKIP.has(f));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const f of jpgs) {
    const src = path.join(SRC_DIR, f);
    const baseName = path.basename(f, path.extname(f));
    const webpName = `${baseName}.webp`;
    const webpPath = path.join(SRC_DIR, webpName);

    const beforeSize = (await stat(src)).size;
    totalBefore += beforeSize;

    await sharp(src, { failOn: 'none' })
      .rotate() // honor EXIF orientation
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    const afterSize = (await stat(webpPath)).size;
    totalAfter += afterSize;

    // Move original JPEG out of public/images to keep deploy lean
    await rename(src, path.join(ORIG_DIR, f));

    console.log(
      `${f.padEnd(28)} ${(beforeSize / 1024 / 1024).toFixed(2).padStart(6)} MB  →  ${webpName.padEnd(28)} ${(afterSize / 1024 / 1024).toFixed(2).padStart(6)} MB`,
    );
  }

  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)} MB  →  ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Saved: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
}

main().catch((e) => { console.error(e); process.exit(1); });
