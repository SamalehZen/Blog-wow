#!/bin/sh
# Publie l'application sur https://photo.hypeer.cloud/v2/
# Build local, puis envoi des seuls fichiers de l'application (pas des assets
# partages, deja servis a la racine par le clone).
set -eu

APP="${APP:-/home/node/blog-wow-app}"
TOOLS="${TOOLS:-/home/node/Sam/Excel/deploy}"
REMOTE="${REMOTE:-/opt/photographer/dist/v2}"

cd "$APP"

echo "== 1. build"
env -u NODE_ENV npx vite build

echo "== 2. remplacement de $REMOTE"
node "$TOOLS/rsh.mjs" "rm -rf $REMOTE && mkdir -p $REMOTE"

echo "== 3. envoi (application seule)"
node "$TOOLS/upload.mjs" "$APP/dist" "$REMOTE" >/dev/null

echo "== 4. nettoyage des assets dupliques cote serveur"
# public/ a ete copie dans dist par Vite : ces fichiers existent deja a la racine
node "$TOOLS/rsh.mjs" "cd $REMOTE && rm -rf _next sky art posts islands/*.map 2>/dev/null; du -sh $REMOTE"

echo "== 5. rechargement nginx"
node "$TOOLS/rsh.mjs" "docker exec photographer nginx -t && docker exec photographer nginx -s reload"

echo "== 6. verification"
sleep 2
for p in /v2/ /v2/posts /v2/lab /v2/posts/making-stylized-grass /v2/lab/mow; do
  printf 'https://photo.hypeer.cloud%-34s' "$p"
  curl -sS -o /dev/null -w '%{http_code} %{size_download}o\n' "https://photo.hypeer.cloud$p"
done
echo "live: https://photo.hypeer.cloud/v2/"
