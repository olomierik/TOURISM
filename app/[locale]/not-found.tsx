import { getTranslations } from 'next-intl/server';
import { Compass, Search } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * 404 — design.md §7.17.
 *
 * "keep the layout, plus a search input and 3 links (Destinations, Safaris,
 * Request a quote). Mark the decorative '404' aria-hidden."
 *
 * The search box is the change that matters. A 404 with one "Back to home"
 * button sends somebody who was looking for a specific operator back to the
 * start of the site, where they have to find it again from nothing. A search
 * field and three routes let them carry on from here, which is the only thing
 * this page can usefully do.
 *
 * The big "404" is `aria-hidden` because it is a decoration: the heading says
 * what happened in words, and a screen reader announcing "four hundred and
 * four" before it is noise (§10, 1.1.1).
 *
 * `/search` is a real page and this is a plain GET form, so the field works
 * without JavaScript — which matters on an error page more than anywhere else,
 * since one reason to land here is that something did not load.
 */
export default async function NotFound() {
  const [t, tNav, tSearch] = await Promise.all([
    getTranslations('common'),
    getTranslations('nav'),
    getTranslations('search'),
  ]);

  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-lg bg-surface-sunken">
        <Compass className="size-7 text-muted-foreground" aria-hidden />
      </span>

      <p aria-hidden className="mt-6 font-display text-display-lg text-muted-foreground/40">
        404
      </p>

      <h1 className="mt-2 font-display text-heading-xl">{t('notFound')}</h1>
      <p className="mt-3 max-w-md text-body text-muted-foreground">{t('notFoundHelp')}</p>

      <form action="/search" method="get" className="mt-7 flex w-full max-w-md gap-2">
        <label htmlFor="nf-q" className="sr-only">
          {tSearch('label')}
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="nf-q"
            name="q"
            type="search"
            placeholder={tSearch('placeholder')}
            className="h-12 w-full rounded-sm border-control bg-surface pl-9 pr-3 text-base outline-none focus-visible:border-primary"
          />
        </div>
        <Button type="submit" size="lg">
          {tSearch('submit')}
        </Button>
      </form>

      <nav aria-label={tNav('directory')} className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/destinations">{tNav('destinations')}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={{ pathname: '/directory', query: { category: 'safaris' } }}>
            {tNav('safaris')}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/request-quote">{tNav('getFreeQuotes')}</Link>
        </Button>
      </nav>
    </div>
  );
}
