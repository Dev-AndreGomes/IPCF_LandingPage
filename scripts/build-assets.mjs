// Gera os arquivos otimizados do site (imagens, fontes, sprite de ícones, favicons).
// Uso: npm run assets
// As saídas ficam versionadas no repositório; este script só precisa rodar quando
// uma imagem de origem mudar. Os arquivos originais em assets/img NUNCA são alterados.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMG = path.join(ROOT, 'assets/img');
const OUT = path.join(IMG, 'opt');
const NM = path.join(ROOT, 'node_modules');

await mkdir(OUT, { recursive: true });

/* ---------- Imagens responsivas (WebP + AVIF opcional) ---------- */
// trim: remove margem transparente do logo para ele ocupar o espaço certo no layout.
const jobs = [
  { src: 'hero_ipcf_img.jpg', name: 'hero', widths: [640, 960, 1280], avif: true, quality: 72 },
  { src: 'ipcf_img.jpg', name: 'igreja', widths: [480, 720, 960], avif: true, quality: 74 },
  { src: 'Logo_paonarua.png', name: 'pao-na-rua', widths: [320, 640], avif: false, quality: 82 },
  { src: 'logo_OACEI_IPCF.jpeg', name: 'oacei', widths: [320, 640], avif: false, quality: 82 },
  { src: 'IPCF_header.png', name: 'logo', widths: [200, 400], avif: false, quality: 90, trim: true },
];

const report = {};
for (const job of jobs) {
  const input = path.join(IMG, job.src);
  let base = sharp(input);
  if (job.trim) {
    const { data, info } = await base.trim({ threshold: 5 }).toBuffer({ resolveWithObject: true });
    base = sharp(data);
    report[job.name] = { trimmed: `${info.width}x${info.height}` };
  }
  const meta = await base.metadata();
  report[job.name] = { ...(report[job.name] || {}), source: `${meta.width}x${meta.height}`, files: [] };
  for (const w of job.widths) {
    const width = Math.min(w, meta.width);
    const pipeline = () => base.clone().resize({ width, withoutEnlargement: true });
    const webp = path.join(OUT, `${job.name}-${w}.webp`);
    await pipeline().webp({ quality: job.quality, effort: 6, alphaQuality: 100 }).toFile(webp);
    report[job.name].files.push(path.basename(webp));
    if (job.avif) {
      const avif = path.join(OUT, `${job.name}-${w}.avif`);
      await pipeline().avif({ quality: Math.max(40, job.quality - 28), effort: 6 }).toFile(avif);
      report[job.name].files.push(path.basename(avif));
    }
  }
}

/* ---------- Imagem de compartilhamento (Open Graph 1200x630) ---------- */
await sharp(path.join(IMG, 'hero_ipcf_img.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));

/* ---------- Favicons / ícones de app a partir do logo existente ---------- */
const iconSrc = path.join(ROOT, 'assets/icons/IPCF_logo.png');
const iconMeta = await sharp(iconSrc).metadata();
report.IPCF_logo = { source: `${iconMeta.width}x${iconMeta.height}` };
for (const [file, size, bg] of [
  ['favicon-32.png', 32, null],
  ['icon-192.png', 192, null],
  ['icon-512.png', 512, null],
  ['apple-touch-icon.png', 180, '#FAF8F3'],
]) {
  let p = sharp(iconSrc).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (bg) p = p.flatten({ background: bg });
  await p.png({ compressionLevel: 9 }).toFile(path.join(ROOT, 'assets/icons', file));
}

/* ---------- Fontes auto-hospedadas (subset latin, variável) ---------- */
const fontsOut = path.join(ROOT, 'assets/fonts');
await mkdir(fontsOut, { recursive: true });
const fonts = [
  ['@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2', 'fraunces-latin-wght.woff2'],
  ['@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', 'plus-jakarta-sans-latin-wght.woff2'],
];
for (const [from, to] of fonts) {
  await copyFile(path.join(NM, from), path.join(fontsOut, to));
}

/* ---------- Sprite SVG de ícones ---------- */
// Lucide (traço) para ícones de interface; Simple Icons (preenchido) para marcas.
const lucide = [
  'map-pin', 'menu', 'x', 'book-open-text', 'book-open', 'eye', 'heart', 'calendar',
  'scroll-text', 'hand-heart', 'baby', 'users', 'music', 'heart-handshake', 'phone', 'mail',
  'arrow-right', 'arrow-left', 'utensils', 'handshake', 'presentation', 'sprout', 'graduation-cap',
  'user-plus', 'calendar-check', 'clock', 'chevron-down',
];
const brands = ['instagram', 'youtube', 'whatsapp'];

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
const symbols = [];
for (const name of lucide) {
  const file = path.join(NM, 'lucide-static/icons', `${name}.svg`);
  if (!existsSync(file)) throw new Error(`Ícone Lucide ausente: ${name}`);
  const body = inner(await readFile(file, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
  symbols.push(
    `<symbol id="i-${name}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></symbol>`,
  );
}
for (const name of brands) {
  const file = path.join(NM, 'simple-icons/icons', `${name}.svg`);
  if (!existsSync(file)) throw new Error(`Ícone de marca ausente: ${name}`);
  const body = inner(await readFile(file, 'utf8')).replace(/<title>[\s\S]*?<\/title>/, '');
  symbols.push(`<symbol id="i-${name}" viewBox="0 0 24 24"><g fill="currentColor">${body}</g></symbol>`);
}
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`;
await writeFile(path.join(ROOT, 'assets/icons/sprite.svg'), sprite);

console.log(JSON.stringify(report, null, 2));
console.log(`Sprite: ${symbols.length} ícones.`);
