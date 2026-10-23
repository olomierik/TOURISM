# Advertising (Google AdSense)

The site is ready for AdSense: it can be approved now and show ads whenever you switch them on.

## Already in place

- **Publisher ID:** `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (`ca-pub-…`) is set in Netlify.
- **`/ads.txt`:** lists Google as the authorised seller, built from that ID.
- **Ownership tag:** every page carries `<meta name="google-adsense-account">`, which AdSense uses to verify the site.
- **Privacy policy (`/privacy`):** includes AdSense's required wording about advertising cookies and how to opt out.
- **Ads are off:** `NEXT_PUBLIC_ADS_ENABLED` is not set, so no ad code loads.

## 1. Get the site approved (AdSense dashboard)

1. **Sites → Add site:** enter `exploretanzania.online` and choose the meta tag to verify. The tag is already on every page.
2. **Request review.** Google checks:
   - original, useful content (the guides and destination pages);
   - a privacy policy, clear navigation, and about and contact pages;
   - no empty or broken pages.

   Review usually takes a few days to a few weeks. There is no minimum traffic.

## 2. Before switching ads on

1. **Consent message (required for the EEA, the UK and Switzerland):** Privacy & messaging → European regulations → create and publish the message. This is Google's own certified consent tool, and the ad code shows it automatically. Without it, visitors there get limited ads only.
2. **Ad units:** Ads → By ad unit → Display ads. Create one per placement and copy each unit's ID (the number in `data-ad-slot`).

## 3. Switch ads on (Netlify → regal-crisp-bd37c7 → Environment variables, production)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_ADSENSE_SLOT_GUIDE` | unit ID for travel guides |
| `NEXT_PUBLIC_ADSENSE_SLOT_DESTINATION` | unit ID for destination pages |
| `NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY` | unit ID for the directory results |
| `NEXT_PUBLIC_ADS_ENABLED` | `true` |

Then trigger a deploy. A placement without a unit ID stays empty, so you can switch them on one at a time.

**Auto ads** (Ads → By site → Auto ads) also work once `NEXT_PUBLIC_ADS_ENABLED=true`, because the ad code then loads on every page.

To turn ads off again, remove `NEXT_PUBLIC_ADS_ENABLED` and redeploy.

## Where ads appear, and where they never do

- **Shown:**
  - travel guides, between the introduction and the article;
  - destination pages, below the packages;
  - the directory, one full-width ad after the eighth result.
- **Never:**
  - business profiles;
  - package pages;
  - the quote form.

  There, the visitor is choosing whom to contact. An enquiry is worth $20–200 to an operator, and an ad click is worth cents and could send them to someone else. If you use Auto ads, exclude these pages in AdSense: Auto ads → Page exclusions, `/business/*`, `/packages/*` and `/request-quote`.

Every ad keeps its space reserved before it loads, so the page doesn't jump, and is labelled as an advertisement.
