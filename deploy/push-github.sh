#!/usr/bin/env bash
# Pousse le depot local vers GitHub.
#
# Le jeton est lu dans un fichier (jamais en argument, jamais affiche) :
#   printf '%s' 'ghp_xxx' > /home/node/.gh-token && chmod 600 /home/node/.gh-token
#   bash deploy/push-github.sh
#
# Le remote reste configure sur l'URL propre : le jeton n'est pas stocke dans .git.
set -euo pipefail

PROJECT="${PROJECT:-/home/node/photographer}"
TOKENFILE="${TOKENFILE:-/home/node/.gh-token}"
REPO="${REPO:-SamalehZen/Blog-wow}"
BRANCH="${BRANCH:-main}"

[ -f "$TOKENFILE" ] || { echo "jeton absent : $TOKENFILE" >&2; exit 1; }
TOKEN=$(tr -d '\r\n ' < "$TOKENFILE")
[ -n "$TOKEN" ] || { echo "jeton vide" >&2; exit 1; }

cd "$PROJECT"
git remote set-url origin "https://github.com/$REPO.git"

set +e
git push "https://x-access-token:$TOKEN@github.com/$REPO.git" "$BRANCH:$BRANCH" 2>&1 \
  | sed -E 's#https://[^@]*@#https://***@#g'
RC=${PIPESTATUS[0]}
set -e

unset TOKEN
if [ "$RC" -eq 0 ]; then
  git branch --set-upstream-to="origin/$BRANCH" "$BRANCH" >/dev/null 2>&1 || true
  echo "pousse : https://github.com/$REPO"
else
  echo "echec du push (code $RC)" >&2
  exit "$RC"
fi
