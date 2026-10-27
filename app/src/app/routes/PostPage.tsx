import { Link, useParams } from 'react-router-dom';
import { parSlug } from '@/content/posts';
import { Island } from '@/components/islands/Island';
import { NotFoundPage } from './NotFoundPage';

export function PostPage() {
  const { slug = '' } = useParams();
  const post = parSlug(slug);
  if (!post) return <NotFoundPage />;

  return (
    <article className="px-6 pb-24 pt-32 md:px-10">
      <div className="mx-auto max-w-[46rem]">
        <Link to="/posts" className="text-xs uppercase tracking-[0.12em] text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← Tous les articles
        </Link>

        <h1 className="mt-6 font-display text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-[var(--ink)]">
          {post.titre}
        </h1>

        <p className="mt-4 text-sm text-[var(--ink-2)]">
          <time dateTime={post.date}>{post.date}</time> · {post.minutes} min
        </p>

        <p className="mt-8 text-base leading-relaxed text-[var(--ink-2)]">{post.resume}</p>

        {post.image && (
          <figure className="mt-12">
            <img src={post.image} alt="" className="w-full rounded-lg" loading="lazy" />
          </figure>
        )}

        {post.audio && (
          <div className="mt-12 rounded-xl border border-black/10 p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.12em] text-[var(--ink-3)]">
              Ecouter la conversation
            </p>
            <audio controls preload="none" src={post.audio} className="w-full" />
          </div>
        )}

        {/* Les demonstrations integrees a l'article sont rendues par l'ilot d'origine. */}
        <section className="mt-16">
          <h2 className="mb-4 text-xs uppercase tracking-[0.12em] text-[var(--ink-3)]">
            La demonstration, en vrai
          </h2>
          <div className="overflow-hidden rounded-xl border border-black/10">
            <Island name={'post-' + post.slug} titre={'Demonstration : ' + post.titre} height="auto" />
          </div>
        </section>
      </div>
    </article>
  );
}
