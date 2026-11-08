import { getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { BOT_UA, clientIp, sameOriginReferrer, visitorHash } from '@/lib/analytics/visitor';
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
 * A chat is counted only when the same daily visitor hash also has a
 * `page_views` row and the Referer, if the browser sent one, is ours.
 * Migration 073 has the measurements that forced this: the old rule was an
 * agent blocklist, and it passed 839 chats in 30 days against 246 page views.
 *
 * This route used to advertise that it counted with JavaScript off, because
 * the redirect is server-side. It no longer does, since the page-view beacon
 * it now checks against is a script. That is a deliberate trade — a few
 * percent missed is better than 240% invented — and it has a second benefit:
 * chats and views now describe the same population, so chats per view is a
 * ratio rather than a number that can exceed 100%.
 *
 * The same visitor still counts once a day per operator, so a link preview or
 * a second tap is not a second chat. Never fails the traveller: a listing
 * without a number, an uncounted chat, or a write that does not land still
 * ends on WhatsApp or on a useful page.
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
  const referer = request.headers.get('referer');
  if (userAgent && !BOT_UA.test(userAgent)) {
    const visitor = visitorHash(clientIp(request), userAgent);
    try {
      // Was this visitor actually on the site today? See migration 073: the
      // agent blocklist alone let through 839 "chats" in 30 days against 246
      // page views, 787 of them from identities that loaded no page at all.
      // A single row is enough, so ask for one and nothing from it.
      const { count: seen } = await admin
        .from('page_views')
        .select('id', { count: 'exact', head: true })
        .eq('visitor_hash', visitor)
        .gte('created_at', new Date(Date.now() - 864e5).toISOString());

      const visited = (seen ?? 0) > 0;
      const sameOrigin = sameOriginReferrer(referer, siteUrl);

      if (visited && sameOrigin) {
        const { error } = await admin.from('contact_clicks').insert({
          business_id: business.id,
          channel: 'whatsapp',
          source: from,
          lead_id: leadId,
          visitor_hash: visitor,
          user_agent: userAgent.slice(0, 512),
          referrer: referer?.slice(0, 512) ?? null,
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
      } else {
        // Not counted as a contact, but worth keeping: this is how we tell
        // whether 073 worked, and how we would notice it over-rejecting. Admin
        // -only, and it never reaches an operator's dashboard.
        await admin.from('analytics_events').insert({
          event: 'whatsapp_uncounted',
          path: `/business/${business.slug}`,
          locale,
          visitor_hash: visitor,
          props: {
            slug: business.slug,
            from,
            reason: !visited ? 'no_page_view' : 'foreign_referrer',
            ua: userAgent.slice(0, 256),
            referrer: referer?.slice(0, 256) ?? null,
          },
        });
      }
    } catch (err) {
      console.error('[whatsapp] could not record', business.slug, err);
    }
  }

  return redirect(target);
}
