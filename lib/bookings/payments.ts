'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { siteUrl } from '@/lib/seo';
import { formatMoney } from '@/lib/leads/quote-types';

export type PaymentState = { success?: boolean; error?: 'signIn' | 'notAllowed' | 'amount' | 'generic' };

/**
 * The traveller says they paid a deposit to the guide (mobile money, bank,
 * cash). The site holds no money; this is the record both sides look at.
 * The guide is emailed and confirms it from Dashboard > Bookings.
 */
export async function reportDeposit(reference: string, _prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signIn' };
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, traveler_id, business_id, quote, operator, reference')
    .eq('reference', reference)
    .maybeSingle();
  if (!booking || booking.traveler_id !== user.id) return { error: 'notAllowed' };

  const amount = Number(String(fd.get('amount') ?? '').replace(/[ ,]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return { error: 'amount' };
  const currency = String(fd.get('currency') ?? 'USD') === 'TZS' ? 'TZS' : 'USD';
  const methodRaw = String(fd.get('method') ?? 'mobile_money');
  const method = ['mobile_money', 'bank', 'cash', 'other'].includes(methodRaw) ? methodRaw : 'other';
  const ref = String(fd.get('reference') ?? '').trim().slice(0, 120) || null;

  const admin = createAdminClient();
  const { error } = await admin.from('booking_payments').insert({
    booking_id: booking.id,
    amount: Math.round(amount * 100) / 100,
    currency,
    method,
    reference: ref,
    reported_by: user.id,
  });
  if (error) return { error: 'generic' };

  const operator = booking.operator as { name?: string; email?: string | null };
  if (operator.email) {
    try {
      const mail = renderBrandedEmail({
        heading: `Deposit reported for ${booking.reference}`,
        paragraphs: [
          `The traveller says they paid ${formatMoney(amount, currency, 'en')} by ${method.replace('_', ' ')}${ref ? ` (reference ${ref})` : ''}.`,
          'Check that it arrived, then confirm it in your dashboard so you both have the same record.',
          `Amana iliyoripotiwa kwa ${booking.reference}: ${formatMoney(amount, currency, 'en')}. Thibitisha kwenye dashibodi yako ikishafika.`,
        ],
        action: { label: 'Open bookings', url: `${siteUrl}/dashboard/bookings` },
      });
      await getEmailProvider().send({ to: operator.email, subject: `Deposit reported: ${booking.reference}`, ...mail });
    } catch (err) {
      console.error('[payments] guide notice failed', err);
    }
  }
  revalidatePath('/dashboard/bookings');
  return { success: true };
}

/** The guide (or admin) confirms a reported payment arrived, or says it did not. */
export async function decidePayment(paymentId: string, decision: 'confirmed' | 'rejected'): Promise<PaymentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signIn' };
  // Read through the user's own client: RLS returns the row only to the
  // booking's traveller, its operator's owner and admins.
  const { data: pay } = await supabase
    .from('booking_payments')
    .select('id, bookings!inner (business_id, traveler_id)')
    .eq('id', paymentId)
    .maybeSingle();
  if (!pay) return { error: 'notAllowed' };
  const b = (Array.isArray(pay.bookings) ? pay.bookings[0] : pay.bookings) as { business_id: string | null; traveler_id: string };
  if (b.traveler_id === user.id) return { error: 'notAllowed' };
  const admin = createAdminClient();
  const { error } = await admin
    .from('booking_payments')
    .update({ status: decision, confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) return { error: 'generic' };
  revalidatePath('/dashboard/bookings');
  return { success: true };
}
