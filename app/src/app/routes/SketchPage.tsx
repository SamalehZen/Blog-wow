import { Link, useParams } from 'react-router-dom';
import { sketches } from '@/content/lab';
import { Island } from '@/components/islands/Island';
import { NotFoundPage } from './NotFoundPage';

export function SketchPage() {
  const { slug = '' } = useParams();
  const sketch = sketches.find((s) => s.slug === slug);
  if (!sketch) return <NotFoundPage />;

  return (
    <div className="pt-24">
      <div className="mx-auto flex max-w-[70rem] items-baseline justify-between px-6 pb-4 md:px-10">
        <h1 className="font-display text-2xl text-[var(--ink)]">{sketch.titre}</h1>
        <Link to="/lab" className="text-xs uppercase tracking-[0.12em] text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← Lab
        </Link>
      </div>
      <div className="h-[calc(100dvh-7rem)] w-full">
        <Island name={'lab-' + sketch.slug} titre={'Esquisse : ' + sketch.titre} height="viewport" />
      </div>
    </div>
  );
}
