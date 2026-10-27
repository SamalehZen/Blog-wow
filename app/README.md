# Blog Wow — application (Vite + React + Tailwind)

Réécriture structurée du site `www.theboringblog.ai`, en **Vite + React 19 + Tailwind v4**,
avec les parties interactives montées en **îlots** : la scène WebGL et les 30 sketches
`/lab` sont chargés tels quels dans une iframe de même origine.

C'est le « plan B » : du code applicatif lisible pour tout ce qui se structure
(pages, navigation, typographie, contenu), et la fidélité à l'octet pour ce qui
ne se réécrit pas sans perte (scènes et démos).

---

## Démarrage

```bash
npm install --include=dev     # l'environnement est en NODE_ENV=production
npm run assets                # copie les assets depuis ../photographer/dist
npm run islands               # construit les 37 ilots
npm run dev                   # http://127.0.0.1:4190
npm run build && npm run preview
```

## Structure

```
src/
  app/
    App.tsx                 routes
    routes/
      HomePage.tsx          accueil : scene (ilot) + heros (React)
      PostsPage.tsx         index des articles
      PostPage.tsx          article + demonstration (ilot)
      LabPage.tsx           index des 30 sketches
      SketchPage.tsx        une esquisse (ilot)
      NotFoundPage.tsx      404
  components/
    layout/
      SiteLayout.tsx        coquille commune
      Mast.tsx              entete et navigation
    sections/
      Hero.tsx              heros, structure React + CSS d'origine
    islands/
      Island.tsx            iframe de meme origine, hauteur automatique
      SceneIsland.tsx       la scene du champ
  content/
    posts.ts                les 6 articles (fiches)
    lab.ts                  les 30 sketches
    types.ts
  styles/
    globals.css             Tailwind + theme
    tokens.css              309 jetons extraits du CSS d'origine
    site.css                regles copiees telles quelles (racine, heros)
  lib/
scripts/
  extract-tokens.mjs        CSS d'origine -> tokens.css
  build-islands.mjs         pages d'origine -> public/islands/
  build-analytics-stubs.mjs scripts d'analytics neutres
  copy-assets.mjs           assets depuis le clone
public/
  islands/                  37 ilots (generes, non commites)
  _next/ sky/ art/ posts/   assets partages (copies, non commites)
```

## Comment fonctionne un îlot

`scripts/build-islands.mjs` copie la page d'origine et y injecte une feuille qui
masque son propre chrome (entête, héros, pied) et neutralise le défilement. Le
résultat est chargé dans une iframe servie depuis la même origine : les URL
absolues `/_next/…`, `/sky/…`, `/art/…` se résolvent donc sur `public/`.

`<Island />` mesure la hauteur réelle du document enfant et la remonte à la page
hôte quand `height="auto"`.

Conséquence : **fidélité 100 %** sur la scène et les sketches, puisque ce sont
les octets d'origine. En contrepartie, ce code-là n'est pas modifiable.

## Fidélité mesurée

Comparaison du héros de l'accueil avec le clone déployé (`photo.hypeer.cloud`),
à 1440 × 900 :

| Propriété | Clone | Application |
|---|---|---|
| Police | Fraunces | **Fraunces** |
| Corps | 84,8 px | **84,8 px** |
| Graisse | 400 | **400** |
| Interligne | 84,8 px | **84,8 px** |
| Interlettrage | −2,3744 px | **−2,3744 px** |

**5 propriétés sur 5 identiques.** Ces valeurs ne sont pas approximées : elles
sont copiées du CSS compilé dans `src/styles/site.css`.

État des pages : 0 erreur console, 0 requête en échec, 0 débordement horizontal.

## Ajouter une page

1. Créer `src/app/routes/MaPage.tsx`.
2. L'enregistrer dans `src/app/App.tsx`.
3. Écrire la mise en page en Tailwind, en réutilisant les jetons
   (`text-[var(--ink-2)]`, `font-display`, `--gutter`).

Si la page a besoin d'un bloc interactif d'origine, ajouter son îlot dans
`scripts/build-islands.mjs` puis l'utiliser avec `<Island name="…" />`.

## Ce qui n'est pas réécrit, et pourquoi

Les bundles minifiés (2,4 Mo de JS, dont 828 Ko de Three.js et 22 shaders GLSL)
pilotent des scènes temps réel. Les réécrire donnerait 80-90 % de fidélité sur la
scène d'accueil et 70-85 % sur les sketches WebGL, pour un coût de plusieurs
semaines. Les shaders, eux, sont récupérables en clair (91 blocs, 215 Ko) si
vous voulez un jour en reprendre le contrôle.
