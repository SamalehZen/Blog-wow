// Extrait les jetons de design du clone (CSS d'origine) vers src/styles/tokens.css
// Le CSS source reste la reference : on ne reecrit pas les valeurs, on les expose
// comme variables CSS + theme Tailwind v4 (@theme).
import fs from 'node:fs';
import path from 'node:path';

const CLONE = process.env.CLONE || '/home/node/photographer';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'styles');
const CSS_DIR = path.join(CLONE, 'dist', '_next', 'static', 'chunks');

const files = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
const css = files.map((f) => fs.readFileSync(path.join(CSS_DIR, f), 'utf8')).join('\n');

// variables declarees sur :root / html / [data-theme]
const vars = new Map();
for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi)) {
  const [, name, value] = m;
  if (!vars.has(name)) vars.set(name, value.trim());
}

// on garde les jetons de design (couleurs, espaces, typo, rayons, ombres, easings)
const DESIGN = /^(color|text|bg|surface|border|accent|ink|font|text|leading|tracking|radius|shadow|stroke|ease|duration|space|size|container|seam|chrome|sky|mast|hero|control)/;
const design = [...vars.entries()].filter(([k]) => DESIGN.test(k));

fs.mkdirSync(OUT, { recursive: true });

const lines = [];
lines.push('/* JETONS DE DESIGN — extraits automatiquement du CSS d\'origine.');
lines.push('   Ne pas editer a la main : relancer "npm run tokens". */');
lines.push(':root {');
for (const [k, v] of design) lines.push('  --' + k + ': ' + v + ';');
lines.push('}');
lines.push('');
lines.push('@theme inline {');
// exposer une selection comme utilitaires Tailwind
const themeMap = {
  '--color-accent': 'var(--accent)',
  '--color-ink': 'var(--ink)',
  '--color-surface': 'var(--surface)',
};
lines.push('  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;');
lines.push('  --font-display: var(--font-display), Georgia, serif;');
lines.push('}');

fs.writeFileSync(path.join(OUT, 'tokens.css'), lines.join('\n'));
console.log('tokens:', design.length, 'variables de design ->', path.join(OUT, 'tokens.css'));
