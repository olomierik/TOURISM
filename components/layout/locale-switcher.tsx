'use client';

import { useParams } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeMeta, type Locale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      // `pathname` here is the *internal* route (e.g. '/destinations/[slug]'), so
      // passing params back lets next-intl rebuild the localized URL for the target
      // locale — /reiseziele/serengeti rather than dumping the user on the homepage.
      router.replace(
        // @ts-expect-error -- params shape is route-dependent and only known at runtime
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5"
          aria-label={t('selectLanguage')}
          disabled={isPending}
        >
          <Globe className="size-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {locale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => switchTo(l)}
            className="justify-between gap-3"
          >
            <span>{localeMeta[l].native}</span>
            {l === locale && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
