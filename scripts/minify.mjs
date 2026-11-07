// Gera css/style.min.css e js/script.min.js a partir dos arquivos-fonte.
// Uso: npm run minify
import { build } from 'esbuild';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const common = { bundle: false, minify: true, legalComments: 'none', logLevel: 'info' };

await build({
  ...common,
  entryPoints: [path.join(ROOT, 'css/style.css')],
  outfile: path.join(ROOT, 'css/style.min.css'),
  // Navegadores-alvo modernos (light-dark, :has, scroll-driven animations com @supports).
  target: ['chrome120', 'firefox121', 'safari17'],
  loader: { '.css': 'css' },
});

await build({
  ...common,
  entryPoints: [path.join(ROOT, 'js/script.js')],
  outfile: path.join(ROOT, 'js/script.min.js'),
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
});
