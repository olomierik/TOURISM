import 'server-only';

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cache } from 'react';

import { allowIndexing } from '@/lib/seo';
import { authorBySlug, DEFAULT_AUTHOR, type Author } from '@/lib/content/authors';

/**
 * The blog (SEO brief T10): Markdown files in content/blog, one per post.
 *
 * Plain Markdown rather than MDX: posts are prose with tables and links, and
 * react-markdown with GFM is already in the app. Front-matter is a small,
 * strict subset of YAML (see parseFrontMatter) so a typo fails the build
 * instead of shipping a post with a missing title.
 *
 * Drafts (`published: false`) render only where indexing is off — local dev
 * and Netlify deploy previews — so the owner can read them in place before
 * anything is public. In production a draft is a 404 and is in no list, feed
 * or sitemap.
 */

export const BLOG_CATEGORIES = [
  { slug: 'safari-planning', name: 'Safari planning' },
  { slug: 'costs', name: 'Costs and budgets' },
  { slug: 'food-and-drink', name: 'Food and drink' },
  { slug: 'getting-around', name: 'Getting around' },
  { slug: 'parks', name: 'Parks compared' },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  author: Author;
  category: BlogCategory;
  tags: string[];
  hero: { src: string; alt: string } | null;
  relatedDestinations: string[];
  relatedPackages: string[];
  locale: string;
  reviewed: boolean;
  published: boolean;
  body: string;
  readingMinutes: number;
};

const DIR = path.join(process.cwd(), 'content', 'blog');

type Scalar = string | number | boolean | string[];

/**
 * `key: value` lines between `---` fences. Values: quoted or bare strings,
 * true/false, numbers, and [a, b, c] lists. Nothing nested.
 */
export function parseFrontMatter(source: string, file: string): { data: Record<string, Scalar>; body: string } {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front-matter`);
  const data: Record<string, Scalar> = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const kv = line.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: cannot read front-matter line "${line}"`);
    const [, key, value] = kv;
    const unquote = (v: string) => v.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    if (/^\[.*\]$/.test(value)) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map(unquote)
        .filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, body: m[2] };
}

function req(data: Record<string, Scalar>, key: string, file: string): string {
  const v = data[key];
  if (typeof v !== 'string' || !v) throw new Error(`${file}: front-matter "${key}" is required`);
  return v;
}

const list = (v: Scalar | undefined) => (Array.isArray(v) ? v : []);

const loadAll = cache((): Post[] => {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  return files
    .map((file) => {
      const { data, body } = parseFrontMatter(readFileSync(path.join(DIR, file), 'utf8'), file);
      const slug = file.replace(/\.md$/, '');
      const categorySlug = req(data, 'category', file);
      const category = BLOG_CATEGORIES.find((c) => c.slug === categorySlug);
      if (!category) throw new Error(`${file}: unknown category "${categorySlug}"`);
      const author = data.author ? authorBySlug(String(data.author)) : DEFAULT_AUTHOR;
      if (!author) throw new Error(`${file}: unknown author "${data.author}" (lib/content/authors.ts)`);
      const date = req(data, 'date', file);
      const heroSrc = typeof data.hero === 'string' ? data.hero : null;
      const words = body.split(/\s+/).filter(Boolean).length;
      return {
        slug,
        title: req(data, 'title', file),
        description: req(data, 'description', file),
        date,
        updated: typeof data.updated === 'string' ? data.updated : date,
        author,
        category,
        tags: list(data.tags),
        hero: heroSrc ? { src: heroSrc, alt: req(data, 'heroAlt', file) } : null,
        relatedDestinations: list(data.relatedDestinations),
        relatedPackages: list(data.relatedPackages),
        locale: typeof data.locale === 'string' ? data.locale : 'en',
        reviewed: data.reviewed === true,
        published: data.published === true,
        body,
        readingMinutes: Math.max(1, Math.round(words / 220)),
      } satisfies Post;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
});

/** Drafts are visible where indexing is off (dev, previews), never in production. */
export const draftsVisible = !allowIndexing;

export function getPosts(): Post[] {
  return loadAll().filter((p) => p.published || draftsVisible);
}

/** Published posts only: feeds and sitemaps never carry a draft. */
export function getPublishedPosts(): Post[] {
  return loadAll().filter((p) => p.published);
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

/** Headings for the table of contents: every ## in the body. */
export function tableOfContents(body: string): Array<{ id: string; text: string }> {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`]/g, '').trim();
    return { id: headingId(text), text };
  });
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
