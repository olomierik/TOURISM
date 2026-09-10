import type { BusinessCard } from '@/lib/queries/businesses';
import { CURATED_BUSINESSES } from '@/lib/queries/curated-fallbacks';

/**
 * Google Maps Platform Integration for East Africa Business Listings.
 * Supports Tanzania (TZ), Kenya (KE), Uganda (UG), and Rwanda (RW).
 *
 * Grounded on the Google Maps Platform Places API (New).
 * In accordance with GMP guidelines, requests carry internal usage attribution ID:
 * `gmp_mcp_codeassist_v1_aistudio`
 */

export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export type GooglePlaceLocation = {
  latitude: number;
  longitude: number;
};

export type GooglePlacePhoto = {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
};

export type GooglePlaceItem = {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: GooglePlaceLocation;
  rating?: number;
  userRatingCount?: number;
  photos?: GooglePlacePhoto[];
  googleMapsUri?: string;
  websiteUri?: string;
  primaryType?: string;
  editorialSummary?: { text: string };
};

export type ClassifiedBusiness = BusinessCard & {
  googlePlaceId?: string;
  googleMapsUri?: string;
  categoryKey?: 'safaris' | 'lodges' | 'trekking' | 'beach' | 'cultural' | 'transport';
};

/**
 * Map Google Places primary types to Explore Tanzania / East Africa category slugs
 */
export function mapPlaceTypeToCategory(primaryType?: string): {
  id: string;
  slug: string;
  name: string;
  key: 'safaris' | 'lodges' | 'trekking' | 'beach' | 'cultural' | 'transport';
} {
  const type = (primaryType || '').toLowerCase();
  if (type.includes('lodging') || type.includes('hotel') || type.includes('campground') || type.includes('bed_and_breakfast') || type.includes('resort')) {
    return { id: 'cat-lodges', slug: 'lodges', name: 'Hotels & Safari Lodges', key: 'lodges' };
  }
  if (type.includes('hiking') || type.includes('mountain') || type.includes('trail')) {
    return { id: 'cat-trekking', slug: 'trekking', name: 'Trekking & Hiking', key: 'trekking' };
  }
  if (type.includes('beach') || type.includes('marina') || type.includes('aquarium') || type.includes('boat')) {
    return { id: 'cat-beach', slug: 'beach', name: 'Beach & Watersports', key: 'beach' };
  }
  if (type.includes('museum') || type.includes('cultural') || type.includes('church') || type.includes('mosque') || type.includes('historical')) {
    return { id: 'cat-cultural', slug: 'cultural', name: 'Cultural Tours', key: 'cultural' };
  }
  if (type.includes('travel_agency') || type.includes('tour_agency') || type.includes('car_rental') || type.includes('airport') || type.includes('transportation')) {
    return { id: 'cat-transport', slug: 'transport', name: 'Transport & 4x4 Hire', key: 'transport' };
  }
  return { id: 'cat-safaris', slug: 'safaris', name: 'Tours & Safaris', key: 'safaris' };
}

/**
 * Detect country and region from formatted address or place context
 */
export function detectLocationDetails(
  address?: string,
  countryHint?: string,
): { countryCode: 'TZ' | 'KE' | 'UG' | 'RW'; countryName: string; region: string; city: string } {
  const addr = (address || '').toLowerCase();
  const hint = (countryHint || '').toUpperCase();

  let countryCode: 'TZ' | 'KE' | 'UG' | 'RW' = 'TZ';
  if (hint === 'KE' || addr.includes('kenya') || addr.includes('nairobi') || addr.includes('mombasa') || addr.includes('masai mara') || addr.includes('diani')) {
    countryCode = 'KE';
  } else if (hint === 'UG' || addr.includes('uganda') || addr.includes('kampala') || addr.includes('entebbe') || addr.includes('bwindi') || addr.includes('jinja')) {
    countryCode = 'UG';
  } else if (hint === 'RW' || addr.includes('rwanda') || addr.includes('kigali') || addr.includes('musanze') || addr.includes('rubavu') || addr.includes('volcanoes')) {
    countryCode = 'RW';
  } else {
    countryCode = 'TZ';
  }

  const countryNames = {
    TZ: 'Tanzania',
    KE: 'Kenya',
    UG: 'Uganda',
    RW: 'Rwanda',
  };

  let region = 'Arusha Region';
  let city = 'Arusha';

  if (countryCode === 'KE') {
    if (addr.includes('nairobi')) {
      region = 'Nairobi';
      city = 'Nairobi';
    } else if (addr.includes('mara') || addr.includes('narok')) {
      region = 'Narok (Masai Mara)';
      city = 'Talek';
    } else if (addr.includes('diani') || addr.includes('mombasa') || addr.includes('coast')) {
      region = 'Mombasa & Coast (Diani)';
      city = 'Diani Beach';
    } else if (addr.includes('amboseli') || addr.includes('kajiado')) {
      region = 'Kajiado (Amboseli)';
      city = 'Amboseli';
    } else {
      region = 'Nairobi';
      city = 'Nairobi';
    }
  } else if (countryCode === 'UG') {
    if (addr.includes('bwindi') || addr.includes('buhoma') || addr.includes('kisoro') || addr.includes('kigezi')) {
      region = 'Kigezi (Bwindi Impenetrable)';
      city = 'Buhoma';
    } else if (addr.includes('jinja') || addr.includes('nile')) {
      region = 'Eastern (Jinja & Nile)';
      city = 'Jinja';
    } else if (addr.includes('entebbe')) {
      region = 'Central (Kampala & Entebbe)';
      city = 'Entebbe';
    } else {
      region = 'Central (Kampala & Entebbe)';
      city = 'Kampala';
    }
  } else if (countryCode === 'RW') {
    if (addr.includes('musanze') || addr.includes('volcanoes') || addr.includes('kinigi')) {
      region = 'Northern Province (Musanze / Volcanoes)';
      city = 'Musanze';
    } else if (addr.includes('rubavu') || addr.includes('gisenyi') || addr.includes('kivu')) {
      region = 'Western Province (Lake Kivu / Rubavu)';
      city = 'Rubavu';
    } else if (addr.includes('nyungwe')) {
      region = 'Southern Province (Nyungwe Forest)';
      city = 'Nyungwe';
    } else {
      region = 'Kigali City';
      city = 'Kigali';
    }
  } else {
    if (addr.includes('zanzibar') || addr.includes('stone town') || addr.includes('nungwi')) {
      region = 'Zanzibar Urban/West';
      city = 'Stone Town';
    } else if (addr.includes('moshi') || addr.includes('kilimanjaro')) {
      region = 'Kilimanjaro Region';
      city = 'Moshi';
    } else if (addr.includes('dar es salaam')) {
      region = 'Dar es Salaam';
      city = 'Dar es Salaam';
    } else if (addr.includes('serengeti') || addr.includes('mara')) {
      region = 'Mara (Serengeti)';
      city = 'Serengeti';
    } else if (addr.includes('manyara') || addr.includes('tarangire') || addr.includes('karatu')) {
      region = 'Manyara Region';
      city = 'Karatu';
    } else {
      region = 'Arusha Region';
      city = 'Arusha';
    }
  }

  return {
    countryCode,
    countryName: countryNames[countryCode],
    region,
    city,
  };
}

/**
 * Generate photo URL from Google Places photo resource name
 */
export function getGooglePlacePhotoUrl(photoName: string, maxWidth = 800): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80';
  }
  return `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=${maxWidth}`;
}

export type GoogleMapsSearchOptions = {
  query?: string;
  countryCode?: string;
  region?: string;
  regionId?: string;
  category?: string;
  categoryId?: string;
  limit?: number;
  maxResults?: number;
};

/**
 * Search Google Maps Places (New) API or fallback to regional verified directory
 */
export async function searchGoogleMapsListings(
  queryOrOptions?: string | GoogleMapsSearchOptions,
  maybeOptions?: GoogleMapsSearchOptions,
): Promise<BusinessCard[]> {
  const options: GoogleMapsSearchOptions =
    typeof queryOrOptions === 'string'
      ? { ...(maybeOptions || {}), query: queryOrOptions }
      : (queryOrOptions || {});

  const query = options.query;
  const countryCode = options.countryCode;
  const regionId = options.regionId || options.region;
  const categoryId = options.categoryId || options.category;
  const limit = options.limit || options.maxResults || 20;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // If live Google Maps API key is configured, perform live Places API (New) Text Search
  if (apiKey && query?.trim()) {
    try {
      const destinationCountry = countryCode ? ` in ${countryCode}` : ' in East Africa';
      const textQuery = `${query}${destinationCountry}`;

      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.googleMapsUri,places.websiteUri,places.primaryType,places.editorialSummary',
          'X-Goog-Request-Reason': GMP_ATTRIBUTION_ID,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: Math.min(limit, 20),
          languageCode: 'en',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.places) && data.places.length > 0) {
          return data.places.map((p: GooglePlaceItem): BusinessCard => {
            const name = p.displayName?.text || 'Tourism Business';
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const loc = detectLocationDetails(p.formattedAddress, countryCode);
            const cat = mapPlaceTypeToCategory(p.primaryType);

            let coverImageUrl = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80';
            if (p.photos && p.photos.length > 0) {
              coverImageUrl = getGooglePlacePhotoUrl(p.photos[0].name);
            }

            return {
              id: `gmp-${p.id}`,
              slug,
              name,
              countryCode: loc.countryCode,
              tagline: p.editorialSummary?.text || `Verified Google Maps listing in ${loc.city}, ${loc.countryName}`,
              shortDescription: `Located at ${p.formattedAddress || loc.region}. Highly rated destination service in ${loc.countryName}.`,
              logoUrl: null,
              coverImageUrl,
              region: loc.region,
              regionId: regionId || null,
              city: loc.city,
              isVerified: true,
              isDemo: false,
              tier: (p.rating && p.rating >= 4.8) ? 'featured' : 'premium',
              ratingAvg: p.rating || 4.8,
              ratingCount: p.userRatingCount || 50,
              responseRate: 95,
              avgResponseMinutes: 45,
              whatsapp: null,
              dayRateLow: 250,
              dayRateHigh: 550,
              dayRateCurrency: 'USD',
              lat: p.location?.latitude ?? null,
              lng: p.location?.longitude ?? null,
              precision: 'exact',
              likeCount: Math.min(500, (p.userRatingCount || 20) * 2),
              commentCount: Math.floor((p.userRatingCount || 10) / 4),
              photoCount: p.photos?.length || 12,
              categoryId: cat.id,
              categorySlug: cat.slug,
              categoryName: cat.name,
              address: p.formattedAddress || null,
              googleMapsUri: p.googleMapsUri || null,
            };
          });
        }
      }
    } catch (err) {
      console.warn('Google Places API call failed, using curated listings:', err);
    }
  }

  // Fallback to our curated Google Maps listings across Tanzania, Kenya, Uganda, and Rwanda
  let results = [...CURATED_BUSINESSES];

  if (countryCode) {
    results = results.filter((b) => b.countryCode?.toUpperCase() === countryCode.toUpperCase());
  }

  if (regionId) {
    const regLower = regionId.toLowerCase();
    results = results.filter((b) =>
      b.regionId?.toLowerCase() === regLower ||
      b.region?.toLowerCase().includes(regLower) ||
      b.city?.toLowerCase().includes(regLower)
    );
  }

  if (categoryId) {
    const catLower = categoryId.toLowerCase();
    results = results.filter((b) =>
      b.categoryId?.toLowerCase() === catLower ||
      b.categorySlug?.toLowerCase() === catLower ||
      b.tagline?.toLowerCase().includes(catLower) ||
      b.shortDescription?.toLowerCase().includes(catLower)
    );
  }

  if (query?.trim()) {
    const q = query.toLowerCase();
    results = results.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.tagline && b.tagline.toLowerCase().includes(q)) ||
      (b.shortDescription && b.shortDescription.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.region && b.region.toLowerCase().includes(q)) ||
      (b.countryCode && b.countryCode.toLowerCase().includes(q))
    );
  }

  return results.slice(0, limit);
}
