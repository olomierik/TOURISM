'use server';

import { headers } from 'next/headers';

import { MAX_CHOSEN } from './quote-types';
import { getLocale, getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getEmailProvider } from '@/lib/notifications';
import { locales, type Locale, contentLocale } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';
import { whatsappNumberFor } from '@/lib/contact/whatsapp';

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
  /**
   * The operators it reached who can be messaged on WhatsApp, for the
   * confirmation's "chat now" buttons. Ids and names only: the number stays on
   * the server, behind the tracked route.
   */
  whatsapp?: Array<{ businessId: string; name: string }>;
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
/**
 * The operators an enquiry reached who answer on WhatsApp: the one the
 * traveller chose first, then best match first.
 * A failure here costs the traveller a shortcut, never the confirmation.
 */
async function whatsappReachable(leadId: string): Promise<Array<{ businessId: string; name: string }>> {
  const { data, error } = await createAdminClient()
    .from('lead_businesses')
    .select('rank, match_reason, businesses!inner (id, name, whatsapp, phone, country_code, is_demo)')
    .eq('lead_id', leadId)
    .order('rank', { ascending: true });
  if (error) {
    console.error('[lead] whatsapp list failed', error.message);
    return [];
  }
  const chosen = (r: { match_reason: unknown }) =>
    (r.match_reason as { chosen_by_traveler?: boolean } | null)?.chosen_by_traveler ? 0 : 1;
  return [...(data ?? [])]
    .sort((a, b) => chosen(a) - chosen(b))
    .map((r) => r.businesses as unknown as {
      id: string;
      name: string;
      whatsapp: string | null;
      phone: string | null;
      country_code: string | null;
      is_demo: boolean;
    })
    .filter(
      (b) =>
        !b.is_demo &&
        whatsappNumberFor({ whatsapp: b.whatsapp, phone: b.phone, countryCode: b.country_code }),
    )
    .map((b) => ({ businessId: b.id, name: b.name }));
}

export async function submitQuoteRequest(
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  // Honeypot: a field hidden from humans, irresistible to naive bots. Silently
  // report success so the bot has no signal that it was rejected.
  //
  // The field was named `company`, which Chrome autofills as an organisation
  // regardless of autocomplete="off". Every traveller with autofill enabled hit
  // this branch, saw a reference number, and had their enquiry thrown away. The
  // name below matches no autofill heuristic, and a trip is logged so this can
  // never again be invisible.
  if (str(formData, 'et_hp_ref')) {
    console.warn('[quote] honeypot tripped — enquiry discarded');
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
          .eq('locale', contentLocale(locale))
          .eq('slug', destinationSlug)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    categorySlug
      ? admin
          .from('category_translations')
          .select('category_id')
          .eq('locale', contentLocale(locale))
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

  // Operators the traveller picked themselves.
  //
  // "Request a quote" on a business page carries that business's slug, and the
  // Saved list carries every operator on it (§7.14), but the matcher ranks on
  // destination, category and plan and never reads either, so the operators a
  // traveller chose could be left out while five others were sent the enquiry.
  const chosenSlugs = [
    ...new Set(
      str(formData, 'chosen')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]{1,120}$/.test(s)),
    ),
  ].slice(0, MAX_CHOSEN);

  // Distribution. A failure here must not lose the enquiry — the lead row
  // already exists and an admin can redistribute it, so the traveler still gets
  // a confirmation rather than an error for something that is our problem.
  //
  // The matcher is skipped when the traveller named their own operators and
  // did not ask to widen it. It used to run unconditionally: the form offered
  // "Also ask up to 5 similar operators", said "off by default", never sent
  // the answer, and sent the enquiry to those five regardless. Somebody who
  // deliberately left it off still had their name, email and phone number
  // handed to five companies they had not chosen.
  const alsoSimilar = formData.get('alsoSimilar') === 'on';
  let matched = 0;

  if (!chosenSlugs.length || alsoSimilar) {
    const { data: matchCount, error: matchError } = await admin.rpc(
      'match_lead_to_businesses',
      { target_lead: lead.id },
    );

    if (matchError) {
      console.error('[lead] distribution failed', lead.reference, matchError.message);
    } else {
      matched = matchCount ?? 0;
    }
  }

  // Added after matching, so when it did run the operators it found still get
  // the chance to quote.
  if (chosenSlugs.length) {
    const { data: chosen } = await admin
      .from('businesses')
      .select('id')
      .in('slug', chosenSlugs)
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (chosen?.length) {
      const { error: chosenError } = await admin.from('lead_businesses').upsert(
        chosen.map((b) => ({
          lead_id: lead.id,
          business_id: b.id,
          rank: 1,
          match_reason: { chosen_by_traveler: true },
        })),
        { onConflict: 'lead_id,business_id', ignoreDuplicates: true },
      );
      if (chosenError) {
        console.error(
          '[lead] could not add the chosen operators',
          lead.reference,
          chosenError.message,
        );
      } else {
        const { count } = await admin
          .from('lead_businesses')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', lead.id);
        matched = count ?? matched;
      }
    }
  }

  const [, delivered] = await Promise.all([
    sendTravelerConfirmation({ email, fullName, reference: lead.reference, matched, locale }),
    notifyMatchedBusinesses(lead.id, lead.reference, locale),
  ]);

  // The safety net, and the reason it exists.
  //
  // 646 of 2,067 approved listings carry an email and three have ever been
  // claimed — the rest came from map data, which gives a phone and a website
  // and never an address. So an enquiry can match five operators on merit and
  // reach none of them, which is what was happening: every lead distributed
  // correctly and no operator was ever told.
  //
  // Ranking reachable operators first (migration 052) helps only where a
  // reachable one exists. Until the directory has addresses, somebody has to
  // see the enquiries that fall through, and it should be the person whose
  // business depends on them rather than a log line nobody reads.
  await notifySiteOwner({ lead, fullName, email, message, matched, delivered });

  return { reference: lead.reference, matched, whatsapp: await whatsappReachable(lead.id) };
}

async function notifySiteOwner({
  lead,
  fullName,
  email,
  message,
  matched,
  delivered,
}: {
  lead: { id: string; reference: string };
  fullName: string;
  email: string;
  message: string;
  matched: number;
  delivered: number;
}) {
  try {
    const admin = createAdminClient();
    const { data: admins } = await admin
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .is('deleted_at', null);

    const to = (admins ?? []).map((a) => a.email).filter((v): v is string => Boolean(v));
    if (!to.length) return;

    // Deliberately not translated. This goes to whoever runs the site, not to a
    // traveller, and it is read once and acted on.
    const unreached = matched - delivered;
    const provider = getEmailProvider();

    await Promise.all(
      to.map((address) =>
        provider.send({
          to: address,
          subject: `New enquiry ${lead.reference} — ${delivered} of ${matched} operators notified`,
          // Built as lines and joined, rather than a chain of concatenations
          // carrying their own newlines — the escapes are the part that gets
          // misread when this is edited later.
          text: [
            `${fullName} <${email}> sent an enquiry.`,
            '',
            message,
            '',
            `Matched ${matched} operator(s); ${delivered} could be emailed.`,
            ...(unreached > 0
              ? [
                  `${unreached} had no email address and no claimed owner, so they were not ` +
                    `told. Until they have one, this enquiry reaches them only if you forward it.`,
                ]
              : []),
            '',
            absoluteUrl('/admin/leads'),
          ].join('\n'),
        }),
      ),
    );
  } catch (err) {
    // Never surfaces to the traveller: their enquiry is saved either way.
    console.error('[lead] site owner notification failed', lead.reference, err);
  }
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

    if (!recipients?.length) return 0;

    // The owner's account address, for listings that carry no email of their
    // own. A claimed listing has a person behind it whose address is verified;
    // skipping them because the business record has a blank field means the one
    // operator who actually signed up is the one who hears nothing. Shangaa
    // Africa was exactly that case.
    const ownerIds = recipients
      .map((r) => r.businesses?.owner_id)
      .filter((id): id is string => Boolean(id));

    const ownerEmail = new Map<string, string>();
    if (ownerIds.length) {
      const { data: owners } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', ownerIds);
      for (const o of owners ?? []) if (o.email) ownerEmail.set(o.id, o.email);
    }

    const t = await getTranslations({ locale, namespace: 'quoteEmail' });
    const provider = getEmailProvider();
    let delivered = 0;

    await Promise.all(
      recipients.map(async (r) => {
        const business = r.businesses;
        const to =
          business?.email ?? (business?.owner_id ? ownerEmail.get(business.owner_id) : null);

        if (!to) {
          // Said out loud. This was silent, and silence is why an enquiry could
          // match five operators and reach none of them without anything in the
          // logs to show for it.
          console.warn(
            `[lead] ${reference}: no address for "${business?.name ?? r.business_id}" — not notified`,
          );
          return;
        }

        delivered += 1;
        const result = await provider.send({
          to,
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

    return delivered;
  } catch (err) {
    console.error('[lead] business notifications failed', reference, err);
    return 0;
  }
}

/** Locale guard for values arriving from a form. */
export async function isSupportedLocale(value: string): Promise<boolean> {
  return locales.includes(value as Locale);
}
