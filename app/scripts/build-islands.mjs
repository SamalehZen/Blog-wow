// Construit les "ilots" : des pages d'origine montees telles quelles dans une iframe,
// avec leur propre chrome (entete, pied, titres) masque par une feuille injectee.
//
// Pourquoi une iframe et non un portage : le code d'origine (scenes WebGL,
// 30 sketches /lab) est un bundle minifie lie au runtime Next. Le charger tel quel
// dans son propre document garantit un rendu identique a l'octet, sans reecriture.
//
// Les ilots partagent l'origine de l'application : les URL absolues /_next/... ,
// /sky/... , /art/... et /posts/... se resolvent donc sur public/.

import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.env.CLONE || '/home/node/photographer';
const SRC = path.join(CLONE, 'dist');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'islands');

// chrome de l'origine a masquer dans un ilot
const HIDE = [
  '.mast',        // entete
  '.hero',        // titre de page d'accueil
  '.track',       // molette
  '.subscribe',   // boutons de la modale
  '[data-slot="button"]',
  'header', 'footer', 'nav',
];

function cssFor(hide) {
  return '<style id="island-chrome">' + hide.map((s) => s + '{display:none!important}').join('') +
    'html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important}' +
    'body{height:100vh!important}' +
    '*::-webkit-scrollbar{display:none}' +
    '</style>';
}

function makeIsland(route, name, hide) {
  const rel = route === '/' ? 'index.html' : route.replace(/^\//, '') + '/index.html';
  const src = path.join(SRC, rel);
  if (!fs.existsSync(src)) { console.warn('absent:', route); return null; }
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace(/<\/head>/i, cssFor(hide) + '</head>');
  // marqueur pour le parent
  html = html.replace(/<body([^>]*)>/i, '<body$1 data-island="' + name + '">');
  const dest = path.join(OUT, name + '.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  return { name, route, bytes: html.length };
}

fs.mkdirSync(OUT, { recursive: true });
const built = [];

// 1. la scene de l'accueil : on garde le ciel et le stage, on retire le texte
built.push(makeIsland('/', 'scene', [...HIDE, '.sky img']));
// 2. chaque sketch /lab
const labDir = path.join(SRC, 'lab');
if (fs.existsSync(labDir)) {
  for (const d of fs.readdirSync(labDir)) {
    const p = path.join(labDir, d, 'index.html');
    if (!fs.existsSync(p)) continue;
    built.push(makeIsland('/lab/' + d, 'lab-' + d, HIDE));
  }
}
// 3. les demos integrees aux articles (scene de l'article complete)
for (const slug of ['making-stylized-grass', 'eskiz-number-input', 'agent-replay',
  'gtm-engineering-explained-badly', 'it-was-supposed-to-be-a-small-change',
  'the-boring-state-of-artificial-intelligence']) {
  built.push(makeIsland('/posts/' + slug, 'post-' + slug, HIDE));
}

const manifest = built.filter(Boolean);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('ilots construits:', manifest.length);
for (const m of manifest.slice(0, 6)) console.log('  ' + m.name + '  <- ' + m.route + '  (' + m.bytes + ' o)');
