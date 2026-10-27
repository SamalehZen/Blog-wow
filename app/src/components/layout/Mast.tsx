import { Link, useLocation } from 'react-router-dom';

/** Entete du site : marque, navigation, abonnement. Repris du mast d'origine. */
export function Mast() {
  const { pathname } = useLocation();

  const lien = (to: string, label: string) => {
    const actif = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={
          'rounded-full px-3 py-2 text-xs tracking-tight transition-colors duration-150 ' +
          (actif ? 'bg-black/5 text-[var(--ink)]' : 'text-[var(--ink-2)] hover:bg-black/5')
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-24 items-start justify-between px-6 pt-6 md:px-10">
      <Link to="/" className="group flex items-center gap-3" aria-label="Accueil">
        <span className="mark block h-7 w-7 text-[var(--ink)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-7 w-7" aria-hidden="true">
            <path d="M12 22V9.4" />
            <path d="M12 22c0-5.4.9-9.4 2.6-12.1" />
            <path d="M12 22c0-4.6-1.1-8-3.2-10.4" />
            <path d="M12 22c1.3-3.6 3.6-6.2 6.9-7.8" />
            <path d="M12 22c-1.5-3.1-3.9-5.2-7-6.4" />
          </svg>
        </span>
        <span className="hidden text-[0.7rem] uppercase tracking-[0.14em] text-[var(--ink-3)] sm:inline">
          You are here.
        </span>
      </Link>

      <nav className="flex items-center gap-1" aria-label="Navigation principale">
        {lien('/', 'Accueil')}
        {lien('/posts', 'Articles')}
        {lien('/lab', 'Lab')}
      </nav>
    </header>
  );
}
