import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Mail, MessageCircle, Phone } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { CONTACT_WINDOW_DAYS } from '@/lib/outreach/whatsapp-invite';
import { CONTACT_CLICKS_TRUSTED_FROM, trustedWindow } from '@/lib/analytics/trusted-from';
import { WhatsAppInviteButton } from '@/components/admin/whatsapp-invite-button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Travellers who tried', robots: { index: false, follow: false } };
}

type Params = { locale: Locale };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ROUTES = ['all', 'whatsapp', 'email'] as const;
type Route = (typeof ROUTES)[number];

/** Rows PostgREST returns per request; asking for more is silently capped. */
const PAGE = 1000;
/** A ceiling on the click scan, so a flood cannot make this page unbounded. */
const MAX_CLICK_PAGES = 30;
/** Ids per `in (...)` filter; keeps each request URL well under proxy limits. */
const ID_CHUNK = 100;

/**
 * Unclaimed operators, ranked by how many people opened WhatsApp to them.
 *
 * An operator who has never claimed their listing cannot see that travellers
 * are trying to reach them. That number is the best argument for claiming the
 * site has, and it is specific to each operator: "12 people opened a chat to
 * you from your listing" is a sentence they can check in their own WhatsApp.
 *
 * Which is why it must be true. Counting starts no earlier than
 * CONTACT_CLICKS_TRUSTED_FROM (8 Nov 2026): rows before it are mostly bots.
 * The first draft of this page skipped that floor and showed 805 taps across
 * 255 operators; the real count since the floor, on 15 November, was 1. Each
 * person counts once per listing (distinct visitor_hash), and the message
 * names the days really covered.
 *
 * Two routes, and the page says which one each operator is on:
 *
 *   email     an address on file and the first outreach email already sent.
 *             The monthly report goes by script (stage-contact-reports.mjs,
 *             then send-contact-reports.mjs --confirm); this page shows
 *             whether it went.
 *   whatsapp  no address, or never introduced by email. 182 of the 255. The
 *             invite button writes the message with this operator's own
 *             count, and an admin sends it from their own WhatsApp, one at a
 *             time — what WhatsApp's terms allow, and what gets read.
 *
 * Counts are chats opened, not messages sent: WhatsApp opens with a written
 * message and only the operator sees whether it was sent.
 *
 * The clicks are counted here rather than in SQL because the admin reads
 * through RLS and there is no aggregate view; they are paged explicitly,
 * because an unpaginated select stops at 1,000 rows without saying so — the
 * bug that once hid a 358-listing backlog on the page next door.
 */
export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const asked = Array.isArray(sp.route) ? sp.route[0] : sp.route;
  const route: Route = (ROUTES as readonly string[]).includes(asked ?? '') ? (asked as Route) : 'all';

  const supabase = await createClient();
  const span = trustedWindow(CONTACT_WINDOW_DAYS);
  const since = span.since.toISOString();
  const period = new Date().toISOString().slice(0, 7);

  // 1. Every chat in the window, a page at a time, ordered so pages never
  //    overlap; each person counted once per listing.
  const people = new Map<string, Set<string>>();
  let scanned = 0;
  for (let p = 0; p < MAX_CLICK_PAGES; p++) {
    const { data, error } = await supabase
      .from('contact_clicks')
      .select('id, business_id, visitor_hash')
      .gte('created_at', since)
      .order('id')
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !data) break;
    for (const c of data) {
      const set = people.get(c.business_id) ?? new Set<string>();
      set.add(c.visitor_hash);
      people.set(c.business_id, set);
    }
    scanned += data.length;
    if (data.length < PAGE) break;
  }
  const truncated = scanned >= PAGE * MAX_CLICK_PAGES;
  const counts = new Map([...people].map(([id, set]) => [id, set.size]));

  const ids = [...counts.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK));

  // 2. Who those operators are, what email has already told them, and when an
  //    admin last opened a WhatsApp invite. One round per chunk, all in parallel.
  const per = await Promise.all(
    chunks.map(async (chunk) => {
      const [biz, intro, invites, reports] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, slug, name, email, phone, whatsapp, country_code, city')
          .in('id', chunk)
          .eq('status', 'approved')
          .is('deleted_at', null)
          .is('owner_id', null),
        supabase.from('operator_outreach').select('business_id, status, sent_at').in('business_id', chunk),
        supabase
          .from('audit_logs')
          .select('entity_id, created_at')
          .eq('action', 'business.whatsapp_invite_opened')
          .in('entity_id', chunk)
          .order('created_at', { ascending: false }),
        // Absent until migration 092 is applied; an error here just means "none yet".
        supabase
          .from('operator_contact_reports')
          .select('business_id, status, sent_at')
          .eq('period', period)
          .in('business_id', chunk),
      ]);
      return {
        biz: biz.data ?? [],
        intro: intro.data ?? [],
        invites: invites.data ?? [],
        reports: reports.error ? [] : (reports.data ?? []),
      };
    }),
  );

  const introBy = new Map<string, { status: string; sent_at: string | null }>();
  const inviteBy = new Map<string, string>();
  const reportBy = new Map<string, { status: string; sent_at: string | null }>();
  for (const p of per) {
    for (const o of p.intro) introBy.set(o.business_id, o);
    // Newest first, so the first one seen per business is the latest.
    for (const a of p.invites) if (a.entity_id && !inviteBy.has(a.entity_id)) inviteBy.set(a.entity_id, a.created_at);
    for (const r of p.reports) reportBy.set(r.business_id, r);
  }

  const rows: Row[] = per
    .flatMap((p) => p.biz)
    .map((b) => {
      const intro = introBy.get(b.id);
      const hasEmail = Boolean(b.email && b.email.trim());
      const introduced = intro?.status === 'sent';
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        email: hasEmail ? b.email : null,
        phone: b.phone,
        whatsapp: b.whatsapp,
        countryCode: b.country_code,
        city: b.city,
        contacts: counts.get(b.id) ?? 0,
        route: hasEmail && introduced ? 'email' : 'whatsapp',
        introducedAt: introduced ? intro?.sent_at ?? null : null,
        introStatus: intro?.status ?? null,
        lastInvitedAt: inviteBy.get(b.id) ?? null,
        report: reportBy.get(b.id) ?? null,
      } satisfies Row;
    })
    .sort((a, b) => b.contacts - a.contacts || a.name.localeCompare(b.name));

  const tally = {
    all: rows.length,
    whatsapp: rows.filter((r) => r.route === 'whatsapp').length,
    email: rows.filter((r) => r.route === 'email').length,
  };
  const contactsTotal = rows.reduce((s, r) => s + r.contacts, 0);
  const invitedCount = rows.filter((r) => r.route === 'whatsapp' && r.lastInvitedAt).length;
  const reportedCount = rows.filter((r) => r.report?.status === 'sent').length;
  const shown = route === 'all' ? rows : rows.filter((r) => r.route === route);

  const TABS: { key: Route; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'Email report' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-xl">Travellers who tried</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Unclaimed listings that people opened a WhatsApp chat to since{' '}
          {since.slice(0, 10)} ({span.days} days), most first. Each operator&rsquo;s own
          number goes into the message they get, so they can check it in their own chats.
          Chats before {CONTACT_CLICKS_FLOOR} are not counted: most were bots.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Operators" value={rows.length} />
        <Stat label="People who opened a chat" value={contactsTotal} />
        <Stat label="Invited on WhatsApp" value={`${invitedCount} of ${tally.whatsapp}`} />
        <Stat label={`Email reports sent (${period})`} value={`${reportedCount} of ${tally.email}`} />
      </dl>

      {truncated && (
        <p className="rounded-lg border border-[var(--warning-800)]/30 bg-[var(--warning-50)] p-4 text-body-sm text-[var(--warning-800)]">
          Counted the first {scanned.toLocaleString('en')} chats only. The totals here are a floor.
        </p>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Filter by route">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={{ pathname: '/admin/outreach/contacts', query: t.key === 'all' ? {} : { route: t.key } }}
            aria-current={t.key === route ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-pill px-4 text-body-sm font-semibold',
              t.key === route
                ? 'bg-primary text-primary-foreground'
                : 'border-control bg-surface text-foreground hover:bg-secondary',
            )}
          >
            {t.label}
            <span className="tabular-nums opacity-70">{tally[t.key]}</span>
          </Link>
        ))}
      </nav>

      <p className="text-body-sm text-muted-foreground">
        {route === 'email'
          ? 'Already introduced by email. The monthly report goes by script: stage-contact-reports.mjs, then send-contact-reports.mjs --confirm.'
          : route === 'whatsapp'
            ? 'No email address, or never introduced by email. Send each invite from your own WhatsApp; the message already states their count.'
            : 'Counts are chats opened, not messages sent. Only the operator can see whether the traveller pressed send.'}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-lg border bg-surface p-8 text-center text-body text-muted-foreground">
          Nobody has opened a WhatsApp chat to an unclaimed listing in this group since{' '}
          {since.slice(0, 10)}. The number grows with traffic: it counts real visitors only.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {shown.map((row) => (
            <ContactRow key={row.id} row={row} days={span.days} />
          ))}
        </ul>
      )}
    </div>
  );
}

type Row = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  countryCode: string | null;
  city: string | null;
  contacts: number;
  route: 'email' | 'whatsapp';
  introducedAt: string | null;
  introStatus: string | null;
  lastInvitedAt: string | null;
  report: { status: string; sent_at: string | null } | null;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-heading-md tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('en') : value}
      </dd>
    </div>
  );
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
const CONTACT_CLICKS_FLOOR = CONTACT_CLICKS_TRUSTED_FROM.toISOString().slice(0, 10);

function ContactRow({ row, days }: { row: Row; days: number }) {
  const emailState = row.report
    ? row.report.status === 'sent'
      ? `Report sent ${day(row.report.sent_at)}`
      : `Report ${row.report.status}`
    : row.route === 'email'
      ? `Introduced ${day(row.introducedAt)}; no report yet this month`
      : row.email
        ? row.introStatus
          ? `First email ${row.introStatus}; not introduced yet`
          : 'Has an address; first email not sent yet'
        : null;

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
      <div
        className="w-14 shrink-0 text-center"
        aria-label={`${row.contacts} ${row.contacts === 1 ? 'person' : 'people'} opened a chat`}
      >
        <span className="block font-display text-heading-md tabular-nums leading-none">{row.contacts}</span>
        <span className="mt-1 block text-caption text-muted-foreground">
          {row.contacts === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <a
            href={`/business/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-body font-semibold hover:text-primary"
          >
            {row.name}
          </a>
          {row.countryCode && row.countryCode !== 'TZ' && <Badge variant="listed">{row.countryCode}</Badge>}
          <Badge variant={row.route === 'email' ? 'secondary' : 'listed'} className="gap-1">
            {row.route === 'email' ? (
              <Mail className="size-3" aria-hidden />
            ) : (
              <MessageCircle className="size-3" aria-hidden />
            )}
            {row.route === 'email' ? 'Email' : 'WhatsApp'}
          </Badge>
        </p>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          {row.city && <span>{row.city}</span>}
          {row.email && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{row.email}</span>
            </span>
          )}
          {row.phone && (
            <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Phone className="size-3.5" aria-hidden />
              {row.phone}
            </a>
          )}
        </p>

        {emailState && <p className="mt-1 text-body-sm text-muted-foreground">{emailState}</p>}
      </div>

      <WhatsAppInviteButton
        business={{
          id: row.id,
          name: row.name,
          slug: row.slug,
          whatsapp: row.whatsapp,
          phone: row.phone,
          countryCode: row.countryCode,
        }}
        count={{ contacts: row.contacts, days }}
        lastInvitedAt={row.lastInvitedAt}
      />
    </li>
  );
}
