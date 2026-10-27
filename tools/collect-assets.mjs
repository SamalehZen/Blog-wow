#!/usr/bin/env node
// Phase 2 - collecte des assets a partir des pages DEJA capturees sur disque.
//
// Pourquoi separer : l'origine (Vercel) applique un "Security Checkpoint" quand on
// enchaine trop de requetes de pages. Les pages sont donc capturees une fois, puis
// les assets (servis par le CDN /_next/static et /posts/*) sont collectes ici, avec
// politesse (delai + retries) et detection du challenge.

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
const LOGFILE = path.join(ROOT, 'logs', 'assets.log');

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const CONCURRENCY = 3;
const DELAY_MS = 220;
const logStream = fs.createWriteStream(LOGFILE, { flags: 'a' });
const log = (...a) => {
  const line = new Date().toISOString().slice(11, 19) + '  ' + a.join(' ');
  console.log(line);
  logStream.write(line + '\n');
};
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isChallenge = (buf, ct) => {
  if (!ct.includes('html')) return false;
  const s = buf.toString('utf8', 0, Math.min(buf.length, 4000));
  return s.includes('Security Checkpoint') || s.includes('challenge.v2');
};

async function get(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' });
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get('content-type') || '';
      if (r.status === 403 || r.status === 429 || isChallenge(buf, ct)) {
        const wait = 2500 * (i + 1);
        log('  limite/challenge', r.status, url.slice(-70), '-> attente', wait + 'ms');
        await sleep(wait);
        lastErr = new Error('challenge ' + r.status);
        continue;
      }
      return { status: r.status, buf, ct };
    } catch (e) {
      lastErr = e;
      await sleep(900 * (i + 1));
    }
  }
  throw lastErr;
}

async function pool(items, n, worker) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const it = queue.shift();
      try { await worker(it); } catch (e) { log('ERR', String(it).slice(-80), e.message); }
      await sleep(DELAY_MS);
    }
  }));
}

// ---------- inventaire des pages ----------
function walk(dir, base = dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, base, out);
    else if (name.endsWith('.html')) out.push({ abs, rel: path.relative(base, abs), bytes: st.size });
  }
  return out;
}
const pageFiles = walk(PAGES_DIR);
log('pages locales :', pageFiles.length);

const routeOf = (rel) => '/' + rel.replace(/index\.html$/, '').replace(/\\/g, '/').replace(/\/$/, '') || '/';
const pages = pageFiles.map((p) => {
  const buf = fs.readFileSync(p.abs);
  const html = buf.toString('utf8');
  return {
    route: p.rel === 'index.html' ? '/' : routeOf(p.rel),
    file: path.relative(RAW, p.abs),
    bytes: p.bytes,
    sha256: sha256(buf),
    title: (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1],
    status: 200,
  };
}).sort((a, b) => a.route.localeCompare(b.route));

// ---------- collecte des references ----------
const ASSET_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|bmp|mp3|m4a|wav|ogg|mp4|webm|woff2?|ttf|otf|eot|css|js|mjs|json|webmanifest|wasm|hdr|exr|glb|gltf|bin|map)$/i;
const found = new Map(); // url absolue -> { from, rel }
const add = (raw, from) => {
  if (!raw) return;
  let u = String(raw).trim().split('#')[0];
  if (!u || /^(data:|blob:|mailto:|javascript:)/.test(u)) return;
  let abs;
  if (/^https?:/.test(u)) { if (!u.startsWith(ORIGIN)) return; abs = u; }
  else if (u.startsWith('//')) return;
  else if (u.startsWith('/')) abs = ORIGIN + u;
  else return;
  if (abs.startsWith(ORIGIN + '/_next/image')) {
    const inner = new URL(abs).searchParams.get('url');
    if (inner) add(inner, from + ' [_next/image]');
    return;
  }
  const pn = abs.replace(/\?.*$/, '');
  if (pn.startsWith(ORIGIN + '/_next/image')) return;
  const ok = pn.startsWith(ORIGIN + '/_next/') || ASSET_EXT.test(pn);
  if (!ok) return;
  if (pn === ORIGIN || pn === ORIGIN + '/') return;
  const rel = decodeURIComponent(pn.replace(ORIGIN + '/', ''));
  if (!found.has(abs)) found.set(abs, { from, rel });
};

for (const p of pageFiles) {
  const html = fs.readFileSync(p.abs, 'utf8');
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) add(m[1], p.rel);
  for (const m of html.matchAll(/<link[^>]*href="([^"]+)"/g)) add(m[1], p.rel);
  for (const m of html.matchAll(/<img[^>]*src="([^"]+)"/g)) add(m[1], p.rel);
  for (const m of html.matchAll(/<(?:source|video|audio)[^>]*src="([^"]+)"/g)) add(m[1], p.rel);
  for (const m of html.matchAll(/srcSet="([^"]+)"/g)) for (const c of m[1].split(',')) add(c.trim().split(/\s+/)[0], p.rel);
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) add(m[2], p.rel);
  for (const m of html.matchAll(/"(\/posts\/[^"]+\.(?:png|jpe?g|webp|mp3|mp4|webm))"/g)) add(m[1], p.rel);
}
log('references trouvees :', found.size);

// expansion CSS (polices, images de fond) - une passe
const cssUrls = [...found.keys()].filter((u) => u.replace(/\?.*$/, '').endsWith('.css'));
log('CSS a explorer :', cssUrls.length);
const cssBodies = new Map();
for (const u of cssUrls) {
  if (fs.existsSync(path.join(ASSETS_DIR, found.get(u).rel))) continue;
  try {
    const res = await get(u);
    cssBodies.set(u, res.buf);
    for (const m of res.buf.toString('utf8').matchAll(/url\((['"]?)([^'")]+)\1\)/g)) add(m[2], u.replace(ORIGIN, ''));
    await sleep(DELAY_MS);
  } catch (e) { log('ERR css', u.slice(-60), e.message); }
}
log('references totales apres CSS :', found.size);

// ---------- telechargement ----------
const assets = [];
const fails = [];
await pool([...found.keys()], CONCURRENCY, async (u) => {
  const info = found.get(u);
  const abs = path.join(ASSETS_DIR, info.rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) {
    const buf = fs.readFileSync(abs);
    assets.push({ url: u, path: path.relative(RAW, abs), bytes: buf.length, sha256: sha256(buf), from: info.from, cached: true });
    return;
  }
  const res = cssBodies.has(u) ? { status: 200, buf: cssBodies.get(u), ct: 'text/css' } : await get(u);
  await fsp.writeFile(abs, res.buf);
  assets.push({ url: u, path: path.relative(RAW, abs), bytes: res.buf.length, sha256: sha256(res.buf), contentType: res.ct, from: info.from });
});

const manifest = {
  origin: ORIGIN,
  capturedAt: new Date().toISOString(),
  deploymentId: (fs.readFileSync(path.join(PAGES_DIR, 'index.html'), 'utf8').match(/dpl_[A-Za-z0-9]+/) || [])[0] || null,
  counts: { pages: pages.length, assets: assets.length },
  pages,
  assets: assets.sort((a, b) => a.path.localeCompare(b.path)),
};
await fsp.writeFile(MANIFEST, JSON.stringify(manifest, null, 1));

const total = assets.reduce((a, b) => a + b.bytes, 0);
log('== termine ==');
log('assets :', assets.length, '=', (total / 1048576).toFixed(1), 'Mo');
const byKind = {};
for (const a of assets) { const e = (a.path.match(/\.[a-z0-9]+$/i) || ['?'])[0].toLowerCase(); byKind[e] = (byKind[e] || 0) + 1; }
log('par type :', JSON.stringify(byKind));
logStream.end();
