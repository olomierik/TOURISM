'use server';

import { getLocale } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { contentLocale, type Locale } from '@/i18n/routing';
import { submitQuoteRequest, type QuoteState } from '@/lib/leads/actions';
import { GROUP_AUDIENCES, GUIDE_SPECIALTIES, isOneOf } from '@/lib/tour-guides/constants';

export type GroupRequestState = QuoteState;

/**
 * A group asks local guides for a budget trip.
 *
 * It is an ordinary enquiry in the tour-guides category, sent through the
 * same matcher, conversation, quotes and BOOKED as every other, so a guide
 * answers it from the dashboard they already have. What is added is who the
 * group is (church, school, backpackers) and how they want to travel, written
 * into the message so a guide reads it first, and onto the lead for admin.
 */
export async function submitGroupRequest(_prev: GroupRequestState, fd: FormData): Promise<GroupRequestState> {
  const locale = (await getLocale()) as Locale;
  const admin = createAdminClient();
  const { data: cat } = await admin
    .from('category_translations')
    .select('slug, categories!inner (key)')
    .eq('categories.key', 'tour-guides')
    .eq('locale', contentLocale(locale))
    .maybeSingle();

  const kind = String(fd.get('groupKind') ?? '');
  const groupKind = isOneOf(GROUP_AUDIENCES, kind) ? kind : kind === 'other' ? 'other' : null;
  const organisation = String(fd.get('organisation') ?? '').trim().slice(0, 160) || null;
  const interests = fd.getAll('interests').map(String).filter((v) => isOneOf(GUIDE_SPECIALTIES, v));
  const stay = String(fd.get('stay') ?? '');
  const days = Number(fd.get('days') ?? '');
  const people = Number(fd.get('adults') ?? '0') + Number(fd.get('children') ?? '0');
  const budget = Number(fd.get('budgetPerPerson') ?? '');

  // What the guide reads first, in plain words, above the group's own message.
  const head = [
    `Group trip request${groupKind ? ` (${groupKind})` : ''}${organisation ? ` from ${organisation}` : ''}.`,
    people ? `${people} people.` : null,
    Number.isFinite(days) && days > 0 ? `${days} days.` : null,
    stay ? `Stay: ${stay}.` : null,
    Number.isFinite(budget) && budget > 0 ? `Budget about USD ${budget} per person per day.` : null,
    interests.length ? `Interested in: ${interests.join(', ')}.` : null,
    'Budget travel: local guide, hostels or homestays, local food.',
  ]
    .filter(Boolean)
    .join(' ');

  const forward = new FormData();
  for (const [k, v] of fd.entries()) forward.append(k, v);
  forward.set('message', `${head}\n\n${String(fd.get('message') ?? '').trim()}`.trim());
  if (cat?.slug) forward.set('category', cat.slug);
  for (const i of interests) forward.append('interests', i);
  if (Number.isFinite(budget) && budget > 0 && Number.isFinite(days) && days > 0) {
    forward.set('budgetMin', String(Math.round(budget * days * 0.8)));
    forward.set('budgetMax', String(Math.round(budget * days * 1.2)));
    forward.set('budgetCurrency', 'USD');
  }

  const result = await submitQuoteRequest({}, forward);
  if (result.reference) {
    await admin.from('leads').update({ group_kind: groupKind, organisation }).eq('reference', result.reference);
  }
  return result;
}
