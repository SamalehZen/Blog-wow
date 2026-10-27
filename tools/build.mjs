#!/usr/bin/env node
// Phase 3 - construction du site publiable (dist/).
//
// Le clone reproduit EXACTEMENT l'espace d'URL de l'origine :
//   /_next/static/chunks/x.js   -> dist/_next/static/chunks/x.js
//   /posts/<slug>/img.png       -> dist/posts/<slug>/img.png
//   /sky/dawn.png               -> dist/sky/dawn.png
// Aucune reecriture d'URL d'asset n'est donc necessaire.
//
// Modifications appliquees au HTML (toutes tracees dans _build-report.json) :
//   1. /_next/image?url=...&w=... -> chemin source direct (optimiseur Vercel absent)
//      traite dans <img>, <link rel=preload as=image>, srcSet/imageSrcSet,
//      ET dans le payload RSC (qui contient les memes URL echappees)
//   2. script d'analytics tiers retire
//   3. <meta name="robots" content="noindex,nofollow"> ajoute
//   4. prelude de navigation : les liens internes font un chargement complet
//      (sans serveur RSC, le routing client de Next n'a pas de source de donnees)

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'capture', 'raw');
const PAGES = path.join(RAW, 'pages');
const ASSETS = path.join(RAW, 'assets');
const DIST = path.join(ROOT, 'dist');

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const walk = (dir, base = dir, out = []) => {
  for (const n of fs.readdirSync(dir)) {
    const abs = path.join(dir, n);
    if (fs.statSync(abs).isDirectory()) walk(abs, base, out);
    else out.push({ abs, rel: path.relative(base, abs) });
  }
  return out;
};

const report = { builtAt: new Date().toISOString(), pages: [], rewrites: {} };

// ---------- 1. dist propre ----------
await fsp.rm(DIST, { recursive: true, force: true });
await fsp.mkdir(DIST, { recursive: true });

// ---------- 2. assets -> espace d'URL d'origine ----------
const assetFiles = walk(ASSETS);
let assetBytes = 0;
for (const a of assetFiles) {
  const dest = path.join(DIST, a.rel);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(a.abs, dest);
  assetBytes += fs.statSync(a.abs).size;
}
report.rewrites.assetsCopied = assetFiles.length;

// ---------- 2b. neutralisation de l'optimiseur d'images de Next ----------
// La config embarquee (path:"/_next/image") fait reconstruire des URL
// /_next/image?... au moment de l'hydratation, que ce serveur statique ne peut
// pas honorer (nginx ne decode pas %2F dans un argument). On force
// unoptimized:true : le composant Image rend alors src tel quel.
let patchedChunks = 0;
for (const f of walk(path.join(DIST, '_next', 'static'))) {
  if (!f.rel.endsWith('.js')) continue;
  const abs = path.join(DIST, '_next', 'static', f.rel);
  const text = fs.readFileSync(abs, 'utf8');
  if (!text.includes('path:"/_next/image"')) continue;
  let out = text.replaceAll('path:"/_next/image"', 'path:""');
  out = out.split('unoptimized:!1').join('unoptimized:!0');
  if (out !== text) { fs.writeFileSync(abs, out); patchedChunks++; }
}
report.rewrites.imageConfigPatched = patchedChunks;

// ---------- 3. pages ----------
const relToRoute = (rel) => (rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '').replace(/\\/g, '/'));

const PRELUDE = [
  '<script>(function(){',
  '  // Clone statique : pas de serveur RSC. Tout lien interne = navigation complete.',
  '  document.addEventListener("click",function(e){',
  '    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;',
  '    var a=e.target.closest&&e.target.closest("a[href]"); if(!a)return;',
  '    var href=a.getAttribute("href"); if(!href)return;',
  '    if(href.charAt(0)==="#"||href.indexOf("mailto:")===0||href.indexOf("tel:")===0)return;',
  '    if(a.target&&a.target!=="_self")return;',
  '    var u; try{u=new URL(href,location.href)}catch(_){return}',
  '    if(u.origin!==location.origin)return;',
  '    if(u.pathname===location.pathname&&u.hash)return;',
  '    e.preventDefault(); location.assign(u.pathname+u.search+u.hash);',
  '  },true);',
  '})();</script>',
].join('\n');

// Remplace toute URL d'optimiseur d'image par son image source.
// Couvre les formes brutes, HTML-echappees (&amp;) et JSON-echappees (\/).
function deOptimizeImages(html) {
  let changed = 0;
  // <img ... src="/_next/image?url=..." ...> -> src="<source>", srcSet/sizes retires
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    if (!tag.includes('_next/image')) return tag;
    const m = tag.match(/src="([^"]*_next\/image\?[^"]*)"/);
    if (!m) return tag;
    const src = m[1].replace(/&amp;/g, '&');
    let inner = '';
    try { inner = new URL(src, 'https://x').searchParams.get('url') || ''; } catch { return tag; }
    if (!inner) return tag;
    let out = tag.replace(m[0], 'src="' + inner + '"');
    out = out.replace(/\s+srcSet="[^"]*"/i, '').replace(/\s+sizes="[^"]*"/i, '');
    changed++;
    return out;
  });
  // <link rel="preload" as="image" imageSrcSet="..."> -> href simple
  html = html.replace(/<link\b[^>]*_next\/image[^>]*>/g, (tag) => {
    const m = tag.match(/(?:imageSrcSet|srcSet)="([^"]+)"/);
    if (!m) return tag;
    const first = m[1].split(',')[0].trim().split(/\s+/)[0].replace(/&amp;/g, '&');
    let inner = '';
    try { inner = new URL(first, 'https://x').searchParams.get('url') || ''; } catch { return tag; }
    if (!inner) return tag;
    changed++;
    return '<link rel="preload" as="image" href="' + inner + '"/>';
  });
  // srcSet / imageSrcSet restants
  html = html.replace(/(imageSrcSet|srcSet)="([^"]*_next\/image[^"]*)"/gi, (full, attr, val) => {
    const first = val.split(',')[0].trim().split(/\s+/)[0].replace(/&amp;/g, '&');
    let inner = '';
    try { inner = new URL(first, 'https://x').searchParams.get('url') || ''; } catch { return full; }
    if (!inner) return full;
    changed++;
    return attr + '="' + inner + '"';
  });
  // occurrences dans le payload RSC et les scripts : /_next/image?url=X&w=N&q=75
  // les "/" peuvent y etre echappes en "\/" et "&" en "&amp;"
  html = html.replace(/(?:\/_next\/image\?url=|\\\/_next\\\/image\?url=)([^"'&\\]+)(?:&amp;|&|\\u0026)[^"'\\ ]*/g, (full, enc) => {
    let u = enc;
    try { u = decodeURIComponent(u.replace(/\\\//g, '/')); } catch {}
    if (!u) return full;
    const isJsonCtx = full.includes('\\/');
    changed++;
    return isJsonCtx ? u.replace(/\//g, '\\/') : u;
  });
  return { html, changed };
}

const pageFiles = walk(PAGES).filter((p) => p.rel.endsWith('.html') && !p.rel.startsWith('_'));
for (const p of pageFiles) {
  let html = fs.readFileSync(p.abs, 'utf8');
  const before = html.length;
  const applied = [];

  const d = deOptimizeImages(html);
  html = d.html;
  if (d.changed) applied.push('images source (' + d.changed + ')');

  // analytics tiers
  const a1 = html;
  html = html.replace(/<script[^>]*src="\/[0-9a-f]{10,}\/script\.js"[^>]*><\/script>/g, '');
  if (html !== a1) applied.push('analytics retire');

  // noindex : on force la valeur, l'origine declare "index, follow"
  if (/<meta[^>]+name="robots"[^>]*>/i.test(html)) {
    html = html.replace(/<meta[^>]+name="robots"[^>]*>/gi, '<meta name="robots" content="noindex, nofollow"/>');
    applied.push('noindex (remplace)');
  } else {
    html = html.replace(/<head>/i, '<head><meta name="robots" content="noindex, nofollow"/>');
    applied.push('noindex (ajoute)');
  }
  // googlebot suit les memes consignes
  html = html.replace(/<meta[^>]+name="googlebot"[^>]*>/gi, '<meta name="googlebot" content="noindex, nofollow"/>');
  html = html.replace(/<\/body>/i, PRELUDE + '\n</body>');

  const dest = path.join(DIST, p.rel);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.writeFile(dest, html);
  report.pages.push({
    route: relToRoute(p.rel), file: p.rel,
    bytesIn: before, bytesOut: html.length,
    sha256Out: sha256(Buffer.from(html)), applied,
  });
}

// ---------- 4. fichiers racine ----------
await fsp.writeFile(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const routes = report.pages.filter((p) => !p.route.startsWith('/404')).map((p) => p.route).sort();
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + routes.map((r) => '  <url><loc>' + r + '</loc></url>').join('\n')
  + '\n</urlset>\n';
await fsp.writeFile(path.join(DIST, 'sitemap.xml'), xml);

report.rewrites.notFoundFile = '404-probe-does-not-exist/index.html';
report.rewrites.assetBytes = assetBytes;
report.rewrites.pages = report.pages.length;
await fsp.writeFile(path.join(DIST, '_build-report.json'), JSON.stringify(report, null, 1));

const total = walk(DIST).reduce((s, f) => s + fs.statSync(f.abs).size, 0);
console.log('build: ' + report.pages.length + ' pages, ' + assetFiles.length + ' assets, '
  + (total / 1048576).toFixed(1) + ' Mo');
const touched = report.pages.filter((p) => p.applied.length > 0);
console.log('pages modifiees: ' + touched.length + '/' + report.pages.length);
for (const p of touched.slice(0, 5)) console.log('  ' + p.route + ' -> ' + p.applied.join(', '));