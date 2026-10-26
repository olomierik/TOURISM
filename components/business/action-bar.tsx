import { getTranslations } from 'next-intl/server';
import { Phone } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { TrackedLink } from '@/components/analytics/tracked';

/**
 * Sticky action bar — design.md §6.11.
 *
 *   [Call IconButton] [WhatsApp IconButton] [Request a quote — primary lg flex-1]
 *
 * "64 px plus safe area, --surface, top border. Hide Call and WhatsApp if the
 * business has no number."
 *
 * **Mobile only now.** It used to render twice: a five-button row in the flow
 * under the hero on every screen size, and a two-button bar pinned to the
 * bottom on phones. §7.3 puts the desktop actions in the sticky contact card
 * instead, where they sit beside the day rate and the licence number that
 * make them worth pressing — a full-width row of five outline buttons under
 * the hero gave Call, Directions and Website the same weight as the one action
 * this page exists for.
 *
 * Three controls, not five. Directions and Website moved into the Location
 * section and the contact card respectively, which is where somebody looking
 * for them goes. On a 375px screen five buttons are five targets too small to
 * hit, and §6.11 names the three that matter.
 *
 * The quote button keeps the width because it is the §7.0 primary action for
 * this template; Call and WhatsApp are 44px icon buttons beside it.
 */
export async function BusinessActionBar({
  locale,
  slug,
  name,
  phone,
  whatsappUrl,
}: {
  locale: Locale;
  slug: string;
  name: string;
  phone: string | null;
  /** Already built with the enquiry message, so this component makes no links. */
  whatsappUrl: string | null;
}) {
  const t = await getTranslations({ locale, namespace: 'business' });

  return (
    <div
      // data-mobile-action-bar is read by the bottom nav, which hides itself
      // when this is present (§6.6) — two bars stacked at the foot of a phone
      // screen is 128px of chrome over the content.
      data-mobile-action-bar
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t bg-surface px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="flex items-center gap-2">
        {phone && (
          <IconButton asChild variant="secondary" label={t('call')}>
            <TrackedLink href={`tel:${phone}`} event="phone_clicked" props={{ slug }}>
              <Phone aria-hidden />
            </TrackedLink>
          </IconButton>
        )}

        {whatsappUrl && (
          <IconButton asChild variant="whatsapp" label={`${t('whatsapp')} — ${name}`}>
            <a href={whatsappUrl} target="_blank" rel="nofollow noopener noreferrer">
              <WhatsAppGlyph />
            </a>
          </IconButton>
        )}

        <Button asChild size="lg" className="flex-1">
          <Link href={{ pathname: '/request-quote', query: { business: slug } }}>
            {t('requestQuote')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
