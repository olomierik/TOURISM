-- ===========================================================================
-- 044 — Real prices for this market
--
-- Premium was $490 a year and Featured $1,490. Those were placeholders carried
-- from a monthly model ($49 and $149 × ten months), and they were priced for a
-- market this site does not serve. A Tanzanian tour operator with four vehicles
-- does not spend $1,490 a year on a directory listing, and a price nobody will
-- pay is the same as having no paid tier at all.
--
-- Premium $50, Featured $75. Both annual.
--
-- The monthly figures go with them. Nothing bills monthly any more, and a
-- price_monthly of 49 sitting beside a price_yearly of 50 would make the
-- "billed annually, month-to-month would be…" line on the subscription card
-- claim a saving of $538 that does not exist. Set to a twelfth of the annual
-- price so the comparison, if it is ever shown again, is honest.
--
-- Existing subscriptions are untouched. Nobody is on a paid plan yet, but the
-- rule holds regardless: changing a plan's price must not silently reprice
-- somebody's current period.
-- ===========================================================================

update subscription_plans
   set price_yearly  = 50.00,
       price_monthly = round(50.00 / 12, 2)
 where key = 'premium';

update subscription_plans
   set price_yearly  = 75.00,
       price_monthly = round(75.00 / 12, 2)
 where key = 'featured';

-- The free tier stays free, and this states it rather than assuming it.
update subscription_plans
   set price_yearly = 0, price_monthly = 0
 where key = 'free';
