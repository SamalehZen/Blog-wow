#!/usr/bin/env node
// Phase 6 - harnais de fidelite (stub)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function loadDoc(route) {
  const rel = route === '/' ? 'index.html' : route.replace(/^\//, '') + '/index.html';
  const full = path.join(DIST, rel);
  if (!fs.existsSync(full)) return { route, missing: true };
  return { route, rel, html: fs.readFileSync(full, 'utf8') };
}

function contentMismatch(doc, html) {
  const rows = [];
  for (const c of doc.chaines) {
    if (!c.fr) continue;
    const need = c.remplacer ? c.fr : c.en;
    if (!html.includes(need)) rows.push({ en: c.en.slice(0, 60), fr: c.fr.slice(0, 60), expected: need });
  }
  const t = doc.title;
  if (t.fr) { const expected = t.remplacer ? t.fr : t.en; if (!html.includes(expected)) rows.push({ en: t.en, fr: t.fr, expected }); }
  return rows;
}

const page = loadDoc('/');
const doc = JSON.parse(fs.readFileSync(path.join(CONTENT, 'articles/accueil.json'), 'utf8'));
const mismatches = contentMismatch(doc, page.html);
console.log('accueil: mismatch de contenu:', mismatches.length);
for (const m of mismatches) console.log('  -', JSON.stringify(m));
console.log('taille dist/index.html:', page.html.length);
console.log('sha256 dist/index.html:', sha256(page.html));
