import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LANDING_PAGES, FOOTER_LANDING_SLUGS } from '../lib/landing/index.ts';

const slugs = new Set(LANDING_PAGES.map((p) => p.slug));

test('landing slugs are unique and URL-safe', () => {
  assert.equal(slugs.size, LANDING_PAGES.length);
  for (const p of LANDING_PAGES) assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, p.slug);
});

test('every related and footer link points at a page that exists', () => {
  for (const p of LANDING_PAGES) {
    for (const r of p.related) assert.ok(slugs.has(r), `${p.slug} -> ${r}`);
    assert.ok(!p.related.includes(p.slug), `${p.slug} links to itself`);
  }
  for (const s of FOOTER_LANDING_SLUGS) assert.ok(slugs.has(s), s);
});

test('titles and descriptions fit a search result', () => {
  for (const p of LANDING_PAGES) {
    const longest = Math.max(p.metaTitle.replace('{count}', '1,000').length, p.metaTitleFallback.length);
    assert.ok(longest <= 70, `${p.slug} title is ${longest} chars`);
    assert.ok(p.metaDescription.length >= 90 && p.metaDescription.length <= 170, `${p.slug} description is ${p.metaDescription.length} chars`);
  }
});

test('no two pages share a title or description', () => {
  const titles = new Set(LANDING_PAGES.map((p) => p.metaTitleFallback));
  const descs = new Set(LANDING_PAGES.map((p) => p.metaDescription));
  assert.equal(titles.size, LANDING_PAGES.length);
  assert.equal(descs.size, LANDING_PAGES.length);
});

test('extra content only names pages that exist', async () => {
  const { LANDING_EXTRA } = await import('../lib/landing/extra.ts');
  for (const k of Object.keys(LANDING_EXTRA)) assert.ok(slugs.has(k), k);
});

test('every page has enough of its own words and an FAQ', () => {
  for (const p of LANDING_PAGES) {
    const words = [
      ...p.intro,
      ...p.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
      ...p.faqs.flatMap((f) => [f.q, f.a]),
    ].join(' ').split(/\s+/).length;
    assert.ok(words >= 200, `${p.slug} has ${words} words`);
    assert.ok(p.faqs.length >= 1, p.slug);
  }
});
