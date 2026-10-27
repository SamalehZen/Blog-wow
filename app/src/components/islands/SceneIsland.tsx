import { Island } from './Island';

/**
 * La scene du champ a l'accueil : ciel, lumiere, herbe, molette.
 * Rendue par le bundle d'origine dans une iframe plein ecran, derriere
 * la couche de texte de l'application.
 */
export function SceneIsland() {
  return (
    <div className="pointer-events-auto absolute inset-0 -z-10">
      <Island name="scene" titre="Le champ que l'on peut tourner" height="viewport" />
    </div>
  );
}
