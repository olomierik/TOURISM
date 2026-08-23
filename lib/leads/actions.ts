'use server';

import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getEmailProvider } from '@/lib/notifications';
import { locales, type Locale } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';

export type QuoteErrorKey =
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'messageRequired'
  | 'datesInvalid'
  | 'travelersInvalid'
  | 'rateLimited'
  | 'generic';

export type QuoteState = {
  error?: QuoteErrorKey;
  /** Set on success — the human-quotable reference, e.g. ET-2026-000123. */
  reference?: string;
  /** How many operators the enquiry reached, shown on the confirmation. */
  matched?: number;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const nullable = (fd: FormData, key: string) => str(fd, key) || null;

function num(fd: FormData, key: string): number | null {
  const raw = str(fd, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Creates an enquiry and distributes it.
 *
 * Runs entirely on the server with the secret key. Two reasons: the traveler may
 * be a guest with no session at all — requiring an account before a quote is the
 * fastest way to lose the lead — and distribution decides which operators get
 * paid attention, so it must not be reachable from a browser (migration 017
 * revokes the RPC from anon and authenticated).
 */
export async function submitQuoteRequest(
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  // Honeypot: a field hidden from humans, irresistible to naive bots. Silently
  // report success so the bot has no signal that it was rejected.
  if (str(formData, 'company')) {
    return { reference: 'ET-0000-000000', matched: 0 };
  }

  const fullName = str(formData, 'fullName');
  const email = str(formData, 'email');
  const message = str(formData, 'message');

  if (!fullName) return { error: 'nameRequired' };
  if (!email) return { error: 'emailRequired' };
  if (!EMAIL_RE.test(email)) return { error: 'emailInvalid' };
  if (message.length < 10) return { error: 'messageRequired' };

  const travelStart = nullable(formData, 'travelStart');
  const travelEnd = nullable(formData, 'travelEnd');
  if (travelStart && travelEnd && travelEnd < travelStart) {
    return { error: 'datesInvalid' };
  }

  const adults = num(formData, 'adults') ?? 1;
  const children = num(formData, 'children') ?? 0;
  if (adults < 1 || adults > 40 || children < 0 || children > 40) {
    return { error: 'travelersInvalid' };
  }

  const locale = (await getLocale()) as Locale;
  const admin = createAdminClient();

  // Attribute the enquiry to the signed-in traveler when there is one, so it
  // shows up under their account. Guests simply get a null traveler_id.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cheap rate limit: the same address submitting repeatedly in a short window
  // is either a mistake or abuse, and either way a second identical enquiry
  // helps nobody. Not a substitute for a real limiter at the edge.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recent } = await admin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);

  if ((recent ?? 0) >= 3) return { error: 'rateLimited' };

  // Slugs arrive from the URL; resolve them to ids, tolerating unknown values
  // rather than failing — a stale link should still produce a lead.
  const destinationSlug = nullable(formData, 'destination');
  const categorySlug = nullable(formData, 'category');

  const [destinationRow, categoryRow] = await Promise.all([
    destinationSlug
      ? admin
          .from('destination_translations')
          .select('destination_id')
          .eq('locale', locale)
          .eq('slug', destinationSlug)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    categorySlug
      ? admin
          .from('category_translations')
          .select('category_id')
          .eq('locale', locale)
          .eq('slug', categorySlug)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const headerList = await headers();
  const interests = formData.getAll('interests').map(String).filter(Boolean);

  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      traveler_id: user?.id ?? null,
      full_name: fullName,
      email,
      phone: nullable(formData, 'phone'),
      whatsapp: nullable(formData, 'whatsapp'),
      destination_id: destinationRow.data?.destination_id ?? null,
      category_id: categoryRow.data?.category_id ?? null,
      destination_other: nullable(formData, 'destinationOther'),
      travel_start: travelStart,
      travel_end: travelEnd,
      dates_flexible: formData.get('datesFlexible') === 'on',
      adults,
      children,
      budget_min: num(formData, 'budgetMin'),
      budget_max: num(formData, 'budgetMax'),
      budget_currency: str(formData, 'budgetCurrency') || 'USD',
      interests,
      message,
      locale,
      source_url: nullable(formData, 'sourceUrl'),
      referrer: headerList.get('referer'),
      user_agent: headerList.get('user-agent'),
    })
    .select('id, reference, quality_score')
    .single();

  if (error || !lead) {
    console.error('[lead] insert failed', error?.message);
    return { error: 'generic' };
  }

  // Distribution. A failure here must not lose the enquiry — the lead row
  // already exists and an admin can redistribute it, so the traveler still gets
  // a confirmation rather than an error for something that is our problem.
  let matched = 0;
  const { data: matchCount, error: matchError } = await admin.rpc(
    'match_lead_to_businesses',
    { target_lead: lead.id },
  );

  if (matchError) {
    console.error('[lead] distribution failed', lead.reference, matchError.message);
  } else {
    matched = matchCount ?? 0;
  }

  await Promise.all([
    sendTravelerConfirmation({ email, fullName, reference: lead.reference, matched, locale }),
    notifyMatchedBusinesses(lead.id, lead.reference, locale),
  ]);

  return { reference: lead.reference, matched };
}

async function sendTravelerConfirmation({
  email,
  fullName,
  reference,
  matched,
  locale,
}: {
  email: string;
  fullName: string;
  reference: string;
  matched: number;
  locale: Locale;
}) {
  try {
    const t = await getTranslations({ locale, namespace: 'quoteEmail' });
    await getEmailProvider().send({
      to: email,
      subject: t('travelerSubject', { reference }),
      text: t('travelerBody', { name: fullName, reference, count: matched }),
    });
  } catch (err) {
    // Never let a mail failure surface to the traveler: the enquiry is saved and
    // the operators have been notified, which is what actually matters.
    console.error('[lead] traveler confirmation failed', reference, err);
  }
}

async function notifyMatchedBusinesses(
  leadId: string,
  reference: string,
  locale: Locale,
) {
  try {
    const admin = createAdminClient();
    const { data: recipients } = await admin
      .from('lead_businesses')
      .select('business_id, businesses (name, email, owner_id)')
      .eq('lead_id', leadId);

    if (!recipients?.length) return;

    const t = await getTranslations({ locale, namespace: 'quoteEmail' });
    const provider = getEmailProvider();

    await Promise.all(
      recipients.map(async (r) => {
        const business = r.businesses;
        if (!business?.email) return;

        const result = await provider.send({
          to: business.email,
          subject: t('businessSubject', { reference }),
          text: t('businessBody', {
            business: business.name,
            reference,
            url: absoluteUrl('/dashboard/leads'),
          }),
        });

        // Record the outcome on the queued in-app notification so an admin can
        // see which emails actually went out.
        await admin
          .from('notifications')
          .update({
            email_status: result.ok ? 'sent' : 'failed',
            email_sent_at: result.ok ? new Date().toISOString() : null,
            email_error: result.error ?? null,
          })
          .eq('lead_id', leadId)
          .eq('business_id', r.business_id);
      }),
    );
  } catch (err) {
    console.error('[lead] business notifications failed', reference, err);
  }
}

/** Locale guard for values arriving from a form. */
export async function isSupportedLocale(value: string): Promise<boolean> {
  return locales.includes(value as Locale);
}
