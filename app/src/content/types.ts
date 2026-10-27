export type Chaine = {
  en: string;
  fr: string | null;
  remplacer: boolean;
};

export type DocumentContenu = {
  route: string;
  title: { en: string; fr: string | null; remplacer: boolean };
  description: { en: string; fr: string | null; remplacer: boolean };
  chaines: Chaine[];
};

export type Post = {
  slug: string;
  titre: string;
  resume: string;
  date: string;
  minutes: number;
  image: string | null;
  audio: string | null;
  sections: { id: string; titre: string }[];
};
