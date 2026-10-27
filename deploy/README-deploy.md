# photographer — production (photo.hypeer.cloud)

Build statique de `/home/node/photographer`, servi par **nginx** dans le conteneur
`photographer`, derrière l'edge **Caddy** partagé `nao_gamme_caddy`
(réseau docker `hyperfix-net`). Aucun backend, aucun appel tiers.

## Live

https://photo.hypeer.cloud

## Sur le VPS

    /opt/photographer/
      dist/                 # build : 46 routes + 145 assets (173 Mo)
      nginx.conf            # hôte statique + page 404 clonée
      docker-compose.yml    # nginx:1.27-alpine, réseau hyperfix-net
      caddy-vhost.mjs       # ajout idempotent du vhost (sauvegarde horodatée)
      README.md             # ce fichier

## Déployer

    sh deploy/publish.sh

Le script reconstruit, remplace intégralement `/opt/photographer/dist`,
envoie les fichiers de service, recrée le conteneur, ajoute le vhost Caddy s'il
manque, valide et recharge Caddy, puis sonde la production.

## Caddy

    photo.hypeer.cloud {
        header Strict-Transport-Security "max-age=31536000; includeSubDomains"
        reverse_proxy photographer:80
    }

## Exploitation

    cd /opt/photographer
    docker compose ps
    docker compose logs -f
    curl -sI https://photo.hypeer.cloud/

## Historique

- 2026-10-27 : création. Vhost ajouté au Caddyfile partagé (sauvegarde
  `Caddyfile.bak-<horodatage>`), certificat Let's Encrypt émis automatiquement.
