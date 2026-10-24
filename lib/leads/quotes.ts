'use server';

import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { loadThread, sideOf, localeOf, travelerLink } from '@/lib/leads/thread-access';
import { QUOTE_CURRENCIES, formatMoney } from '@/lib/leads/quote-types';

export type QuoteState = {
  success?: boolean;
  error?: 'notAllowed' | 'invalidAmount' | 'invalidDate' | 'generic';
};

function text(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? '').trim().slice(0, 2000);
  return v || null;
}

/**
 * Sends or updates the operator's quote for one enquiry.
 *
 * The quote lands in three places: lead_quotes (what the traveller's
 * comparison reads), the conversation (a line saying a quote was sent, so the
 * thread tells the whole story), and the traveller's inbox. The enquiry moves
 * to "quoted" unless it is already won or lost.
 */
export async function sendQuote(
  leadBusinessId: string,
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const thread = await loadThread(leadBusinessId);
  if (!thread) return { error: 'notAllowed' };
  const who = await sideOf(thread);
  if (who?.side !== 'operator') return { error: 'notAllowed' };

  const amount = Number(String(formData.get('amount') ?? '').replace(/[ ,]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 10_000_000) return { error: 'invalidAmount' };
  const currencyInput = String(formData.get('currency') ?? 'USD').toUpperCase();
  const currency = (QUOTE_CURRENCIES as readonly string[]).includes(currencyInput) ? currencyInput : 'USD';
  const basis = formData.get('basis') === 'per_person' ? 'per_person' : 'total';
  const daysRaw = Number(formData.get('days') ?? '');
  const days = Number.isInteger(daysRaw) && daysRaw >= 1 && daysRaw <= 90 ? daysRaw : null;
  const validUntil = text(formData, 'validUntil');
  if (validUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || validUntil < new Date().toISOString().slice(0, 10))) {
    return { error: 'invalidDate' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('lead_quotes').upsert(
    {
      lead_business_id: thread.id,
      total_amount: Math.round(amount * 100) / 100,
      currency,
      price_basis: basis,
      duration_days: days,
      valid_until: validUntil,
      includes: text(formData, 'includes'),
      excludes: text(formData, 'excludes'),
      notes: text(formData, 'notes'),
    },
    { onConflict: 'lead_business_id' },
  );
  if (error) {
    console.error('[quotes] save failed', thread.lead.reference, error.message);
    return { error: 'generic' };
  }

  await admin
    .from('lead_businesses')
    .update({
      ...(['sent', 'viewed', 'responded'].includes(thread.status) ? { status: 'quoted' as const } : {}),
      quoted_amount: Math.round(amount * 100) / 100,
      quoted_currency: currency,
    })
    .eq('id', thread.id);

  // The conversation records the quote in the traveller's language.
  const locale = localeOf(thread.lead.locale);
  const t = await getTranslations({ locale, namespace: 'quoteSent' });
  const price = formatMoney(amount, currency, locale);
  const summary = t(basis === 'per_person' ? 'summaryPerPerson' : 'summaryTotal', {
    price,
    days: days ?? 0,
  });
  await admin.from('lead_messages').insert({
    lead_business_id: thread.id,
    sender: 'operator',
    sender_profile_id: who.profileId,
    body: summary,
  });

  try {
    const mail = renderBrandedEmail({
      heading: t('emailHeading', { business: thread.business.name }),
      paragraphs: [summary, t('emailBody')],
      action: { label: t('emailCta'), url: `${travelerLink(thread)}#quotes` },
      footnote: t('emailFoot', { reference: thread.lead.reference }),
    });
    await getEmailProvider().send({
      to: thread.lead.email,
      subject: t('emailSubject', { business: thread.business.name, reference: thread.lead.reference }),
      ...mail,
    });
  } catch (err) {
    console.error('[quotes] notice failed', thread.lead.reference, err);
  }

  revalidatePath('/dashboard/leads');
  return { success: true };
}
