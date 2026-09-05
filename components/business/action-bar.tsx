import { getTranslations } from 'next-intl/server';
import { MapPin, MessageCircle, Phone, Globe, Sparkles } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/tracked';

/**
 * Call, WhatsApp, Directions, Website, Request a quote.
 *
 * These were in a sidebar card two thirds down the page. On a phone that is
 * below three screens of description, which is where a business listing loses
 * the person who already decided to make contact — they came to call, and the
 * button to call was somewhere they had to look for.
 *
 * So the bar sits directly under the hero, and sticks to the bottom of the
 * viewport on small screens. Sticky is the right call specifically here: this
 * is the one page on the site where the action is the reason for the visit,
 * and a traveller reading reviews is a traveller who may want to ring somebody
 * at any point in the scroll.
 *
 * Every button is conditional on data existing. A greyed-out "Call" on a
 * listing with no phone number is worse than no button — it reads as the site
 * withholding something rather than as the operator never having supplied it.
 */
export async function BusinessActionBar({
  locale,
  slug,
  name,
  phone,
  whatsappUrl,
  website,
  mapQuery,
}: {
  locale: Locale;
  slug: string;
  name: string;
  phone: string | null;
  /** Already built with the enquiry message, so this component makes no links. */
  whatsappUrl: string | null;
  website: string | null;
  /** Address or coordinates for a maps search. Null when neither is known. */
  mapQuery: string | null;
}) {
  const t = await getTranslations({ locale, namespace: 'business' });

  const hasAny = phone || whatsappUrl || website || mapQuery;

  return (
    <>
      {/* Desktop and tablet: in the flow, immediately under the hero. */}
      <div className="border-b bg-card">
        <div className="container-page flex flex-wrap items-center gap-2 py-4">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href={{ pathname: '/request-quote', query: { business: slug } }}>
              <Sparkles className="size-4" aria-hidden />
              {t('requestQuote')}
            </Link>
          </Button>

          {phone && (
            <Button asChild variant="outline">
              <TrackedLink href={`tel:${phone}`} event="phone_clicked" props={{ slug }}>
                <Phone className="size-4" aria-hidden />
                {t('call')}
              </TrackedLink>
            </Button>
          )}

          {whatsappUrl && (
            <Button asChild variant="outline">
              <TrackedLink
                href={whatsappUrl}
                event="whatsapp_clicked"
                props={{ slug }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </TrackedLink>
            </Button>
          )}

          {mapQuery && (
            <Button asChild variant="outline">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="size-4" aria-hidden />
                {t('directions')}
              </a>
            </Button>
          )}

          {website && (
            <Button asChild variant="outline">
              <a href={website} target="_blank" rel="noopener noreferrer nofollow">
                <Globe className="size-4" aria-hidden />
                {t('website')}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Phones: pinned to the bottom, because the decision to call can happen
          at any point in a long scroll and the button should not have to be
          hunted for. Only the two actions that matter — a five-button bar on a
          375px screen is five things too small to hit. */}
      {hasAny && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur md:hidden">
          <div className="flex gap-2">
            {phone ? (
              <Button asChild className="flex-1" variant="outline">
                <TrackedLink href={`tel:${phone}`} event="phone_clicked" props={{ slug }}>
                  <Phone className="size-4" aria-hidden />
                  {t('call')}
                </TrackedLink>
              </Button>
            ) : null}

            {whatsappUrl ? (
              <Button asChild className="flex-1" variant="outline">
                <TrackedLink
                  href={whatsappUrl}
                  event="whatsapp_clicked"
                  props={{ slug }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </TrackedLink>
              </Button>
            ) : null}

            <Button
              asChild
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href={{ pathname: '/request-quote', query: { business: slug } }}>
                {t('quoteShort', { name: name.split(' ')[0] })}
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* The bar covers the last of the page on mobile, so the page gets its
          height back. Without this the footer's final line is unreachable. */}
      {hasAny && <div className="h-20 md:hidden" aria-hidden />}
    </>
  );
}
