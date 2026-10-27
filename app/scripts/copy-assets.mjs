// Copie les assets partages depuis le clone (../photographer) vers public/.
// Ils ne sont pas commites : le depot reste autour de 180 Mo au lieu de 350.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = process.env.CLONE_DIST || path.join(ROOT, '..', 'photographer', 'dist');
const PUB = path.join(ROOT, 'public');

const dirs = ['_next', 'sky', 'art', 'posts'];
const files = ['favicon.ico', 'icon.svg', 'apple-icon.png', 'manifest.webmanifest'];

if (!fs.existsSync(SRC)) {
  console.error('source absente : ' + SRC);
  process.exit(1);
}
fs.mkdirSync(PUB, { recursive: true });
for (const d of dirs) {
  const from = path.join(SRC, d);
  if (!fs.existsSync(from)) { console.warn('absent : ' + d); continue; }
  fs.cpSync(from, path.join(PUB, d), { recursive: true });
  console.log('copie ' + d);
}
for (const f of files) {
  const from = path.join(SRC, f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(PUB, f));
}
console.log('assets copies -> public/');
