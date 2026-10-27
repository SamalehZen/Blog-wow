// Phase 5 - reinjection du contenu modifie -> dist/ (rebuild)
//
// Le contenu d'origine existe en DEUX copies dans chaque page :
//   1) le balisage HTML visible
//   2) le payload RSC inline (self.__next_f.push) qui alimente l'hydratation
// Un texte change seulement dans (1) revient a l'ancien des l'hydratation.
//
// Strategie : pour chaque chaine on remplace TROIS variantes d'echappement :
//   - brute         (texte tel quel dans un noeud texte)
//   - JSON-echappee (payload RSC : \" \\\\ \n)
//   - HTML-echappee (&amp; &lt; &gt; &quot; &#x27;)
// Le remplacement est ecrit dans la MEME variante que la trouvaille, ce qui
// preserve l'integrite du document dans les deux formats.
//
// Ordre : du plus long au plus court, pour qu'une chaine longue passe avant
// une sous-chaine plus courte.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'capture', 'raw');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');

const walk = (dir, base = dir, out = []) => {
  for (const n of fs.readdirSync(dir)) {
    const abs = path.join(dir, n);
    if (fs.statSync(abs).isDirectory()) walk(abs, base, out);
    else out.push({ abs, rel: path.relative(base, abs) });
  }
  return out;
};

const routeOf = (rel) => (rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '').replace(/\\/g, '/'));

const jsonEsc = (s) => JSON.stringify(s).slice(1, -1);
const htmlEsc = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

const docs = new Map();
for (const p of walk(path.join(CONTENT, 'articles'))) {
  if (!p.rel.endsWith('.json')) continue;
  try {
    const doc = JSON.parse(fs.readFileSync(p.abs, 'utf8'));
    if (doc && doc.route) docs.set(doc.route, doc);
  } catch (e) { console.error('contenu illisible:', p.rel, e.message); }
}

// Lit les pages DEJA construites dans dist/ : les reecritures de build.mjs
// (images source, prelude de navigation, noindex) sont donc preservees.
const pages = walk(DIST).filter((p) => p.rel.endsWith('.html') && !p.rel.startsWith('_'));
const report = { appliedAt: new Date().toISOString(), pages: [], totals: { chains: 0, replaced: 0, untouched: 0, notFound: 0 } };

for (const page of pages) {
  const route = routeOf(page.rel);
  const doc = docs.get(route);
  let html = fs.readFileSync(path.join(DIST, page.rel), 'utf8');
  const original = html;
  const row = { route, chains: 0, replaced: 0, notFound: 0, titleChanged: false };

  if (!doc) {
    fs.writeFileSync(path.join(DIST, page.rel), html);
    report.pages.push({ ...row, noContentFile: true });
    continue;
  }

  const swapField = (field) => {
    const v = doc[field];
    if (!v || !v.en || !v.fr || v.remplacer !== true) return false;
    let changed = false;
    for (const [from, to] of [[v.en, v.fr], [jsonEsc(v.en), jsonEsc(v.fr)], [htmlEsc(v.en), htmlEsc(v.fr)]]) {
      if (from && html.includes(from)) { html = html.split(from).join(to); changed = true; }
    }
    return changed;
  };
  if (swapField('title')) row.titleChanged = true;
  swapField('description');

  const chains = (doc.chaines || []).filter((c) => c && typeof c.en === 'string' && c.en.length > 0);
  chains.sort((a, b) => b.en.length - a.en.length);
  row.chains = chains.length;

  for (const c of chains) {
    if (c.remplacer !== true || typeof c.fr !== 'string' || c.fr.length === 0 || c.fr === c.en) {
      report.totals.untouched++;
      continue;
    }
    let hit = 0;
    for (const [from, to] of [[c.en, c.fr], [jsonEsc(c.en), jsonEsc(c.fr)], [htmlEsc(c.en), htmlEsc(c.fr)]]) {
      if (!from || from === to) continue;
      const parts = html.split(from);
      if (parts.length > 1) { hit += parts.length - 1; html = parts.join(to); }
    }
    if (hit > 0) { row.replaced += hit; report.totals.replaced += hit; }
    else { row.notFound++; report.totals.notFound++; }
  }

  report.totals.chains += chains.length;
  const dest = path.join(DIST, page.rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  report.pages.push({ ...row, bytesIn: original.length, bytesOut: html.length });
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, '_content-report.json'), JSON.stringify(report, null, 1));

const edited = report.pages.filter((p) => p.replaced > 0 || p.titleChanged);
console.log('pages reconstruites : ' + report.pages.length);
console.log('pages modifiees : ' + edited.length);
console.log('chaines declarees : ' + report.totals.chains + ' | remplacements : ' + report.totals.replaced);
if (report.totals.notFound) console.log('marquees remplacer mais introuvables : ' + report.totals.notFound);
const noDoc = report.pages.filter((p) => p.noContentFile).length;
if (noDoc) console.log('pages sans fichier de contenu (copiees telles quelles) : ' + noDoc);