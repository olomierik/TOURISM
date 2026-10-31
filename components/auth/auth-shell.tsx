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
    <div className="container-page py-4 sm:py-8">
      <div className="grid overflow-hidden sm:rounded-3xl sm:border sm:bg-surface sm:shadow-[var(--elev-lg)] lg:min-h-[30rem] lg:max-w-4xl lg:mx-auto lg:grid-cols-[1fr_1fr]">
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
          <div className="relative flex h-full flex-col justify-end p-8 text-white">
            <span aria-hidden className="mb-4 block h-px w-12 bg-[var(--sun-400)]" />
            <p className="max-w-xs font-display text-[1.75rem] font-semibold leading-[1.1]">
              {tFooter('builtIn')}
            </p>
            <ul className="mt-5 space-y-2">
              {points.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-body-sm font-medium text-white/90">
                  <span className="flex size-7 items-center justify-center rounded-pill bg-white/15 backdrop-blur-sm">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex items-center justify-center py-4 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-5">
              {/* The header already shows the logo on phones. */}
              <div className="max-lg:hidden">
                <Logo />
              </div>
              <h1 className="lg:mt-5 font-display text-[1.75rem] font-semibold leading-tight tracking-tight">{title}</h1>
              <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
