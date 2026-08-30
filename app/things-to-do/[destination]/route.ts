import { redirect, permanentRedirect } from 'next/navigation';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * /things-to-do/arusha, from the SEO blueprint's URL architecture.
 *
 * A redirect rather than a page, deliberately. /activities/arusha already
 * exists, is already titled "Things to do in Arusha", is already in the sitemap
 * and already targets that query — across 128 category x destination pages in
 * four languages. Building a second route over the same data would be the exact
 * thin duplicate the product brief rules out, and would split whatever ranking
 * the first one earns.
 *
 * So the blueprint's URLs resolve, and there is still one canonical page per
 * (thing, place). A 308 rather than a 302 because this is permanent: the
 * destination of these URLs is not going to change back.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ destination: string }> },
) {
  const { destination } = await params;

  // Only redirect to a page that exists. An unknown slug sent to
  // /activities/<slug> would render a 404 with a 308 in front of it, which is
  // a worse thing to hand a crawler than a plain 404 here.
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('destination_translations')
    .select('slug')
    .eq('slug', destination.toLowerCase())
    .eq('locale', 'en')
    .maybeSingle();

  if (!data) redirect('/destinations');

  permanentRedirect(`/activities/${data.slug}`);
}
