#!/usr/bin/env node
// Serveur local du clone : reproduit le comportement de l'origine pour la recette.
//   /route            -> dist/route/index.html          (200, sans redirection)
//   /route/           -> idem
//   /fichier.ext      -> dist/fichier.ext
//   /_next/image?url=X&w=N -> sert directement X (l'optimiseur Vercel n'existe pas)
//   URL inconnue      -> dist/404-probe-does-not-exist/index.html avec statut 404
//
// Usage: node tools/serve.mjs [port] [racine]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const BASE = path.resolve(process.argv[3] || path.join(ROOT, 'dist'));
const NOT_FOUND = path.join(BASE, '404-probe-does-not-exist', 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/vnd.microsoft.icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm', '.map': 'application/json',
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const inside = (p) => p === BASE || p.startsWith(BASE + path.sep);

function resolveFile(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const rel = decoded.replace(/^\/+/, '');
  const candidates = [];
  if (rel === '') candidates.push(path.join(BASE, 'index.html'));
  else {
    candidates.push(path.join(BASE, rel));
    candidates.push(path.join(BASE, rel, 'index.html'));
    if (rel.endsWith('/')) candidates.push(path.join(BASE, rel.slice(0, -1), 'index.html'));
  }
  for (const c of candidates) {
    if (!inside(c)) continue;
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

function sendFile(res, file, req, status = 200) {
  const isPage = file.endsWith('.html');
  res.writeHead(status, {
    'Content-Type': mimeOf(file),
    'Content-Length': fs.statSync(file).size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': isPage ? 'no-cache, max-age=0, must-revalidate' : 'public, max-age=604800',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }); return res.end('method not allowed');
  }
  const [urlPath, query = ''] = (req.url || '/').split('?');

  // Optimiseur d'images de Next : on sert l'image source demandee.
  if (urlPath === '/_next/image') {
    const params = new URLSearchParams(query);
    const target = params.get('url') || '';
    const file = target ? resolveFile(target) : null;
    if (file) return sendFile(res, file, req);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('no image');
  }

  // Scripts d'analytics injectes a l'execution par la plateforme d'origine :
  // on repond un script vide au lieu d'un 404 (aucune requete sortante).
  if (/^\/[0-9a-f]{10,}\/script\.js$/.test(urlPath)) {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return res.end('/* analytics desactive dans ce clone */');
  }

  const file = resolveFile(urlPath);
  if (file) return sendFile(res, file, req);
  try {
    const body = fs.readFileSync(NOT_FOUND);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
    return res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('clone servi sur http://127.0.0.1:' + PORT + '  (racine ' + BASE + ')');
});
