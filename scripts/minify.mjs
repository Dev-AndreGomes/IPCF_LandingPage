// Gera css/style.min.css e js/script.min.js a partir dos arquivos-fonte,
// injeta o CSS crítico inline nos HTMLs (eliminando bloqueio de renderização),
// atualiza o hash de cache-busting do JS e sincroniza os hashes SHA-256 da CSP.
// Uso: npm run minify
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const common = { bundle: false, minify: true, legalComments: 'none', logLevel: 'info' };

const cssOut = path.join(ROOT, 'css/style.min.css');
const jsOut = path.join(ROOT, 'js/script.min.js');

await build({
  ...common,
  entryPoints: [path.join(ROOT, 'css/style.css')],
  outfile: cssOut,
  // Navegadores-alvo modernos (light-dark, :has, scroll-driven animations com @supports).
  target: ['chrome120', 'firefox121', 'safari17'],
  loader: { '.css': 'css' },
});

await build({
  ...common,
  entryPoints: [path.join(ROOT, 'js/script.js')],
  outfile: jsOut,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
});

const sha256Base64 = (text) => createHash('sha256').update(text, 'utf8').digest('base64');

const rawCssMin = (await readFile(cssOut, 'utf8')).replace(/\r\n/g, '\n').trim();
const rawJsMin = await readFile(jsOut, 'utf8');
const jsVer = createHash('sha256').update(rawJsMin).digest('hex').slice(0, 8);

const pages = [
  { rel: 'index.html', assetPrefix: 'assets/', jsPath: 'js/script.min.js' },
  { rel: 'projetos/pao-na-rua.html', assetPrefix: '../assets/', jsPath: '../js/script.min.js' },
  { rel: 'projetos/amor-de-cristo-em-ingles.html', assetPrefix: '../assets/', jsPath: '../js/script.min.js' },
];

const allScriptHashes = new Set();
const allStyleHashes = new Set();

for (const page of pages) {
  const fullPath = path.join(ROOT, page.rel);
  let html = await readFile(fullPath, 'utf8');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';

  const cssInline = rawCssMin.replaceAll('../assets/', page.assetPrefix);
  const styleHash = `'sha256-${sha256Base64(cssInline)}'`;
  allStyleHashes.add(styleHash);

  const styleTag = `<style id="inline-css">${cssInline}</style>`;
  if (/<style id="inline-css">[\s\S]*?<\/style>/.test(html)) {
    html = html.replace(/<style id="inline-css">[\s\S]*?<\/style>/, () => styleTag);
  } else {
    html = html.replace(/<link rel="stylesheet" href="[^"]*style\.min\.css">/, () => styleTag);
  }

  html = html.replace(
    /<script src="[^"]*script\.min\.js(?:\?v=[a-f0-9]+)?" defer><\/script>/,
    `<script src="${page.jsPath}?v=${jsVer}" defer></script>`,
  );

  const scriptHashes = [];
  const precheckMatch = html.match(/<script id="intro-precheck">([\s\S]*?)<\/script>/);
  if (precheckMatch) {
    const precheckBody = precheckMatch[1].replace(/\r\n/g, '\n');
    const scriptHash = `'sha256-${sha256Base64(precheckBody)}'`;
    scriptHashes.push(scriptHash);
    allScriptHashes.add(scriptHash);
  }

  const scriptSrc = ["'self'", ...scriptHashes].join(' ');
  const styleSrc = ["'self'", styleHash].join(' ');
  const cspValue = `default-src 'self'; script-src ${scriptSrc}; style-src ${styleSrc}; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'`;

  html = html.replace(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*">/,
    `<meta http-equiv="Content-Security-Policy"${eol}    content="${cspValue}">`,
  );

  await writeFile(fullPath, html, 'utf8');
}

const headersPath = path.join(ROOT, '_headers');
const headersScriptSrc = ["'self'", ...allScriptHashes].join(' ');
const headersStyleSrc = ["'self'", ...allStyleHashes].join(' ');
const headersCsp = `default-src 'self'; script-src ${headersScriptSrc}; style-src ${headersStyleSrc}; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;

const headersContent = `# Cabeçalhos de segurança e cache (Netlify e Cloudflare Pages leem este arquivo).
# Na Vercel, o equivalente vai em vercel.json.

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: ${headersCsp}

# Arquivos versionados ou estáticos com cache de 1 ano.
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable
`;

await writeFile(headersPath, headersContent, 'utf8');
console.log(`Inline CSS e CSP sincronizados (${pages.length} páginas, js?v=${jsVer}).`);
