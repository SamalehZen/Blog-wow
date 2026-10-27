import { useEffect, useRef, useState } from 'react';

type IslandProps = {
  /** nom de l'ilot, sans extension : public/islands/<name>.html */
  name: string;
  /** classes du conteneur */
  className?: string;
  /** hauteur : 'viewport' remplit l'ecran, 'auto' suit le contenu */
  height?: 'viewport' | 'auto';
  titre: string;
};

/**
 * Monte une page d'origine dans une iframe de meme origine.
 *
 * Pourquoi : les scenes WebGL et les 30 sketches /lab sont des bundles minifies
 * lies au runtime Next. Les charger tels quels dans leur propre document garantit
 * un rendu identique a l'octet, sans reecriture ni perte de comportement.
 *
 * L'iframe etant de meme origine, le parent peut lui parler ; on s'en sert pour
 * remonter la hauteur reelle du contenu a la page hote.
 */
export function Island({ name, className = '', height = 'viewport', titre }: IslandProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [hauteur, setHauteur] = useState<number | null>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame || height !== 'auto') return;

    const mesure = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight ?? 0,
        );
        if (h > 0) setHauteur(h);
      } catch {
        /* origine differente : on garde la hauteur par defaut */
      }
    };

    frame.addEventListener('load', mesure);
    const timer = window.setInterval(mesure, 1200);
    return () => {
      frame.removeEventListener('load', mesure);
      window.clearInterval(timer);
    };
  }, [height, name]);

  return (
    <iframe
      ref={ref}
      src={'/islands/' + name + '.html'}
      title={titre}
      loading="lazy"
      className={
        'block w-full border-0 bg-transparent ' +
        (height === 'viewport' ? 'h-dvh' : '') +
        ' ' +
        className
      }
      style={height === 'auto' && hauteur ? { height: hauteur + 'px' } : undefined}
    />
  );
}
