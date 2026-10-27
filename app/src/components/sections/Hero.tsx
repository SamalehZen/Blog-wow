import { Link } from 'react-router-dom';

/**
 * Le héros de l'accueil.
 *
 * La structure est en React, la mise en page vient de site.css : les valeurs
 * (taille clamp, interlettrage -0.028em, variations de Fraunces) sont copiées
 * du CSS compilé de l'origine, pas approximées.
 */
export function Hero() {
  return (
    <section className="hero">
      <h1 className="hero__word">
        <span className="hero__row">
          <span>The </span>
          <em className="no">not </em>
          <span>Boring Blog</span>
          <em className="no">?</em>
        </span>
      </h1>

      <p className="hero__blurb">
        Boring stuff about art, engineering, AI, and the little things that rarely make noise.
      </p>

      <p className="hero__go">
        <Link
          to="/posts"
          className="inline-flex items-center gap-3 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-[var(--surface,#faf8f2)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Read the blog
          <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
