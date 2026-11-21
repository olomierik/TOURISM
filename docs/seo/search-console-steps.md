# Search Console and Bing: steps for Erick

SEO brief section 5. These need your own Google and Microsoft sign-ins, so they're yours to do. Do them after each phase is live.

## After Phase 1 (live since PR #144)

1. Open Search Console and choose the **Domain property** `exploretanzania.online` (the www property was removed on 14 Nov).
2. **Sitemaps:** resubmit `https://exploretanzania.online/sitemap.xml`. It now lists only indexable pages: combinations with at least 5 listings, no Swahili, and no German, French or Italian tour pages that don't exist.
3. **Pages report:** open each of these and click **Validate fix**:
   - Not found (404)
   - Excluded by "noindex" tag
   - Duplicate, Google chose different canonical than user

   Validation takes days to weeks. The 404s should clear because German, French and Italian tour URLs now redirect to English, and Swahili URLs redirect to their English pages.
4. **URL inspection:** spot-check one tour page and one month page (for example `/when-to-go/january`). The "Alternate page with proper canonical tag" entries should list only real pages.

## After Phase 2 (PR #145, once merged and the drafts are published)

5. Resubmit the sitemap. It gains a `blog` section once posts are published.
6. Run one URL of each type through the Rich Results Test (https://search.google.com/test/rich-results):
   - a tour (TouristTrip and Offer)
   - a listing (TravelAgency or LodgingBusiness)
   - a guide or post (Article, with an author)

## Bing

7. In Bing Webmaster Tools (https://www.bing.com/webmasters), choose **Import from Google Search Console**. It brings the site and its sitemap across in one step.

## Monthly

8. Search Console → **Links**: count the external linking sites. The brief's targets are 15 by February 2027 and 60 within a year. `/admin/badges` shows which operator sites carry the badge.
9. Search Console → **Performance**: compare average position (48.6 on 21 Nov) and CTR (0.5%) against the targets in the brief: 35 and 1.5% at three months.

## Every pull request

The **SEO audit** check (GitHub Actions) crawls a sample of the preview. It fails on broken hreflang, foreign canonicals, non-200 pages or missing H1s. To run it by hand:

```bash
node scripts/seo-audit.mjs --base=https://deploy-preview-<PR>--regal-crisp-bd37c7.netlify.app
```
