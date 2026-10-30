import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { BadgeCheck, CircleDollarSign } from 'lucide-react';

import { Logo } from '@/components/layout/logo';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';

/**
 * Frame for the sign-in and create-account pages.
 *
 * Interface refresh (2026-10): a photograph beside the form on wide screens,
 * the way Airbnb, Booking and andBeyond open their account pages, so signing
 * in still feels like part of the trip rather than a utility page. On phones
 * the photograph steps aside and the form is the whole screen.
 *
 * Purely presentational; the forms are passed in unchanged.
 */
export async function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [tFooter, tTrust] = await Promise.all([
    getTranslations('footer'),
    getTranslations('home.trust'),
  ]);

  const points = [
    { Icon: CircleDollarSign, text: tTrust('free') },
    { Icon: WhatsAppGlyph, text: tTrust('whatsapp') },
    { Icon: BadgeCheck, text: tTrust('verified') },
  ];

  return (
    <div className="container-page py-4 sm:py-12">
      <div className="grid overflow-hidden sm:rounded-3xl sm:border sm:bg-surface sm:shadow-[var(--elev-lg)] lg:min-h-[40rem] lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden lg:block">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            sizes="(min-width:1024px) 640px, 0px"
            quality={70}
            className="object-cover"
          />
          <div className="hero-scrim absolute inset-0" aria-hidden />
          <div className="relative flex h-full flex-col justify-end p-10 text-white">
            <span aria-hidden className="mb-5 block h-px w-12 bg-[var(--sun-400)]" />
            <p className="max-w-sm font-display text-4xl font-semibold leading-[1.1]">
              {tFooter('builtIn')}
            </p>
            <ul className="mt-8 space-y-3">
              {points.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-body-sm font-medium text-white/90">
                  <span className="flex size-8 items-center justify-center rounded-pill bg-white/15 backdrop-blur-sm">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex items-center justify-center py-8 sm:px-10 sm:py-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <Logo />
              <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
