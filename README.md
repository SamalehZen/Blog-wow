# photographer — clone de www.theboringblog.ai

Clone statique **fidèle** du site `https://www.theboringblog.ai`, déployé sur
**https://photo.hypeer.cloud**. Projet indépendant, sans aucun lien de code avec
les clones précédents.

**Niveau 2** : miroir intégral (design, animations, scène WebGL, 30 sketches) **plus**
une couche de contenu éditable. Vous changez les textes et les images dans
`content/`, le reste est préservé à l'octet près.

---

## En un coup d'œil

| | |
|---|---|
| Routes | **46** (accueil, /posts, 6 articles, 6 transcripts, /lab + 30 sketches, 404) |
| Assets | **145 fichiers · 173 Mo** (images, 6 mp3, 3 polices, 62 chunks JS, 24 illustrations) |
| Fidélité | **16/16 pages capturées byte-identiques** à l'origine |
| Console | **0 erreur**, **0 requête échouée** sur toutes les pages |
| Responsive | 390 / 768 / 1440 px, **0 débordement horizontal** |
| Sécurité | Aucune authentification, aucun backend, aucun appel tiers |
| TLS | Let's Encrypt, valide jusqu'au 25 janvier 2027 |

---

## Éditer le contenu

Tout se passe dans `content/`. **Un fichier JSON par page.**

    content/
      index.json                    index des 46 pages
      articles/
        accueil.json                la page d'accueil
        posts__making-stylized-grass.json
        lab__mow.json
        ...

Chaque fichier contient un tableau `chaines` :

    { "en": "Art direction first, then the engineering…",
      "fr": "Direction artistique, puis l'ingénierie…",
      "remplacer": true }

- `remplacer: true` → le texte `fr` remplace `en` **partout** (HTML visible **et**
  payload RSC). C'est indispensable : le site est une application Next.js qui
  contient chaque texte **en deux exemplaires**. Une modification faite à un seul
  endroit serait annulée à l'hydratation.
- `remplacer: false` → la chaîne reste intacte.

Le titre et la description ont leur propre entrée :

    "title": { "en": "…", "fr": "Nouveau titre", "remplacer": true }

Puis :

    npm run build      # applique le contenu à tout le site
    npm run verify     # contrôle qu'aucune chaîne n'est restée orpheline
    npm run publish    # met en ligne

### Remplacer une image

Déposez votre fichier au même chemin que l'original, dans
`capture/raw/assets/` (ex. `capture/raw/assets/posts/making-stylized-grass/wind.png`),
puis `npm run build`. Le build recopie tout l'arbre d'assets.
Pour les illustrations de la scène 3D : `capture/raw/assets/art/situations/`.

---

## Ce qui a été fait, et comment c'est vérifié

### 1. Acquisition
`tools/acquire.mjs` puis `tools/collect-assets.mjs`.

L'origine (Vercel) applique un « Security Checkpoint » quand on enchaîne les
requêtes. Les 46 pages ont donc été capturées en **octets bruts**, puis les
assets collectés séparément avec temporisation et reprise sur 403.

Deux gisements d'assets échappent au HTML et ont été retrouvés dans les bundles :

- **3 chunks JS** chargés dynamiquement (`0mcpcz1rq6ljb.js`, `23tft18o9t3ud.js`,
  `2a8e740r35qna.js`), invisibles dans le HTML.
- **24 illustrations** `/art/situations/*.png` (42 Mo) construites à l'exécution
  par un template `/art/situations/${e.src}` dans la scène Three.js.

Sans cette étape, la scène 3D de l'accueil apparaîtrait sans ses images.

### 2. Construction
`tools/build.mjs` reproduit **exactement l'espace d'URL de l'origine**
(`/_next/static/…`, `/posts/<slug>/…`, `/sky/…`), donc **aucune URL d'asset
n'est réécrite** : un asset ne peut pas se casser par réécriture.

Quatre modifications seulement, toutes tracées dans `dist/_build-report.json` :

1. `/_next/image?url=X` → `X` (l'optimiseur Vercel n'existe pas ici), dans le
   `<img>`, les `<link rel=preload>`, les `srcSet` **et le payload RSC**.
2. Config image de Next neutralisée (`unoptimized: true`) dans le chunk de
   configuration, sinon l'hydratation reconstruisait des URL `/_next/image`.
3. Scripts d'analytics retirés ; leurs URL répondent un script vide.
4. `noindex, nofollow` (voir plus bas).

### 3. Navigator sans serveur RSC
Le préambule injecté avant `</body>` transforme tout clic interne en navigation
complète. Sans lui, le routeur client de Next demanderait `/route?_rsc=…`, que
ce serveur statique ne peut pas produire. **Vérifié** : clic sur « Posts » depuis
l'accueil → navigation réelle, zéro requête en échec.

### 4. Fidélité mesurée

| Contrôle | Résultat |
|---|---|
| Pages capturées vs clone | **16/16 byte-identiques** (SHA-256) |
| Build local vs production | **46/46 identiques** (SHA-256) |
| Erreurs console | **0** |
| Requêtes HTTP ≥ 400 | **0** |
| Images cassées | **0** |
| Débordement horizontal (390/768/1440) | **0 px** |
| Interactions | clavier (flèches tournent le champ), bouton soleil (`--night: 0→1`), modale « The letter » (role=dialog, visible), lecteur audio (`currentTime = 1,01 s`), navigation — **toutes validées** |

Les captures d'écran de production sont dans `evidence/production/`.

---

## Déploiement

    photo.hypeer.cloud → Caddy (TLS, edge partagé nao_gamme_caddy)
                       → conteneur photographer (nginx:1.27-alpine)
                       → /opt/photographer/dist

`deploy/publish.sh` enchaîne : build → remplacement complet de `dist` sur le VPS
→ envoi → `docker compose up -d --force-recreate` → ajout idempotent du vhost
Caddy (sauvegarde horodatée) → validation et rechargement sans coupure → sondes
de production.

`deploy/nginx.conf` reproduit trois comportements de l'origine :

- `/route` sans slash final → **200**, sans redirection (`try_files` teste
  `$uri/index.html` avant `$uri`) ;
- toute URL inconnue → la vraie page « Not here » avec le **statut 404** ;
- polices servies avec le bon `Content-Type` (`nginx:alpine` ne mappe pas `.otf`).

---

## Structure

    capture/
      raw/pages/          46 pages, octets bruts de l'origine
      raw/assets/         145 assets à leur chemin d'URL d'origine
      manifest.json       SHA-256, tailles, provenance de chaque fichier
    content/              LA couche éditable (un JSON par page)
    tools/
      acquire.mjs         acquisition des pages
      collect-assets.mjs  collecte des assets (reprise sur 403)
      extract-content.mjs extraction du modèle de contenu
      apply-content.mjs   réinjection HTML + payload RSC
      build.mjs           construction de dist/
      serve.mjs           serveur de recette (routes, 404, _next/image)
      verify.mjs          harnais de fidélité
    evidence/             rapports et captures de vérification
    deploy/               nginx, docker compose, vhost Caddy, publication
    dist/                 le site publié

---

## Choix assumés

- **noindex, nofollow** : le clone ne concurrence pas l'original dans les moteurs.
  `robots.txt` répond `Disallow: /`. Pour indexer, retirez le bloc « noindex »
  de `tools/build.mjs` (section 3c) et le `robots.txt` de la même fonction.
- **Analytics désactivés** : aucun appel sortant vers un tiers.
- **Modale « Subscribe » inerte** : elle s'ouvre et se ferme comme à l'origine,
  mais n'envoie rien (aucun backend).
- **`/lab` inclus** malgré `robots.txt` de l'origine qui l'interdit : la consigne
  était de ne négliger aucune page.
- **Code minifié** : la scène WebGL, les shaders et les 30 sketches sont les
  bundles d'origine. Les textes et les images sont éditables ; la logique
  d'animation ne l'est pas.

## Droits

Les textes, illustrations et enregistrements audio appartiennent à leur auteur.
Vérifiez votre autorisation avant toute exploitation publique.
