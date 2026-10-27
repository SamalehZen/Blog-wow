// L'origine injecte deux scripts d'analytics a l'execution (/<hash>/script.js).
// Le clone n'en veut pas : on sert un script vide au meme chemin pour eviter
// un 404 et une erreur console dans les ilots.
import fs from 'node:fs';
import path from 'node:path';

const PUB = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
for (const h of ['d8cfe6e103a22d0b', '02e71e65b966ffac']) {
  const dir = path.join(PUB, h);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'script.js'), '/* analytics desactive */');
}
console.log('stubs analytics: 2');
