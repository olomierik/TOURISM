/**
 * The people who write for the site (SEO brief T9/T10).
 *
 * Google asks for articles by a real, named person with a page of their own,
 * and the brief rules out invented personas. So this list holds only people
 * who exist and have agreed to be named. Add a writer here, with their own
 * words for the bio, before attributing anything to them.
 *
 * The bio below is deliberately plain: who runs the site, nothing more. The
 * owner should replace it with their own.
 */
export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  /** Pages that are about this person elsewhere, for schema.org sameAs. */
  sameAs?: string[];
};

export const AUTHORS: Author[] = [
  {
    slug: 'erick-olomi',
    name: 'Erick Olomi',
    role: 'Founder, ExploreTanzania.online',
    bio: 'Erick runs ExploreTanzania.online, a directory of East African tour operators, lodges and guides. He edits the guides and checks the figures in them against what operators publish on the site.',
  },
];

/** Who signs articles that do not name an author. */
export const DEFAULT_AUTHOR = AUTHORS[0];

export function authorBySlug(slug: string | null | undefined): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}
