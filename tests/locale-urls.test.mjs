// Run with: npm test
//
// Locale URLs (SEO brief T2, 21 Nov 2026). Every language must have one
// path per page, and every Swahili URL Google still holds must land on the
// English page, not a 404. No database, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { englishPathForSwahili } from '../i18n/retired-swahili.ts';
import { locales, parkedLocales, pathnames } from '../i18n/routing.ts';
import { MONTH_SLUGS } from '../lib/months.ts';

test('Swahili is retired and not served', () => {
  assert.ok(parkedLocales.includes('sw'));
  assert.ok(!locales.includes('sw'));
  assert.deepEqual([...locales].sort(), ['de', 'en', 'fr', 'it']);
});

test('every Swahili URL shape maps to its English page', () => {
  const cases = {
    '': '/',
    '/': '/',
    '/vivutio': '/destinations',
    '/vifurushi': '/packages',
    '/vifurushi/spice-farm-tour-89c853': '/packages/spice-farm-tour-89c853',
    '/biashara/305-karafuu': '/business/305-karafuu',
    '/wanyamapori/lion': '/wildlife/lion',
    '/wakati-wa-kwenda/januari': '/when-to-go/january',
    '/wakati-wa-kwenda/desemba': '/when-to-go/december',
    '/marejesho': '/refunds',
    '/faragha': '/privacy',
    '/masharti': '/terms',
    '/masharti-waendeshaji': '/operator-terms',
    '/safari': '/safaris',
    '/hoteli/arusha': '/hotels/arusha',
    '/kukodi-gari/zanzibar': '/car-rental/zanzibar',
  };
  for (const [sw, en] of Object.entries(cases)) {
    assert.equal(englishPathForSwahili(sw), en, `/sw${sw}`);
  }
});

test('every route has a distinct, non-empty path in every served locale', () => {
  for (const [route, value] of Object.entries(pathnames)) {
    if (typeof value === 'string') continue;
    for (const locale of locales) {
      const path = value[locale];
      assert.ok(path && path.startsWith('/'), `${route} has no ${locale} path`);
      // No language suffixes or foreign words leaking into a path.
      assert.ok(!/-(de|fr|it|sw)(\/|$)/.test(path), `${route} ${locale}: ${path} carries a language suffix`);
    }
  }
  // Two routes sharing one path in a locale would make one of them unreachable.
  for (const locale of locales) {
    const seen = new Map();
    for (const [route, value] of Object.entries(pathnames)) {
      const path = typeof value === 'string' ? value : value[locale];
      assert.ok(!seen.has(path), `${locale}: ${route} and ${seen.get(path)} share ${path}`);
      seen.set(path, route);
    }
  }
});

test('month slugs are twelve and unique per locale', () => {
  for (const locale of locales) {
    const slugs = MONTH_SLUGS[locale];
    assert.equal(slugs.length, 12, locale);
    assert.equal(new Set(slugs).size, 12, locale);
  }
});
