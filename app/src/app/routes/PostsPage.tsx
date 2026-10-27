import { Link } from 'react-router-dom';
import { posts } from '@/content/posts';

export function PostsPage() {
  return (
    <div className="px-6 pb-24 pt-32 md:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight text-[var(--ink)]">
        Posts
      </h1>
      <p className="mt-3 max-w-[30rem] text-sm text-[var(--ink-2)]">
        Boring stuff about art, engineering, AI, and the little things that rarely make noise.
      </p>

      <ul className="mt-14 divide-y divide-black/10">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to={'/posts/' + post.slug}
              className="group grid gap-4 py-8 md:grid-cols-[8rem_1fr] md:gap-8"
            >
              <time className="text-xs uppercase tracking-[0.12em] text-[var(--ink-3)]" dateTime={post.date}>
                {post.date}
              </time>
              <div>
                <h2 className="text-lg leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--accent,var(--ink))]">
                  {post.titre}
                </h2>
                <p className="mt-2 max-w-[38rem] text-sm leading-relaxed text-[var(--ink-2)]">
                  {post.resume}
                </p>
                <span className="mt-3 inline-block text-xs text-[var(--ink-3)]">
                  {post.minutes} min de lecture
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
