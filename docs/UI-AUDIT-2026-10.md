# UI/UX audit (2026-10-24)

How it was checked: every route below loaded in a same-origin iframe of exactly 1440, 1024, 768, 390 and
320 px inside Chrome on the live site, and measured by script. The script checked:

- horizontal overflow, and elements past the viewport;
- form-control heights;
- placeholders wider than their control;
- button labels overflowing;
- touch targets under 32 px on phones;
- empty space below a card's content;
- clipped text.

That is 17 routes × 5 widths = 85 page loads. Then a visual pass with screenshots at 1440 and 390 px of
the home page, directory, business page, enquiry form and the operator dashboard.

Routes measured: `/`, `/directory`, `/destinations`, `/destinations/serengeti-national-park`, `/guides`,
`/request-quote`, `/login`, `/register`, `/trip-cost`, `/when-to-go`, `/events`, `/hidden-gems`,
`/search?q=safari`, `/business/prime-auditors`, `/near-me`, `/packages`, `/compare`.

**What was already sound.** None of the 85 loads overflowed sideways.

- The design tokens are mature (`app/globals.css`):
  - a type scale from 12 to 48 px;
  - radii;
  - an ink-tinted shadow ramp with a dark-mode variant;
  - section rhythm;
  - a 1280 px container with 20/32 px gutters;
  - focus rings;
  - reduced-motion handling.
- Shared inputs and selects are 44 px, `w-full`, border-box, with a chevron that has its own padding.
- Destination, guide, package and event cards use fixed aspect ratios and line clamps, with no fixed
  heights.

## Problems, by priority

### P1: costs travellers results or space
1. **Directory filters pinned on phones.** `components/directory/filters.tsx`: the filter bar is sticky
   at every width. On a phone it is three rows of selects plus a checkbox row, about 230 px stuck to the
   top of an 812 px screen while scrolling results. It sits under a search card that already asks
   category and location, so the first listing starts about 650 px down.
2. **Business page: empty half-page beside the contact card.** `app/[locale]/business/[slug]/page.tsx`:
   - the sticky contact card shares a grid row with only About, Services and Destinations;
   - for most listings that is a few lines, so about 340 px of the left column stays blank (measured on
     `/business/erick-safaris`);
   - the Photos section then runs full width at 16:9, one image about 700 px tall.
3. **Search bar placeholder clipped at every width.** `components/home/discovery-search.tsx`, home and
   directory:
   - "Hotels, safaris, car hire, tour guides…" needs 242 px and gets 208 (desktop), 139 (768) or 237
     (phone);
   - on phones the search button is a 48 px circle at the bottom-left of the stacked card, the one
     unlabelled action on the page.

### P2: inconsistency
4. **Buttons 40 px beside 44 px inputs.**
   - The default button was `h-10`, every input and select `h-11`.
   - In the directory bar "Show results" sat 4 px short of the selects beside it.
   - The business header paired a 40 px "Share" with a 48 px "Save to favourites".
5. **Dashboard quote form** (`components/dashboard/quote-form.tsx`): its currency and price-basis
   selects are hand-rolled `h-10 rounded-md` with no chevron, unlike every other select.
6. **Business cards repeat the location.** On listings without a photo, which is most of them, the
   placeholder art prints the place, and the line under it prints the same place again.
7. **Search-page placeholder clipped on phones.** "Try “Ruaha”, “gorilla permit” or “Sauti za Busara”"
   is cut at 390 and 320 px.

### P3: small
8. Hero trip-planner popover is `calc(100vw - 2rem)` wide from a 20 px offset, so it overshoots by the
   scrollbar's width where scrollbars take space.
9. Photo-carousel dots are 24 × 24 px tap targets on phones.
10. Enquiry page trust line: when the text wraps on a phone, the shield icon stays at the far left of a
    centred paragraph.

### Checked and left alone
- **Cards share their row height in grids, with the footer pinned to the bottom.** That is the
  marketplace pattern the cards were designed for (aligned rating and price rows), not dead space. The
  measured gaps of 40–60 px are what a card without a rating or price shows beside one that has them.
- **Destination cards.** Text over the photograph is positioned absolutely, so the script reported
  "empty space"; it isn't.
