#!/usr/bin/env node
// Phase 4 - extraction du modele de contenu -> content/articles/*.json
//
// Le contenu de l'origine vit a DEUX endroits dans chaque page :
//   a) le balisage HTML visible (rendu initial)
//   b) le payload RSC inline (self.__next_f.push) qui alimente l'hydratation
//      et la navigation client de Next.
// Un texte modifie seulement dans (a) revient a l'ancien des l'hydratation.
// apply-content.mjs remplace donc la chaine PARTOUT dans le fichier, ce qui
// couvre simultanement (a) et (b), HTML-echappe comme JSON-echappe.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'capture', 'raw');
const OUT = path.join(ROOT, 'content');

const walk = (dir, base = dir, out = []) => {
  for (const n of fs.readdirSync(dir)) {
    const abs = path.join(dir, n);
    if (fs.statSync(abs).isDirectory()) walk(abs, base, out);
    else if (n.endsWith('.html')) out.push({ abs, rel: path.relative(base, abs) });
  }
  return out;
};

const routeOf = (rel) => (rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '').replace(/\\/g, '/'));
const decodeEntities = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
  .replace(/&#x2f;/g, '/').replace(/&nbsp;/g, ' ');

// --- texte visible : noeuds texte du <body>, hors script/style -------------
function visibleTexts(html) {
  const start = html.indexOf('<body');
  const end = html.lastIndexOf('</body>');
  const body = html.slice(start === -1 ? 0 : start, end === -1 ? html.length : end);
  const out = [];
  const re = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<\/?[a-zA-Z][^>]*>|([^<]+)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[1] === undefined) continue;
    const text = decodeEntities(m[1]).trim();
    if (text.length >= 3 && /[a-zA-Z\u00C0-\u024F]/.test(text)) out.push(text);
  }
  return out;
}

// --- chaines du payload RSC ------------------------------------------------
// Les textes y apparaissent sous forme de chaines JSON, generalement echappees
// dans un litteral de script. On extrait les litteraux entre guillemets d'une
// certaine longueur, puis on ecarte ce qui n'est manifestement pas du texte
// (chemins, classes CSS, identifiants, URL).
const NOT_TEXT = /^(?:[a-z0-9_-]+|\/[^\s]*|\.{1,2}\/[^\s]*|#[0-9a-zA-Z]{3,8}|[A-Za-z0-9_$-]+(?:\s+[A-Za-z0-9_$-]+){0,3})$/;
function payloadTexts(html) {
  const out = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    const body = sm[1];
    if (body.length < 1500) continue;              // ignore les petits scripts utilitaires
    if (!body.includes('__next_f')) continue;      // ne garde que le payload RSC
    // litteraux: "..." avec echappements
    const litRe = /"((?:[^"\\]|\\.){25,})"/g;
    let lm;
    while ((lm = litRe.exec(body)) !== null) {
      let v;
      try { v = JSON.parse('"' + lm[1] + '"'); } catch { continue; }
      if (v.length < 25) continue;
      if (/^https?:/i.test(v)) continue;
      if (/^\s*[[{]/.test(v)) continue;               // JSON structurel
      if (!/[a-zA-Z]{3}/.test(v)) continue;
      if (!/\s/.test(v)) continue;                    // un mot isole n'est pas du contenu
      const wordish = (v.match(/[A-Za-z]{2,}/g) || []).length;
      if (wordish < 4) continue;
      const nonAscii = (v.match(/[^\x20-\x7E]/g) || []).length;
      if (nonAscii / v.length > 0.35) continue;        // bruit base64 / hash
      out.push(v);
    }
  }
  return out;
}

const pages = walk(path.join(RAW, 'pages')).sort((a, b) => a.rel.localeCompare(b.rel));
fs.mkdirSync(path.join(OUT, 'articles'), { recursive: true });

const index = [];
for (const p of pages) {
  const html = fs.readFileSync(p.abs, 'utf8');
  const route = routeOf(p.rel);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const description = (html.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];

  const visible = visibleTexts(html);
  const payload = payloadTexts(html);

  // union, ordre stable : d'abord ce qui est visible, puis le reste
  const seen = new Set();
  const all = [];
  for (const s of [...visible, ...payload]) {
    if (seen.has(s)) continue;
    seen.add(s);
    all.push(s);
  }

  const slug = route === '/' ? 'accueil'
    : route.replace(/^\//, '').replace(/\//g, '__').replace(/[^a-zA-Z0-9_.-]/g, '-');

  const doc = {
    _lisezMoi: [
      'Fichier de contenu de la page ' + route,
      '',
      'Chaque entree de "chaines" se lit :',
      '  { "en": "texte d origine", "fr": "nouveau texte", "remplacer": true }',
      '  - remplacer: true  -> "fr" remplace "en" PARTOUT (HTML visible et payload RSC)',
      '  - remplacer: false -> la chaine reste intacte',
      'Vous pouvez ajouter, supprimer ou reordonner les entrees librement.',
      'Puis : npm run build && npm run verify',
    ],
    route,
    title: { en: title, fr: null, remplacer: false },
    description: { en: description, fr: null, remplacer: false },
    chaines: all.map((s) => ({ en: s, fr: null, remplacer: false })),
  };
  fs.writeFileSync(path.join(OUT, 'articles', slug + '.json'), JSON.stringify(doc, null, 1));
  index.push({ route, file: p.rel, slug, title, strings: all.length, visible: visible.length, payload: payload.length });
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));

const total = index.reduce((a, b) => a + b.strings, 0);
console.log('contenu extrait : ' + index.length + ' pages, ' + total + ' chaines');
console.log('moyenne/page : ' + Math.round(total / index.length));
for (const e of index.slice(0, 6)) console.log('  ' + e.route.padEnd(34) + e.strings + ' chaines (' + e.visible + ' visibles, ' + e.payload + ' payload)');
