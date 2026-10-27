// Ajoute le vhost photo.hypeer.cloud au Caddyfile partage de l'edge Caddy.
// Executer SUR le VPS (voir README-deploy.md), jamais en local.
//   node caddy-vhost.mjs            -> affiche le bloc, ne touche a rien
//   node caddy-vhost.mjs --apply    -> sauvegarde horodatee puis ajoute le bloc
import fs from 'node:fs';

const P = '/opt/HyperFix2/nao-gamme/Caddyfile';
const DOMAIN = 'photo.hypeer.cloud';
const apply = process.argv.includes('--apply');

const text = fs.readFileSync(P, 'utf8');
if (text.includes(DOMAIN)) {
  console.error('ABORT: ' + DOMAIN + ' deja present');
  process.exit(1);
}

const block = `

# Clone statique de www.theboringblog.ai (46 routes, scene WebGL, /lab).
# Conteneur photographer (/opt/photographer), reseau hyperfix-net.
# Aucune authentification : le site est public.
${DOMAIN} {
\theader Strict-Transport-Security "max-age=31536000; includeSubDomains"
\treverse_proxy photographer:80
}
`;

if (!apply) {
  console.log('--- WILL APPEND ---' + block);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backup = P + '.bak-' + stamp;
fs.copyFileSync(P, backup);
fs.writeFileSync(P, text.replace(/\s+$/, '') + block);
console.log('backup: ' + backup);
console.log('applied, bytes ' + text.length + ' -> ' + fs.statSync(P).size);
