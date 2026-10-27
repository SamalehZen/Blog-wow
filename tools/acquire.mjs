#!/usr/bin/env node
// Phase 1 - acquisition fidele de l'origine (www.theboringblog.ai).
// Aucune dependance npm : Node builtins uniquement.
//
// Ce que fait ce script, dans l'ordre :
//   1. part du sitemap + /lab, puis parcourt tous les liens internes (BFS, meme origine)
//   2. enregistre les octets BRUTS de chaque page (aucune reecriture ici : la capture
//      doit rester une preuve intacte de l'origine)
//   3. collecte et telecharge tous les assets references (HTML, CSS url(), srcset)
//   4. ecrit un manifeste (SHA-256, taille, type) : c'est la reference de fidelite
//
// L'acquisition est idempotente : un fichier deja capture et dont le SHA-256 est
// note dans le manifeste n'est pas retelecharge.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.theboringblog.ai';
const RAW = path.join(ROOT, 'capture', 'raw');
const PAGES_DIR = path.join(RAW, 'pages');
const ASSETS_DIR = path.join(RAW, 'assets');
const MANIFEST = path.join(ROOT, 'capture', 'manifest.json');
const LOGFILE = path.join(ROOT, 'logs', 'acquire.log');

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const MAX_PAGES = 400;
const CONCURRENCY = 6;
const logStream = fs.createWriteStream(LOGFILE, { flags: 'a' });
const t0 = Date.now();
const log = (...a) => {
  const line = new Date().toISOString().slice(11, 19) + '  ' + a.join(' ');
  console.log(line);
  logStream.write(line + '\n');
};

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const routeToFile = (route) => {
  const clean = route.replace(/\?.*$/, '').replace(/#.*$/, '');
  if (clean === '/') return 'index.html';
  const rel = clean.replace(/^\/+/, '').replace(/\/+$/, '');
  return rel.includes('.') && !rel.endsWith('/') && path.extname(rel) ? rel : rel + '/index.html';
};
const urlToAssetPath = (u) => {
  const noQuery = u.replace(/\?.*$/, '').replace(/#.*$/, '');
  const rel = noQuery.startsWith('/') ? noQuery.slice(1) : noQuery.replace(ORIGIN + '/', '');
  return decodeURIComponent(rel);
};

async function get(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', accept: '*/*' },
        redirect: 'follow',
      });
      const buf = Buffer.from(await r.arrayBuffer());
      return { status: r.status, buf, ct: r.headers.get('content-type') || '', finalUrl: r.url };
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

async function pool(items, n, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try { await worker(item); } catch (e) { log('ERR', item, e.message); }
    }
  });
  await Promise.all(runners);
}

// ---------- 1. decouverte des routes ----------
log('== acquisition de', ORIGIN, '==');
const sitemap = await get(ORIGIN + '/sitemap.xml');
const sitemapRoutes = [...sitemap.buf.toString('utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(ORIGIN, ''))
  .filter(Boolean);
log('sitemap :', sitemapRoutes.length, 'URL');

const seen = new Set();
const queue = ['/', '/lab', ...sitemapRoutes];
const pages = [];

while (queue.length && pages.length < MAX_PAGES) {
  const batch = [];
  while (queue.length && batch.length < CONCURRENCY) {
    const r = queue.shift();
    if (r === undefined || seen.has(r)) continue;
    seen.add(r);
    batch.push(r);
  }
  if (!batch.length) break;
  await pool(batch, 1, async (route) => {
    const { status, buf, ct } = await get(ORIGIN + route);
    const file = routeToFile(route);
    const abs = path.join(PAGES_DIR, file);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, buf);
    const html = ct.includes('html') ? buf.toString('utf8') : '';
    const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
    pages.push({ route, status, file: path.relative(RAW, abs), bytes: buf.length, sha256: sha256(buf), title });
    // liens internes -> file d'attente
    if (html) {
      for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
        const href = m[1];
        if (href.startsWith('//') || href.startsWith('/_next/') || href.startsWith('/cdn-cgi/')) continue;
        if (/\.(png|jpe?g|webp|avif|svg|ico|mp3|mp4|webm|woff2?|txt|xml|json|css|js)$/i.test(href)) continue;
        if (!seen.has(href)) queue.push(href);
      }
    }
    log('page', String(status), route.padEnd(46), buf.length + 'o', title.slice(0, 42));
  });
  await new Promise((r) => setTimeout(r, 120));
}

// sonde 404 (la page 404 n'est liee nulle part)
const probe = await get(ORIGIN + '/this-page-does-not-exist-' + Date.now());
await fsp.writeFile(path.join(PAGES_DIR, '_probe404.html'), probe.buf);
log('sonde 404 ->', probe.status, probe.buf.length + 'o');

// ---------- 2. collecte des assets ----------
log('== collecte des assets ==');
const ASSET_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|bmp|mp3|m4a|wav|ogg|mp4|webm|woff2?|ttf|otf|eot|css|js|mjs|json|webmanifest|xml|txt|wasm|hdr|exr|ktx2|glb|gltf|bin)$/i;
const assetUrls = new Map(); // url absolue -> { from, buf? }
const addAsset = (raw, from) => {
  if (!raw) return;
  let u = String(raw).trim();
  if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('mailto:') || u.startsWith('#')) return;
  u = u.split('#')[0];
  if (!u) return;

  let abs;
  if (u.startsWith('http://') || u.startsWith('https://')) {
    if (!u.startsWith(ORIGIN)) return;
    abs = u;
  } else if (u.startsWith('/')) {
    abs = ORIGIN + u;
  } else if (u.startsWith('./')) {
    abs = ORIGIN + '/' + u.slice(2);
  } else {
    return;
  }

  // /_next/image est l'optimiseur de Vercel : on remonte a l'image source.
  if (abs.startsWith(ORIGIN + '/_next/image')) {
    const inner = new URL(abs).searchParams.get('url');
    if (inner) addAsset(inner, from + ' [via _next/image]');
    return;
  }

  const pathname = abs.replace(/\?.*$/, '');
  const isNextAsset = pathname.startsWith(ORIGIN + '/_next/');
  const looksLikeAsset = ASSET_EXT.test(pathname);
  if (!isNextAsset && !looksLikeAsset) return;   // un lien de page n'est pas un asset
  if (pathname === ORIGIN || pathname === ORIGIN + '/') return;

  if (!assetUrls.has(abs)) assetUrls.set(abs, { from });
};

for (const p of pages) {
  const html = (await fsp.readFile(path.join(RAW, p.file))).toString('utf8');
  for (const m of html.matchAll(/(?:href|src|srcSet|content)="([^"]+)"/g)) {
    if (m[0].startsWith('srcSet')) {
      for (const cand of m[1].split(',')) addAsset(cand.trim().split(/\s+/)[0], p.route);
    } else {
      addAsset(m[1], p.route);
    }
  }
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) addAsset(m[2], p.route);
}

// les CSS peuvent pointer vers d'autres assets (polices) : un niveau d'expansion
const cssSeeds = [...assetUrls.keys()].filter((u) => u.replace(/\?.*$/, '').endsWith('.css'));
log('feuilles CSS a explorer :', cssSeeds.length);
for (const cssUrl of cssSeeds) {
  try {
    const res = await get(cssUrl);
    assetUrls.get(cssUrl).buf = res.buf;
    for (const m of res.buf.toString('utf8').matchAll(/url\((['"]?)([^'")]+)\1\)/g)) addAsset(m[2], cssUrl.replace(ORIGIN, ''));
  } catch (e) { log('ERR css', cssUrl, e.message); }
}

log('assets a telecharger :', assetUrls.size);
const assets = [];
const knownAssets = fs.existsSync(MANIFEST) ? (JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).assets || []) : [];
await pool([...assetUrls.keys()], CONCURRENCY, async (u) => {
  const info = assetUrls.get(u);
  const rel = urlToAssetPath(u);
  if (!rel) return;
  const abs = path.join(ASSETS_DIR, rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  if (info.buf === undefined && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    const buf = await fsp.readFile(abs);
    const meta = knownAssets.find((a) => a.url === u);
    assets.push({ url: u, path: path.relative(RAW, abs), bytes: buf.length, sha256: sha256(buf), contentType: meta?.contentType || '', from: info.from, cached: true });
    return;
  }
  const res = info.buf !== undefined ? { buf: info.buf, ct: 'text/css' } : await get(u);
  if (!res.buf || !res.buf.length) { log('SKIP vide', u); return; }
  await fsp.writeFile(abs, res.buf);
  assets.push({ url: u, path: path.relative(RAW, abs), bytes: res.buf.length, sha256: sha256(res.buf), contentType: res.ct || '', from: info.from });
});

// ---------- 3. manifeste ----------
const manifest = {
  origin: ORIGIN,
  capturedAt: new Date().toISOString(),
  deploymentId: (fs.readFileSync(path.join(PAGES_DIR, 'index.html'), 'utf8').match(/dpl_[A-Za-z0-9]+/) || [])[0] || null,
  counts: { pages: pages.length, assets: assets.length },
  pages: pages.sort((a, b) => a.route.localeCompare(b.route)),
  assets: assets.sort((a, b) => a.path.localeCompare(b.path)),
  probe404: { status: probe.status, bytes: probe.buf.length, sha256: sha256(probe.buf) },
};
await fsp.writeFile(MANIFEST, JSON.stringify(manifest, null, 1));

const totalAssets = assets.reduce((a, b) => a + b.bytes, 0);
log('== termine ==');
log('pages  :', pages.length, '(' + pages.filter((p) => p.status === 200).length, 'en 200)');
log('assets :', assets.length, '=', (totalAssets / 1048576).toFixed(1), 'Mo');
log('duree  :', ((Date.now() - t0) / 1000).toFixed(1) + 's');
logStream.end();
