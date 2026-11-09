import 'server-only';

import { getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail, type BrandedEmail } from '@/lib/notifications/template';
import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';
import { reviewLink } from '@/lib/reviews/invite';

/**
 * The reminder emails, run hourly (app/api/cron/reminders, scheduled by
 * netlify/functions/reminders.mjs). Each kind looks at a time window, sends
 * at most BATCH emails a run, and stamps what it sent (migration 065), so a
 * reminder goes out once however often the job runs. Windows are bounded on
 * both sides, so switching the job on doesn't mail people about things weeks
 * old.
 *
 *  - nudge:    operator, an enquiry unanswered 12 to 72 hours after it arrived
 *  - review:   traveller, 1 to 30 days after a won trip ended, if no review
 *  - followUp: traveller, 2 to 4 days after enquiring: replies so far, or what
 *              to do if there are none
 *  - trial:    operator, Premium trial ending in 14, 7, 3 and 1 days
 *  - renewal:  operator, a paid plan reaching the end of its period in 7 or 1
 *  - dunning:  operator, that period has passed and the two days of grace
 *              (migration 086) are running out
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BATCH = 25;

export type ReminderScope = { leadIds?: string[]; businessIds?: string[] };
export type ReminderReport = Record<
  'nudge' | 'review' | 'followUp' | 'trial' | 'renewal' | 'dunning',
  number
>;

function localeOf(value: string | null | undefined): Locale {
  return value && (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
}

function url(href: Parameters<typeof getPathname>[0]['href'], locale: Locale, query = ''): string {
  return `${siteUrl}${getPathname({ href, locale })}${query}`;
}

async function send(to: string, subject: string, mail: BrandedEmail): Promise<boolean> {
  try {
    const r = await getEmailProvider().send({ to, subject, ...renderBrandedEmail(mail) });
    return r.ok !== false;
  } catch (err) {
    console.error('[reminders] send failed', subject, err);
    return false;
  }
}

/** The operator's address and language: the owner's account, else the listing's. */
async function operatorContact(
  ownerId: string | null,
  businessEmail: string | null,
): Promise<{ email: string; locale: Locale } | null> {
  if (ownerId) {
    const { data } = await createAdminClient()
      .from('profiles')
      .select('email, locale')
      .eq('id', ownerId)
      .maybeSingle();
    if (data?.email) return { email: data.email, locale: localeOf(data.locale) };
  }
  return businessEmail ? { email: businessEmail, locale: defaultLocale } : null;
}

async function nudges(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  let q = admin
    .from('lead_businesses')
    .select(
      `id, sent_at,
       businesses!inner (name, email, owner_id, status),
       leads!inner (reference, full_name),
       lead_messages (sender)`,
    )
    .in('status', ['sent', 'viewed'])
    .is('nudged_at', null)
    .gte('sent_at', new Date(now - 72 * HOUR).toISOString())
    .lte('sent_at', new Date(now - 12 * HOUR).toISOString())
    // Claimed listings only: an unclaimed one has nobody to reply on the site,
    // and was already emailed when the enquiry arrived.
    .not('businesses.owner_id', 'is', null)
    .eq('businesses.status', 'approved')
    .limit(BATCH);
  if (scope.leadIds) q = q.in('lead_id', scope.leadIds);
  const { data } = await q;

  let sent = 0;
  for (const row of data ?? []) {
    const lb = row as unknown as {
      id: string;
      sent_at: string;
      businesses: { name: string; email: string | null; owner_id: string | null };
      leads: { reference: string; full_name: string };
      lead_messages: Array<{ sender: string }>;
    };
    if (lb.lead_messages.some((m) => m.sender === 'operator')) {
      await admin.from('lead_businesses').update({ nudged_at: new Date().toISOString() }).eq('id', lb.id);
      continue;
    }
    const to = await operatorContact(lb.businesses.owner_id, lb.businesses.email);
    if (!to) continue;
    const t = await getTranslations({ locale: to.locale, namespace: 'reminders.nudge' });
    const hours = Math.floor((now - new Date(lb.sent_at).getTime()) / HOUR);
    const ok = await send(to.email, t('subject', { name: lb.leads.full_name, reference: lb.leads.reference }), {
      heading: t('heading', { name: lb.leads.full_name }),
      paragraphs: [t('body', { hours, reference: lb.leads.reference }), t('tip')],
      action: { label: t('cta'), url: url('/dashboard/leads', to.locale) },
      footnote: t('footnote', { business: lb.businesses.name }),
    });
    if (ok) {
      await admin.from('lead_businesses').update({ nudged_at: new Date().toISOString() }).eq('id', lb.id);
      sent++;
    }
  }
  return sent;
}

async function reviewReminders(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  let q = admin
    .from('lead_businesses')
    .select(
      `id, lead_id, business_id, review_token,
       businesses!inner (name),
       leads!inner (full_name, email, locale, travel_start, travel_end)`,
    )
    .eq('status', 'won')
    .is('review_reminded_at', null)
    .limit(200);
  if (scope.leadIds) q = q.in('lead_id', scope.leadIds);
  const { data } = await q;

  let sent = 0;
  for (const row of data ?? []) {
    if (sent >= BATCH) break;
    const lb = row as unknown as {
      id: string;
      lead_id: string;
      business_id: string;
      review_token: string;
      businesses: { name: string };
      leads: { full_name: string; email: string; locale: string; travel_start: string | null; travel_end: string | null };
    };
    const ended = lb.leads.travel_end ?? lb.leads.travel_start;
    if (!ended) continue;
    const since = now - new Date(ended).getTime();
    if (since < DAY || since > 30 * DAY) continue;

    const { count } = await admin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', lb.lead_id)
      .eq('business_id', lb.business_id)
      .is('deleted_at', null);
    const stamp = new Date().toISOString();
    if ((count ?? 0) > 0) {
      await admin.from('lead_businesses').update({ review_reminded_at: stamp }).eq('id', lb.id);
      continue;
    }

    const locale = localeOf(lb.leads.locale);
    const t = await getTranslations({ locale, namespace: 'reminders.review' });
    const first = lb.leads.full_name.split(/\s+/)[0] || lb.leads.full_name;
    const ok = await send(lb.leads.email, t('subject', { business: lb.businesses.name }), {
      heading: t('heading', { name: first }),
      paragraphs: [t('body', { business: lb.businesses.name })],
      action: { label: t('cta'), url: reviewLink(lb.review_token, locale) },
      footnote: t('footnote'),
    });
    if (ok) {
      await admin
        .from('lead_businesses')
        .update({ review_reminded_at: stamp })
        .eq('id', lb.id);
      sent++;
    }
  }
  return sent;
}

async function followUps(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  let q = admin
    .from('leads')
    .select(
      `id, reference, full_name, email, locale, access_token,
       lead_businesses (status, lead_messages (sender))`,
    )
    .is('followup_sent_at', null)
    .gte('created_at', new Date(now - 96 * HOUR).toISOString())
    .lte('created_at', new Date(now - 48 * HOUR).toISOString())
    .limit(BATCH);
  if (scope.leadIds) q = q.in('id', scope.leadIds);
  const { data } = await q;

  let sent = 0;
  for (const lead of data ?? []) {
    const replies = (lead.lead_businesses ?? []).filter(
      (lb) =>
        ['responded', 'quoted', 'won'].includes(lb.status) ||
        (lb.lead_messages ?? []).some((m) => m.sender === 'operator'),
    ).length;
    const locale = localeOf(lead.locale);
    const t = await getTranslations({ locale, namespace: 'reminders.followUp' });
    const first = lead.full_name.split(/\s+/)[0] || lead.full_name;
    const conversations = url(
      { pathname: '/enquiry/[reference]', params: { reference: lead.reference } },
      locale,
      `?t=${lead.access_token}`,
    );
    const ok = await send(
      lead.email,
      replies > 0 ? t('subjectReplies', { count: replies }) : t('subjectNone', { reference: lead.reference }),
      replies > 0
        ? {
            heading: t('headingReplies', { name: first, count: replies }),
            paragraphs: [t('bodyReplies')],
            action: { label: t('ctaReplies'), url: conversations },
            footnote: t('footnote', { reference: lead.reference }),
          }
        : {
            heading: t('headingNone', { name: first }),
            paragraphs: [t('bodyNone'), t('bodyNoneTip')],
            action: { label: t('ctaNone'), url: conversations },
            footnote: t('footnote', { reference: lead.reference }),
          },
    );
    if (ok) {
      await admin.from('leads').update({ followup_sent_at: new Date().toISOString() }).eq('id', lead.id);
      sent++;
    }
  }
  return sent;
}

const TRIAL_BUCKETS = [1, 3, 7, 14];

async function trialReminders(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  let q = admin
    .from('subscriptions')
    .select('id, current_period_end, trial_reminder_days, businesses!inner (name, email, owner_id)')
    .eq('is_trial', true)
    .eq('status', 'active')
    .gt('current_period_end', new Date(now).toISOString())
    .lte('current_period_end', new Date(now + 14 * DAY).toISOString())
    .limit(BATCH);
  if (scope.businessIds) q = q.in('business_id', scope.businessIds);
  const { data } = await q;

  let sent = 0;
  for (const row of data ?? []) {
    const s = row as unknown as {
      id: string;
      current_period_end: string;
      trial_reminder_days: number | null;
      businesses: { name: string; email: string | null; owner_id: string | null };
    };
    const daysLeft = Math.max(1, Math.ceil((new Date(s.current_period_end).getTime() - now) / DAY));
    // The bucket this moment belongs to: "ends in 7 days" covers 7 down to 4.
    const bucket = TRIAL_BUCKETS.find((b) => daysLeft <= b);
    if (!bucket) continue;
    if (s.trial_reminder_days !== null && s.trial_reminder_days <= bucket) continue;

    const to = await operatorContact(s.businesses.owner_id, s.businesses.email);
    if (!to) continue;
    const t = await getTranslations({ locale: to.locale, namespace: 'reminders.trial' });
    const date = new Intl.DateTimeFormat(to.locale, { dateStyle: 'long' }).format(new Date(s.current_period_end));
    const ok = await send(to.email, t('subject', { days: daysLeft }), {
      heading: t('heading', { days: daysLeft }),
      paragraphs: [t('body', { business: s.businesses.name, date }), t('bodyKeep')],
      action: { label: t('cta'), url: url('/dashboard/subscription', to.locale) },
      footnote: t('footnote'),
    });
    if (ok) {
      await admin.from('subscriptions').update({ trial_reminder_days: bucket }).eq('id', s.id);
      sent++;
    }
  }
  return sent;
}

/**
 * The paid-subscription lifecycle: a warning, a notice, then chasing.
 *
 * Erick, 9 November 2026: "if the subscription near expiry he should receive a
 * reminder, on the day the subscription expired, and 5 times to pay after
 * expiry for 2 days before service is terminated."
 *
 * Migration 086 made termination happen two days after `current_period_end`
 * rather than at it, and the plan keeps working throughout. That is what makes
 * these emails worth sending: they ask somebody to pay for a service they can
 * still see, rather than to buy back one already taken away.
 *
 *   renewal  7 and 1 days before the period ends
 *   dunning  stage 0 on the day it ends, then five chasers across the two
 *            days of grace, the last roughly four hours before the sweep
 *
 * Trials are excluded from both: `trialReminders` already owns that sequence
 * and says something different, because a trial ending costs nobody money.
 */
const RENEWAL_BUCKETS = [1, 7];

/**
 * Hours past `current_period_end` at which each post-expiry notice goes out.
 *
 * Index 0 is the notice on the expiry day itself; 1 to 5 are the five chasers
 * Erick asked for, spread across the 48 hours of grace rather than bunched, so
 * the last one lands about four hours before `expire_subscriptions()` sweeps.
 * The job runs hourly, so each threshold is reached within the hour.
 */
const DUNNING_AT_HOURS = [0, 4, 12, 20, 32, 44];
const GRACE_HOURS = 48;

type PaidSubscriptionRow = {
  id: string;
  current_period_end: string;
  cancel_at_period_end: boolean | null;
  renewal_reminder_days: number | null;
  dunning_stage: number | null;
  businesses: { name: string; email: string | null; owner_id: string | null };
};

const PAID_COLUMNS =
  'id, current_period_end, cancel_at_period_end, renewal_reminder_days, dunning_stage, ' +
  'businesses!inner (name, email, owner_id)';

async function renewalReminders(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  let q = admin
    .from('subscriptions')
    .select(PAID_COLUMNS)
    .eq('is_trial', false)
    .eq('status', 'active')
    .gt('current_period_end', new Date(now).toISOString())
    .lte('current_period_end', new Date(now + 7 * DAY).toISOString())
    .limit(BATCH);
  if (scope.businessIds) q = q.in('business_id', scope.businessIds);
  const { data } = await q;

  let sent = 0;
  for (const row of data ?? []) {
    const s = row as unknown as PaidSubscriptionRow;
    const daysLeft = Math.max(1, Math.ceil((new Date(s.current_period_end).getTime() - now) / DAY));
    const bucket = RENEWAL_BUCKETS.find((b) => daysLeft <= b);
    if (!bucket) continue;
    if (s.renewal_reminder_days !== null && s.renewal_reminder_days <= bucket) continue;

    const to = await operatorContact(s.businesses.owner_id, s.businesses.email);
    if (!to) continue;

    const t = await getTranslations({ locale: to.locale, namespace: 'reminders.renewal' });
    const date = new Intl.DateTimeFormat(to.locale, { dateStyle: 'long' }).format(
      new Date(s.current_period_end),
    );

    // A subscription Paddle will charge again says so; one that was cancelled
    // is ending. Telling an operator their plan "expires" when a card is about
    // to be charged is how you earn a chargeback.
    const ending = s.cancel_at_period_end === true;

    const ok = await send(to.email, t(ending ? 'subjectEnding' : 'subjectRenewing', { days: daysLeft }), {
      heading: t(ending ? 'headingEnding' : 'headingRenewing', { days: daysLeft }),
      paragraphs: [
        t(ending ? 'bodyEnding' : 'bodyRenewing', { business: s.businesses.name, date }),
        t('bodyGrace'),
      ],
      action: { label: t('cta'), url: url('/dashboard/subscription', to.locale) },
      footnote: t('footnote'),
    });

    if (ok) {
      await admin.from('subscriptions').update({ renewal_reminder_days: bucket }).eq('id', s.id);
      sent++;
    }
  }
  return sent;
}

async function dunningReminders(scope: ReminderScope): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();

  // Still active, but past the end of the period it was paid for: that is
  // exactly the grace window migration 086 opened. Bounded below by the grace
  // length so switching this on does not chase anybody about last year.
  let q = admin
    .from('subscriptions')
    .select(PAID_COLUMNS)
    .eq('is_trial', false)
    .eq('status', 'active')
    .lte('current_period_end', new Date(now).toISOString())
    .gt('current_period_end', new Date(now - GRACE_HOURS * HOUR).toISOString())
    .limit(BATCH);
  if (scope.businessIds) q = q.in('business_id', scope.businessIds);
  const { data } = await q;

  let sent = 0;
  for (const row of data ?? []) {
    const s = row as unknown as PaidSubscriptionRow;
    const endsAt = new Date(s.current_period_end).getTime();
    const hoursSince = (now - endsAt) / HOUR;

    // The furthest threshold this moment has passed, so a job that missed a
    // run sends the message that is due now rather than working through a
    // backlog of stale ones.
    let stage = -1;
    for (let i = 0; i < DUNNING_AT_HOURS.length; i++) {
      if (hoursSince >= DUNNING_AT_HOURS[i]) stage = i;
    }
    if (stage < 0) continue;
    if (s.dunning_stage !== null && s.dunning_stage >= stage) continue;

    const to = await operatorContact(s.businesses.owner_id, s.businesses.email);
    if (!to) continue;

    const t = await getTranslations({ locale: to.locale, namespace: 'reminders.dunning' });
    const endsOn = new Intl.DateTimeFormat(to.locale, { dateStyle: 'long' }).format(
      new Date(endsAt + GRACE_HOURS * HOUR),
    );

    // Stage 0 is a notice; the rest are chasers, and they say what is about to
    // be lost rather than repeating that something happened yesterday.
    const first = stage === 0;
    const ok = await send(to.email, t(first ? 'subjectExpired' : 'subjectChase'), {
      heading: t(first ? 'headingExpired' : 'headingChase'),
      paragraphs: [
        t(first ? 'bodyExpired' : 'bodyChase', { business: s.businesses.name, date: endsOn }),
        t('bodyWhatHappens'),
      ],
      action: { label: t('cta'), url: url('/dashboard/subscription', to.locale) },
      footnote: t('footnote'),
    });

    if (ok) {
      await admin.from('subscriptions').update({ dunning_stage: stage }).eq('id', s.id);
      sent++;
    }
  }
  return sent;
}

/** One pass of every reminder. Each kind fails on its own without stopping the rest. */
export async function runReminders(scope: ReminderScope = {}): Promise<ReminderReport> {
  const safe = async (name: string, fn: () => Promise<number>) => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[reminders] ${name} failed`, err);
      return 0;
    }
  };
  // A scoped (test) run touches only what it names: enquiry reminders need
  // lead ids, trial reminders need business ids, or that kind is skipped.
  const scoped = Boolean(scope.leadIds || scope.businessIds);
  const leadsOk = !scoped || Boolean(scope.leadIds);
  const trialsOk = !scoped || Boolean(scope.businessIds);
  return {
    nudge: leadsOk ? await safe('nudge', () => nudges(scope)) : 0,
    review: leadsOk ? await safe('review', () => reviewReminders(scope)) : 0,
    followUp: leadsOk ? await safe('followUp', () => followUps(scope)) : 0,
    trial: trialsOk ? await safe('trial', () => trialReminders(scope)) : 0,
    renewal: trialsOk ? await safe('renewal', () => renewalReminders(scope)) : 0,
    dunning: trialsOk ? await safe('dunning', () => dunningReminders(scope)) : 0,
  };
}
