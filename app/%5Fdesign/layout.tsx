import { Instrument_Serif, Manrope } from 'next/font/google';

import '../globals.css';

/**
 * The design page sits outside `app/[locale]/`, which is where this app's real
 * `<html>`, `<body>` and stylesheet import live — `app/layout.tsx` is a
 * pass-through that returns its children so the locale layout can own the
 * document. So without this file the page rendered with no CSS at all: every
 * button came out as a 21px browser default, which is exactly what the first
 * check of it showed.
 *
 * The fonts are loaded again here rather than shared, because `next/font`
 * returns a class name that has to be applied to an element in *this* tree.
 * Next deduplicates the underlying font files, so this costs nothing beyond
 * the two variable declarations.
 */
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans-src',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display-src',
  display: 'swap',
});

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
