// Troca o domínio provisório pelo domínio real em canonical, og:url, JSON-LD, sitemap e robots.
// Uso: npm run set-domain -- https://www.meusite.com.br
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PLACEHOLDER = 'https://SEU-DOMINIO.com.br';
const ROOT = path.resolve(import.meta.dirname, '..');

const arg = process.argv[2];
if (!arg) {
  console.error('Informe o domínio. Ex.: npm run set-domain -- https://www.meusite.com.br');
  process.exit(1);
}

let target;
try {
  const url = new URL(arg);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocolo inválido');
  target = url.origin; // normaliza e remove barra final/caminho
} catch {
  console.error(`URL inválida: "${arg}". Use o formato https://dominio.com.br`);
  process.exit(1);
}

// Procura o domínio atual (o provisório ou o último aplicado) para permitir trocar mais de uma vez.
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(html|xml|txt|webmanifest)$/i.test(entry.name)) files.push(full);
  }
}
await walk(ROOT);

const current = new Set();
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/(?:canonical" href|og:url" content|Sitemap:|<loc>)[=\s">]*?(https?:\/\/[^/"<\s]+)/g)) {
    current.add(m[1]);
  }
}
const from = [...current].find((d) => d !== target) ?? PLACEHOLDER;

let changed = 0;
for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (!text.includes(from)) continue;
  await writeFile(file, text.replaceAll(from, target));
  changed += 1;
  console.log(`  ✔ ${path.relative(ROOT, file)}`);
}
console.log(`\n${from} → ${target} em ${changed} arquivo(s).`);
