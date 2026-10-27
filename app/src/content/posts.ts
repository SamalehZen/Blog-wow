import type { Post } from './types';

// Le contenu vient du clone : capture/raw/pages contient les pages d'origine.
// Ces fiches sont la vue applicative ; la source reste le JSON de content/.
export const posts: Post[] = [
  {
    slug: 'eskiz-number-input',
    titre: 'Building Eskiz, chapter one: the number input',
    resume: 'The most important box in the room: what a number input actually owes the person using it.',
    date: '2026-10-13',
    minutes: 14,
    image: '/posts/eskiz-number-input/01-small-box.png',
    audio: '/posts/eskiz-number-input/audio/discussion-v1-signoff-v1.mp3',
    sections: [],
  },
  {
    slug: 'agent-replay',
    titre: 'Agent Replay: a calmer way to review code',
    resume: 'The review starts with a wall of changes. It does not have to.',
    date: '2026-10-09',
    minutes: 11,
    image: '/posts/agent-replay/01-review-focus.jpg',
    audio: '/posts/agent-replay/audio/discussion-v1-signoff-v1.mp3',
    sections: [],
  },
  {
    slug: 'it-was-supposed-to-be-a-small-change',
    titre: 'Why is 3D modeling still so complicated?',
    resume: 'There is more to designing than making the first shape.',
    date: '2026-10-06',
    minutes: 18,
    image: '/posts/it-was-supposed-to-be-a-small-change/02-beautiful-delivery.png',
    audio: '/posts/it-was-supposed-to-be-a-small-change/audio/discussion-v1-signoff-v1.mp3',
    sections: [],
  },
  {
    slug: 'making-stylized-grass',
    titre: 'Making stylized grass',
    resume: 'Art direction first, then the engineering that keeps a painted meadow responsive.',
    date: '2026-10-02',
    minutes: 12,
    image: '/posts/making-stylized-grass/growth.png',
    audio: '/posts/making-stylized-grass/audio/discussion-v1-signoff-v1.mp3',
    sections: [],
  },
  {
    slug: 'gtm-engineering-explained-badly',
    titre: 'GTM engineering, explained badly',
    resume: 'I changed jobs. Sort of.',
    date: '2026-09-29',
    minutes: 9,
    image: '/posts/gtm-engineering-explained-badly/machine.png',
    audio: '/posts/gtm-engineering-explained-badly/audio/discussion-v1-signoff-v1.mp3',
    sections: [],
  },
  {
    slug: 'the-boring-state-of-artificial-intelligence',
    titre: 'The boring state of artificial intelligence',
    resume: 'A bet at work, and everything that followed.',
    date: '2023-04-17',
    minutes: 32,
    image: '/posts/the-boring-state-of-artificial-intelligence/02.png',
    audio: '/posts/the-boring-state-of-artificial-intelligence/audio/discussion-v4-signoff-v1.mp3',
    sections: [],
  },
];

export const parSlug = (slug: string) => posts.find((p) => p.slug === slug);
