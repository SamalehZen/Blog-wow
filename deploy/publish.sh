#!/bin/sh
# Publie le clone sur photo.hypeer.cloud.
# A lancer depuis le poste d'admin : SSH/SFTP via /home/node/Sam/Excel/deploy (.vpw).
set -eu

PROJECT="${PROJECT:-/home/node/photographer}"
TOOLS="${TOOLS:-/home/node/Sam/Excel/deploy}"
REMOTE="${REMOTE:-/opt/photographer}"
CADDYFILE="${CADDYFILE:-/opt/HyperFix2/nao-gamme/Caddyfile}"
CADDY_CT="${CADDY_CT:-nao_gamme_caddy}"
DOMAIN="${DOMAIN:-photo.hypeer.cloud}"

cd "$PROJECT"

echo "== 1. build (contenu applique)"
npm run build --silent

echo "== 2. remplacement complet de dist sur le VPS"
node "$TOOLS/rsh.mjs" "mkdir -p $REMOTE && rm -rf $REMOTE/dist && mkdir -p $REMOTE/dist"

echo "== 3. envoi du build"
node "$TOOLS/upload.mjs" "$PROJECT/dist" "$REMOTE/dist"

echo "== 4. fichiers de service"
node "$TOOLS/upx.mjs" "$PROJECT/deploy/nginx.conf"       "$REMOTE/nginx.conf"
node "$TOOLS/upx.mjs" "$PROJECT/deploy/docker-compose.yml" "$REMOTE/docker-compose.yml"
node "$TOOLS/upx.mjs" "$PROJECT/deploy/caddy-vhost.mjs"  "$REMOTE/caddy-vhost.mjs"

echo "== 5. conteneur"
node "$TOOLS/rsh.mjs" "cd $REMOTE && docker compose up -d --force-recreate && sleep 3 && docker compose ps"

echo "== 6. vhost Caddy (idempotent)"
node "$TOOLS/rsh.mjs" "grep -q $DOMAIN $CADDYFILE || node $REMOTE/caddy-vhost.mjs --apply"
node "$TOOLS/rsh.mjs" "docker exec $CADDY_CT caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null && docker exec $CADDY_CT caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null && echo caddy-reload-ok"
node "$TOOLS/rsh.mjs" "docker exec photographer nginx -s reload && echo nginx-reload-ok"

echo "== 7. verification en production"
sleep 4
for p in / /posts /lab /lab/mow /posts/making-stylized-grass /does-not-exist; do
  printf 'https://%s%-38s' "$DOMAIN" "$p"
  curl -sS -o /dev/null -w '%{http_code} %{size_download}o\n' "https://$DOMAIN$p"
done

echo "live: https://$DOMAIN"
