import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { headingId } from '@/lib/blog/posts';
import type { Author } from '@/lib/content/authors';

/**
 * The pieces of a blog post page (SEO brief T10). Server components; nothing
 * here needs the browser.
 */

/**
 * The article. `## Headings` get ids for the table of contents. On a draft
 * preview, `<!-- VERIFY: … -->` notes are turned into visible highlights so
 * the person reviewing sees every figure that needs checking; in production
 * they are stripped (react-markdown drops raw HTML, comments included).
 */
export function PostBody({ body, showNotes }: { body: string; showNotes: boolean }) {
  const source = showNotes
    ? body.replace(/<!--\s*(VERIFY[\s\S]*?)-->/g, (_, note: string) => ` \`⚠ ${note.trim()}\` `)
    : body;

  return (
    <div
      className="mt-10 space-y-6 leading-relaxed
        [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-semibold
        [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold
        [&_p]:text-lg [&_p]:text-muted-foreground
        [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-muted-foreground
        [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-muted-foreground
        [&_li]:text-lg [&_strong]:text-foreground
        [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline
        [&_code]:rounded [&_code]:bg-[var(--warning-50)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-[var(--warning-800)]"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const text = String(Array.isArray(children) ? children.join('') : children ?? '');
            return <h2 id={headingId(text)}>{children}</h2>;
          },
          table: ({ children }) => (
            <div className="not-prose overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[32rem] text-left text-body-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_td]:tabular-nums">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

export function AuthorBox({ author, label }: { author: Author; label: string }) {
  return (
    <aside className="mt-12 flex gap-4 rounded-lg border bg-surface p-5">
      <div
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-semibold"
      >
        {author.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className="text-caption uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold">
          <Link href={{ pathname: '/authors/[slug]', params: { slug: author.slug } }} className="hover:text-primary">
            {author.name}
          </Link>
          <span className="font-normal text-muted-foreground"> · {author.role}</span>
        </p>
        <p className="mt-2 text-body-sm text-muted-foreground">{author.bio}</p>
      </div>
    </aside>
  );
}

/** Plain share links: no third-party scripts, nothing tracked. */
export function ShareLinks({ url, title, label }: { url: string; title: string; label: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'Email', href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2">
      <span className="me-1 text-body-sm font-semibold">{label}</span>
      {links.map(({ name, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-pill border bg-surface px-3 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {name}
        </a>
      ))}
    </div>
  );
}

/** "Get free quotes", aimed at the post's own destination. */
export function QuoteBox({
  heading,
  body,
  cta,
  destination,
}: {
  heading: string;
  body: string;
  cta: string;
  destination?: string;
}) {
  return (
    <aside className="mt-12 rounded-xl border bg-hero-wash p-6">
      <p className="font-display text-xl font-semibold">{heading}</p>
      <p className="mt-2 text-body text-muted-foreground">{body}</p>
      <Link
        href={{ pathname: '/request-quote', query: destination ? { destination } : {} }}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-pill bg-primary px-5 text-body-sm font-semibold text-primary-foreground"
      >
        {cta}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </aside>
  );
}
