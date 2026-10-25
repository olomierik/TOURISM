import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * `/_design` — the visual source of truth (design.md §0.7).
 *
 * Renders every token and, as the phases land, every component in every state.
 * Phase 0 scaffolds it with the token surfaces Phase 1 is about to change, so
 * the before and after are comparable on one screen.
 *
 * Three things about this file are deliberate and easy to get wrong:
 *
 * The folder is `%5Fdesign`, not `_design`. A folder whose name starts with an
 * underscore is *private* in the App Router — it opts itself and everything
 * under it out of routing entirely, so `app/_design/page.tsx` would produce no
 * route at all. `%5F` is Next's documented escape for a literal underscore in a
 * segment, and it resolves to `/_design` exactly as the spec asks.
 *
 * It sits outside `app/[locale]/` on purpose. Inside, next-intl would build it
 * four times over — `/de/_design`, `/fr/_design` — for a page with no user
 * content to translate. `_design` is also added to the proxy matcher so the
 * locale middleware leaves it alone.
 *
 * And it 404s in production. The spec says dev and preview only; `noindex`
 * alone would still serve it to anyone who guessed the URL.
 */
export const metadata: Metadata = {
  title: 'Design system · Explore Tanzania',
  robots: { index: false, follow: false },
};

/** Preview deployments set VERCEL_ENV=preview; local dev sets neither. */
const visible =
  process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

/**
 * Every semantic colour token, grouped the way §3.1 groups them.
 *
 * `--surface`, `--border-strong`, `--whatsapp` and the rest of §3.1 do not
 * exist yet; they are listed so Phase 1 can be checked by looking rather than
 * by grepping. A swatch for a token that is not defined renders transparent
 * against the checker behind it, which is the point.
 */
const TOKENS: Array<{ group: string; names: string[] }> = [
  {
    group: 'Surfaces',
    names: ['--background', '--surface', '--card', '--surface-muted', '--muted', '--surface-sunken', '--popover'],
  },
  {
    group: 'Text',
    names: ['--foreground', '--muted-foreground', '--subtle-foreground', '--card-foreground'],
  },
  {
    group: 'Lines',
    names: ['--border', '--border-strong', '--input', '--ring'],
  },
  {
    group: 'Primary',
    names: ['--primary', '--primary-hover', '--primary-subtle', '--primary-foreground'],
  },
  {
    group: 'Accent — §3 retires this from CTAs',
    names: ['--accent', '--accent-strong', '--accent-foreground'],
  },
  {
    group: 'Highlight / semantic',
    names: ['--highlight', '--highlight-foreground', '--whatsapp', '--success', '--warning', '--warning-strong', '--danger', '--destructive'],
  },
];

const TYPE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;
const RADII = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const SHADOWS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export default function DesignSystemPage() {
  if (!visible) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          design.md §0.7 · not indexed · dev and preview only
        </p>
        <h1 className="mt-2 text-3xl font-bold">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Phase 0 scaffold. A swatch that renders as the checkerboard below it is
          a token §3.1 asks for that does not exist yet.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Colour</h2>
        {TOKENS.map(({ group, names }) => (
          <div key={group} className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground">{group}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {names.map((name) => (
                <li key={name} className="rounded-xl border p-3">
                  {/* The checker shows through wherever the token is undefined,
                      so "missing" is visible rather than merely white-on-white. */}
                  <div
                    className="h-12 w-full rounded-lg border"
                    style={{
                      backgroundColor: `var(${name}, transparent)`,
                      backgroundImage:
                        'repeating-conic-gradient(oklch(0.8 0 0) 0% 25%, oklch(0.95 0 0) 0% 50%)',
                      backgroundSize: '12px 12px',
                      backgroundBlendMode: 'normal',
                    }}
                  />
                  <code className="mt-2 block text-[11px] leading-tight">{name}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Type scale</h2>
        <ul className="mt-4 divide-y">
          {TYPE_STEPS.map((step) => (
            <li key={step} className="flex flex-wrap items-baseline gap-x-6 py-3">
              <code className="w-20 shrink-0 text-xs text-muted-foreground">text-{step}</code>
              <span className={`text-${step}`}>Tanzania, planned properly</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Appendix B maps six current H1 treatments onto this scale.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Radius and elevation</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Radius</h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {RADII.map((r) => (
                <li key={r} className="text-center">
                  <div className={`size-16 border bg-muted rounded-${r}`} />
                  <code className="mt-1 block text-[11px]">{r}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Elevation</h3>
            <ul className="mt-3 flex flex-wrap gap-4">
              {SHADOWS.map((s) => (
                <li key={s} className="text-center">
                  <div className={`size-16 rounded-xl bg-card shadow-${s}`} />
                  <code className="mt-1 block text-[11px]">{s}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12 border-t pt-6">
        <h2 className="text-xl font-semibold">Components</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Added by Phase 2 (core controls) and Phase 4 (cards and media), each in
          every state §6 lists.
        </p>
      </section>
    </main>
  );
}
