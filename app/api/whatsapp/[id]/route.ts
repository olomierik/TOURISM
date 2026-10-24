import { getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { BOT_UA, clientIp, visitorHash } from '@/lib/analytics/visitor';
import { WHATSAPP_SOURCES, whatsappNumberFor, type WhatsAppSource } from '@/lib/contact/whatsapp';
import { whatsappLink } from '@/lib/format';
import { getPathname } from '@/i18n/navigation';
import { defaultLocale, locales, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';

/**
 * "Chat on WhatsApp", counted.
 *
 * Every WhatsApp button on the site links here rather than straight to wa.me.
 * The route records the chat as a contact for the operator (contact_clicks,
 * migration 069), then sends the traveller on to WhatsApp with a message
 * already written. A redirect rather than a script: it counts with JavaScript
 * off, and the number is looked up here, so a link cannot be pointed at
 * anyone else's.
 *
 * Bots are sent on without being counted, and the same visitor counts once a
 * day per operator, so a link preview or a second tap is not a second chat.
 * Never fails the traveller: a listing without a number, or a write that does
 * not land, still ends on a useful page.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE = /^ET-\d{4}-\d{6}$/;
const SLUG = /^[a-z0-9-]{1,120}$/;

function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  const locale: Locale = (locales as readonly string[]).includes(lang ?? '') ? (lang as Locale) : defaultLocale;
  const fromParam = url.searchParams.get('from');
  const from: WhatsAppSource = (WHATSAPP_SOURCES as readonly string[]).includes(fromParam ?? '')
    ? (fromParam as WhatsAppSource)
    : 'profile';
  const home = `${siteUrl}${getPathname({ href: '/', locale })}`;

  if (!UUID.test(id)) return redirect(home);

  const admin = createAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('id, slug, name, whatsapp, phone, country_code, is_demo')
    .eq('id', id)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();
  if (!business) return redirect(home);

  const listing = `${siteUrl}${getPathname({ href: { pathname: '/business/[slug]', params: { slug: business.slug } }, locale })}`;
  const number = business.is_demo
    ? null
    : whatsappNumberFor({ whatsapp: business.whatsapp, phone: business.phone, countryCode: business.country_code });
  if (!number) return redirect(listing);

  // The message. An enquiry reference is only quoted when this operator really
  // received that enquiry; a package title only when the package is theirs.
  const t = await getTranslations({ locale, namespace: 'whatsappChat' });
  const tBusiness = await getTranslations({ locale, namespace: 'business' });
  let message = tBusiness('whatsappMessage');
  let leadId: string | null = null;

  const ref = url.searchParams.get('ref');
  if (ref && REFERENCE.test(ref)) {
    const { data: lead } = await admin
      .from('leads')
      .select('id, lead_businesses!inner (business_id)')
      .eq('reference', ref)
      .eq('lead_businesses.business_id', business.id)
      .maybeSingle();
    if (lead) {
      leadId = lead.id;
      message = t('enquiryMessage', { reference: ref });
    }
  }

  const pkg = url.searchParams.get('package');
  if (!leadId && pkg && SLUG.test(pkg)) {
    const { data: found } = await admin
      .from('packages')
      .select('package_translations (locale, title)')
      .eq('slug', pkg)
      .eq('business_id', business.id)
      .is('deleted_at', null)
      .maybeSingle();
    const titles = found?.package_translations ?? [];
    const title = (titles.find((x) => x.locale === locale) ?? titles.find((x) => x.locale === 'en') ?? titles[0])?.title;
    if (title) message = `${message} (${title})`;
  }

  const target = whatsappLink(number, message);
  if (!target) return redirect(listing);

  const userAgent = request.headers.get('user-agent') ?? '';
  if (userAgent && !BOT_UA.test(userAgent)) {
    const visitor = visitorHash(clientIp(request), userAgent);
    try {
      const { error } = await admin.from('contact_clicks').insert({
        business_id: business.id,
        channel: 'whatsapp',
        source: from,
        lead_id: leadId,
        visitor_hash: visitor,
      });
      // 23505: this visitor already chatted with this operator today.
      if (!error) {
        await admin.from('analytics_events').insert({
          event: 'whatsapp_clicked',
          path: `/business/${business.slug}`,
          locale,
          visitor_hash: visitor,
          props: { slug: business.slug, from },
        });
      } else if (error.code !== '23505') {
        console.error('[whatsapp] could not record', business.slug, error.message);
      }
    } catch (err) {
      console.error('[whatsapp] could not record', business.slug, err);
    }
  }

  return redirect(target);
}
