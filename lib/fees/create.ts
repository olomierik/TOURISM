import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';

type Admin = ReturnType<typeof createAdminClient>;

/** The fee per traveller, from platform_settings (admin-editable). */
export async function feePerPerson(admin: Admin): Promise<{ amount: number; currency: string }> {
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'group_trip_fee_per_person').maybeSingle();
  const v = (data?.value ?? {}) as { amount?: unknown; currency?: unknown };
  const amount = Number(v.amount);
  return {
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 3,
    currency: typeof v.currency === 'string' && /^[A-Z]{3}$/.test(v.currency) ? v.currency : 'USD',
  };
}

/**
 * The per-traveller fee for a booked trip with a local tour guide (owner,
 * 24 Nov 2026: "charge after the trip, charge per person").
 *
 * Only for listings that are tour guides; other operators are on their own
 * plans. One fee per booking (unique), due the day after the trip's last day;
 * when the trip has no end date, thirty days after booking. Never throws: a
 * missing fee is fixed by admin, a failed booking is not.
 */
export async function createFeeForBooking(
  admin: Admin,
  booking: { id: string; businessId: string; travellers: number; tripEnd: string | null; tripStart: string | null; days: number | null },
): Promise<void> {
  try {
    const { data: guide } = await admin
      .from('tour_guide_profiles')
      .select('business_id')
      .eq('business_id', booking.businessId)
      .maybeSingle();
    if (!guide) return;
    const fee = await feePerPerson(admin);
    let due = booking.tripEnd;
    if (!due && booking.tripStart && booking.days) {
      const d = new Date(`${booking.tripStart}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + booking.days - 1);
      due = d.toISOString().slice(0, 10);
    }
    if (!due) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 30);
      due = d.toISOString().slice(0, 10);
    }
    await admin.from('platform_fees').upsert(
      {
        booking_id: booking.id,
        business_id: booking.businessId,
        travellers: Math.max(1, booking.travellers),
        fee_per_person: fee.amount,
        currency: fee.currency,
        due_on: due,
      },
      { onConflict: 'booking_id', ignoreDuplicates: true },
    );
  } catch (err) {
    console.error('[fees] could not record fee', booking.id, err);
  }
}
