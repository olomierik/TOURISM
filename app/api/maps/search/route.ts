import { NextRequest, NextResponse } from 'next/server';
import { searchGoogleMapsListings } from '@/lib/queries/maps';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const countryCode = searchParams.get('country') || undefined;
  const regionId = searchParams.get('region') || undefined;
  const categoryId = searchParams.get('category') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

  try {
    const results = await searchGoogleMapsListings({
      query,
      countryCode,
      regionId,
      categoryId,
      limit,
    });

    return NextResponse.json({
      items: results,
      total: results.length,
      countryCode: countryCode || null,
      regionId: regionId || null,
      categoryId: categoryId || null,
    });
  } catch (error) {
    console.error('API /api/maps/search error:', error);
    return NextResponse.json({ error: 'Failed to search Google Maps listings' }, { status: 500 });
  }
}
