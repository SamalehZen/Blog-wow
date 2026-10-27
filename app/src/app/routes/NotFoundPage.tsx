import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 md:px-10">
      <h1 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-tight text-[var(--ink)]">
        Nothing grows here.
      </h1>
      <p className="mt-4 max-w-[26rem] text-sm text-[var(--ink-2)]">
        Cette page n'existe pas, ou plus. Le champ, lui, est toujours la.
      </p>
      <p className="mt-8">
        <Link to="/" className="text-sm underline underline-offset-4 hover:no-underline">
          Revenir a l'accueil
        </Link>
      </p>
    </div>
  );
}
