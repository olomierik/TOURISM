/**
 * Splits an operator's free-text itinerary into days.
 *
 * Operators write the itinerary as one text field. Measured on the nine
 * published tours, 14 November 2026: every one marks its days the same way —
 * "Day 1: Arrival in Nairobi", "Day 1 - Amboseli", "Day 1: Marangu Gate –
 * Mandara Hut" — with the day's description on the lines beneath. That is
 * enough structure to show a day-by-day timeline, which is how SafariBookings
 * presents a tour, without asking 9 operators to re-enter 9 itineraries.
 *
 * Deliberately forgiving and deliberately literal:
 *   - a heading is a line that starts with "Day" and a number, followed by
 *     ":" "-" "–" "—" or "." and a title (the title may be empty);
 *   - "Day 3-4" ranges are kept as written rather than split;
 *   - anything before the first heading is the introduction;
 *   - text is never rewritten, only divided. If no line looks like a day
 *     heading, `days` is empty and the caller shows the text as written.
 */

export type ItineraryDay = {
  /** As the operator wrote it: "1", "3-4". */
  label: string;
  title: string;
  /** Paragraphs, in order, with bullet characters stripped from the start. */
  body: string[];
};

export type ParsedItinerary = {
  intro: string[];
  days: ItineraryDay[];
};

const HEADING = /^\s*(?:[•*\-–]\s*)?day\s+(\d+(?:\s*[-–&]\s*\d+)?)\s*(?:[:.\-–—)]\s*(.*))?$/i;

const paragraphs = (lines: string[]) =>
  lines
    .map((l) => l.replace(/^\s*[•*▪◦\-–]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

export function parseItinerary(text: string | null | undefined): ParsedItinerary {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const intro: string[] = [];
  const days: ItineraryDay[] = [];
  let current: { label: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(HEADING);
    if (m) {
      if (current) days.push({ label: current.label, title: current.title, body: paragraphs(current.lines) });
      current = {
        label: m[1].replace(/\s+/g, ''),
        title: (m[2] ?? '').replace(/\s+/g, ' ').trim(),
        lines: [],
      };
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) days.push({ label: current.label, title: current.title, body: paragraphs(current.lines) });

  // Some operators write the whole day on the heading line — "Day 1: Get
  // ready as your adventure begins! You will be picked up by…" with nothing
  // beneath. Shown as a heading that is a paragraph long. A long title with
  // no body is the day's description, and the day goes untitled.
  for (const d of days) {
    if (d.body.length === 0 && d.title.length > 70) {
      d.body = [d.title];
      d.title = '';
    }
  }

  return { intro: paragraphs(intro), days };
}

/**
 * Puts a tour's stops in the order the itinerary visits them.
 *
 * Operators pick a tour's destinations from a list of checkboxes, and the
 * saved order is the order they ticked them — the 7-day Northern Circuit tour
 * is stored Serengeti, Ngorongoro, Tarangire, Manyara, which is the route
 * backwards. The itinerary text is the operator's own statement of the
 * sequence, so each stop is placed by where the text first names it.
 *
 * Matching is by the place's name and its distinctive part ("Samburu" for
 * "Samburu National Reserve", "Ol Pejeta" for "Laikipia and Ol Pejeta"),
 * with Maasai/Masai treated as one spelling. A stop the text never names keeps
 * its saved position after the ones it does. Fewer than two stops found, and
 * the saved order is returned untouched: one match is not a sequence.
 */
const GENERIC =
  /\b(national park|national reserve|game reserve|conservation area|conservancy|crater|island|islands|mount|mt|lake|park|reserve)\b/gi;
const norm = (s: string) => s.toLowerCase().replace(/maasai/g, 'masai');

function keysFor(name: string): string[] {
  const keys = new Set<string>([norm(name)]);
  for (const part of name.split(/\s+and\s+|\s*&\s*|,\s*/i)) {
    const stripped = part.replace(GENERIC, '').replace(/\s+/g, ' ').trim();
    if (stripped.length >= 4) keys.add(norm(stripped));
    if (part.trim().length >= 4) keys.add(norm(part.trim()));
  }
  return [...keys];
}

export function orderByItinerary<T extends { name: string }>(stops: T[], text: string | null | undefined): T[] {
  const hay = norm(text ?? '');
  if (!hay || stops.length < 2) return stops;

  const placed = stops.map((stop, saved) => {
    const at = keysFor(stop.name)
      .map((k) => hay.indexOf(k))
      .filter((i) => i >= 0);
    return { stop, saved, at: at.length ? Math.min(...at) : Infinity };
  });

  if (placed.filter((p) => p.at !== Infinity).length < 2) return stops;

  return placed
    .sort((a, b) => (a.at === b.at ? a.saved - b.saved : a.at - b.at))
    .map((p) => p.stop);
}
