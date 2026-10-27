import { Link } from 'react-router-dom';
import { sketches } from '@/content/lab';

export function LabPage() {
  return (
    <div className="px-6 pb-24 pt-32 md:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight text-[var(--ink)]">
        Thirty sketches, none of them the home page
      </h1>
      <p className="mt-3 max-w-[34rem] text-sm text-[var(--ink-2)]">
        Chaque esquisse partage le vocabulaire de la prairie et n'en garde qu'une idee.
      </p>

      <ul className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {sketches.map((s, i) => (
          <li key={s.slug}>
            <Link to={'/lab/' + s.slug} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black/5">
                <span className="absolute left-3 top-3 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-3)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h2 className="mt-3 text-sm text-[var(--ink)] group-hover:underline">{s.titre}</h2>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
