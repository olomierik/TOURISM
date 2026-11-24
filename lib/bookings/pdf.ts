import 'server-only';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { formatMoney } from '@/lib/leads/quote-types';
import type { BookingDoc, BookingDocLabels, BookingParty } from '@/lib/bookings/types';

/**
 * The trip document: one A4 PDF per booking, made on the server from the
 * frozen booking row, so the traveller, the operator and admin all receive
 * the same file whenever they download it.
 *
 * pdf-lib with the standard Helvetica faces: no browser, no font files, runs
 * in a Netlify function. Those faces cover Western European text (the site's
 * English, German, French, Italian and Swahili); anything outside it is
 * reduced to its closest plain letter rather than failing the document.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = 46;
const BRAND = rgb(0.635, 0.29, 0.122);
const INK = rgb(0.12, 0.11, 0.1);
const MUTED = rgb(0.42, 0.4, 0.37);
const RULE = rgb(0.88, 0.85, 0.82);
const PANEL = rgb(0.98, 0.96, 0.94);

// The characters Helvetica's WinAnsi encoding can draw, beyond Latin-1.
const WIN_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

function plain(input: string | null | undefined): string {
  if (!input) return '';
  let out = '';
  for (const ch of input.normalize('NFC').replace(/→/g, '->').replace(/\t/g, ' ')) {
    const c = ch.codePointAt(0)!;
    if (ch === '\n' || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_EXTRA.has(ch)) {
      out += ch;
      continue;
    }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += [...base].every((b) => b.charCodeAt(0) < 0x7f) ? base : '?';
  }
  return out;
}

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];

  constructor(
    doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly footer: string,
  ) {
    this.doc = doc;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.y = A4.h - M;
  }

  /** Room for `h` more points on this page, or a new page. */
  need(h: number) {
    if (this.y - h < M + 28) this.newPage();
  }

  lines(text: string, size: number, font: PDFFont, width: number): string[] {
    const out: string[] = [];
    for (const para of plain(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) out.push(line);
        // A single word wider than the column is cut, not left to overflow.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
          let cut = rest.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      out.push(line);
    }
    return out;
  }

  text(
    text: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.regular;
    const x = opts.x ?? M;
    const width = opts.width ?? A4.w - M - x;
    const lh = size * 1.38;
    for (const l of this.lines(text, size, font, width)) {
      this.need(lh);
      this.page.drawText(l, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= lh;
    }
    this.y -= opts.gap ?? 0;
  }

  heading(text: string) {
    this.need(40);
    this.y -= 10;
    this.page.drawText(plain(text).toUpperCase(), { x: M, y: this.y - 10, size: 9.5, font: this.bold, color: BRAND });
    this.y -= 16;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.7, color: RULE });
    this.y -= 8;
  }

  /** Label and value on one row, the value wrapping under itself. */
  row(label: string, value: string | null | undefined, labelWidth = 120) {
    if (!value) return;
    const size = 10;
    const lines = this.lines(value, size, this.regular, A4.w - M * 2 - labelWidth);
    this.need(size * 1.4 * Math.max(1, lines.length));
    this.page.drawText(plain(label), { x: M, y: this.y - size, size: 9, font: this.bold, color: MUTED });
    for (const l of lines) {
      this.page.drawText(l, { x: M + labelWidth, y: this.y - size, size, font: this.regular, color: INK });
      this.y -= size * 1.4;
    }
    this.y -= 2;
  }

  finish(pageLabel: (n: number, total: number) => string) {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      p.drawLine({ start: { x: M, y: M + 18 }, end: { x: A4.w - M, y: M + 18 }, thickness: 0.5, color: RULE });
      const foot = this.lines(this.footer, 7.5, this.regular, A4.w - M * 2 - 70);
      foot.slice(0, 2).forEach((l, j) =>
        p.drawText(l, { x: M, y: M + 8 - j * 9.5, size: 7.5, font: this.regular, color: MUTED }),
      );
      const label = plain(pageLabel(i + 1, total));
      p.drawText(label, {
        x: A4.w - M - this.regular.widthOfTextAtSize(label, 7.5),
        y: M + 8,
        size: 7.5,
        font: this.regular,
        color: MUTED,
      });
    });
  }
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

export async function renderBookingPdf(booking: BookingDoc, L: BookingDocLabels): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${L.title} ${booking.reference}`);
  doc.setAuthor('Explore Tanzania');
  doc.setSubject(`${booking.operator.name} · ${booking.traveller.name}`);
  doc.setCreationDate(new Date(booking.bookedAt));
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, regular, bold, L.footer);

  const locale = booking.locale || 'en';
  const date = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
  };
  const q = booking.quote;
  const t = booking.trip;

  // Header band.
  const bandH = 92;
  w.page.drawRectangle({ x: 0, y: A4.h - bandH, width: A4.w, height: bandH, color: BRAND });
  w.page.drawText('Explore Tanzania', { x: M, y: A4.h - 34, size: 11, font: bold, color: rgb(1, 1, 1) });
  w.page.drawText(plain(L.title), { x: M, y: A4.h - 62, size: 22, font: bold, color: rgb(1, 1, 1) });
  w.page.drawText(plain(L.subtitle), { x: M, y: A4.h - 80, size: 9, font: regular, color: rgb(1, 0.93, 0.88) });
  const refText = plain(`${L.reference} ${booking.reference}`);
  w.page.drawText(refText, {
    x: A4.w - M - bold.widthOfTextAtSize(refText, 12),
    y: A4.h - 40,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const bookedText = plain(`${L.booked} ${date(booking.bookedAt)}`);
  w.page.drawText(bookedText, {
    x: A4.w - M - regular.widthOfTextAtSize(bookedText, 9),
    y: A4.h - 56,
    size: 9,
    font: regular,
    color: rgb(1, 0.93, 0.88),
  });
  const enquiryText = plain(`${L.enquiry} ${t.enquiryReference}`);
  w.page.drawText(enquiryText, {
    x: A4.w - M - regular.widthOfTextAtSize(enquiryText, 9),
    y: A4.h - 69,
    size: 9,
    font: regular,
    color: rgb(1, 0.93, 0.88),
  });
  w.y = A4.h - bandH - 18;

  if (booking.status === 'cancelled') w.text(L.cancelled, { size: 12, font: bold, color: rgb(0.7, 0.1, 0.1), gap: 6 });

  // The two parties, side by side.
  const colW = (A4.w - M * 2 - 20) / 2;
  const party = (p: BookingParty, title: string, x: number) => {
    const rows: Array<[string, string | null | undefined]> = [
      ['', p.legalName && p.legalName !== p.name ? p.legalName : null],
      [L.email, p.email],
      [L.phone, p.phone],
      [L.whatsapp, p.whatsapp && p.whatsapp !== p.phone ? p.whatsapp : null],
      [L.website, p.website],
      [L.address, p.address],
      [L.licence, p.licence],
    ];
    const lines: Array<{ text: string; bold?: boolean; muted?: boolean }> = [
      { text: title.toUpperCase(), bold: true, muted: true },
      { text: p.name, bold: true },
    ];
    for (const [k, v] of rows) {
      if (!v) continue;
      for (const l of w.lines(k ? `${k}: ${v}` : v, 9.5, regular, colW - 20)) lines.push({ text: l });
    }
    return { x, lines };
  };
  const left = party(booking.traveller, L.traveller, M);
  const right = party(booking.operator, L.operator, M + colW + 20);
  const boxH = Math.max(left.lines.length, right.lines.length) * 13.5 + 18;
  w.need(boxH + 10);
  for (const col of [left, right]) {
    w.page.drawRectangle({ x: col.x, y: w.y - boxH, width: colW, height: boxH, color: PANEL, borderColor: RULE, borderWidth: 0.6 });
    let yy = w.y - 18;
    for (const l of col.lines) {
      w.page.drawText(plain(l.text), {
        x: col.x + 10,
        y: yy,
        size: l.muted ? 8 : l.bold ? 11 : 9.5,
        font: l.bold ? bold : regular,
        color: l.muted ? BRAND : INK,
      });
      yy -= 13.5;
    }
  }
  w.y -= boxH + 6;

  // The trip.
  w.heading(L.tripTitle);
  w.row(L.destination, t.destination);
  const dates = [date(t.travelStart), date(t.travelEnd)].filter(Boolean).join(' – ');
  w.row(L.dates, dates || L.notGiven);
  const people = [
    t.adults ? `${L.adults}: ${t.adults}` : null,
    t.children ? `${L.children}: ${t.children}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  w.row(L.travellers, people || null);
  w.row(L.duration, q.durationDays ? `${q.durationDays} ${L.days}` : null);

  if (q.arrivalDate || q.arrivalPoint || q.arrivalDetails || q.departureDate || q.departurePoint) {
    w.heading(L.arrivalTitle);
    w.row(L.arrival, [date(q.arrivalDate), q.arrivalPoint, q.arrivalDetails].filter(Boolean).join(' · '));
    w.row(L.departure, [date(q.departureDate), q.departurePoint].filter(Boolean).join(' · '));
  }

  if (q.itinerary.length > 0) {
    w.heading(L.planTitle);
    for (const d of q.itinerary) {
      const route = [d.from, d.to].filter(Boolean).join(' -> ');
      w.need(40);
      w.text(`${L.day} ${d.day}${route ? `  ·  ${route}` : ''}`, { size: 10.5, font: bold });
      if (d.plan) w.text(d.plan, { size: 9.5, x: M + 12 });
      const extra = [d.overnight ? `${L.overnight}: ${d.overnight}` : null, d.meals ? `${L.meals}: ${d.meals}` : null]
        .filter(Boolean)
        .join('   ·   ');
      if (extra) w.text(extra, { size: 9, x: M + 12, color: MUTED });
      w.y -= 6;
    }
  }

  // The price.
  w.heading(L.priceTitle);
  const price = formatMoney(q.totalAmount, q.currency, locale);
  w.need(30);
  w.text(`${price}  ${q.priceBasis === 'per_person' ? L.perPerson : L.total}`, { size: 16, font: bold, gap: 4 });
  if (q.priceBasis === 'per_person' && t.adults) {
    const pax = (t.adults ?? 0) + (t.children ?? 0);
    if (pax > 1) w.text(`${pax} × ${price} = ${formatMoney(q.totalAmount * pax, q.currency, locale)}`, { size: 9.5, color: MUTED, gap: 4 });
  }
  w.row(L.includes, q.includes);
  w.row(L.excludes, q.excludes);
  w.row(L.notes, q.notes);
  w.row(L.validUntil, date(q.validUntil));

  w.finish((n, total) => fill(L.page, { n, total }));
  return doc.save();
}
