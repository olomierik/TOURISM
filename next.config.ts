import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Travel is photo-heavy — modern formats materially affect Core Web Vitals,
    // which in turn affect search ranking on the pages that earn revenue.
    formats: ['image/avif', 'image/webp'],
    // Third-party photographs change rarely and every cache miss is a round trip
    // to an operator's own server, which on an African hosting plan can be slow.
    // 31 days of edge cache turns that into one fetch per image per month.
    minimumCacheTTL: 2_678_400,
    // Trimmed from the defaults. Each extra width multiplies the optimizer work
    // and the cache footprint across 1,300 listings, and nothing here is
    // displayed above 1200px.
    deviceSizes: [360, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Card thumbnails are served at 60 rather than the default 75. On a
    // photograph displayed at 400px wide the difference is not visible, and it
    // is roughly a quarter fewer bytes across seventeen images on a listing
    // page — which on a Tanzanian mobile connection is the difference that
    // matters, not the HTML.
    qualities: [60, 75],
    remotePatterns: [
      // Supabase Storage (business galleries, guide covers) — added in Phase 1.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Unsplash is used for demo seed imagery only; drops out when real media lands.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Google-hosted photographs on listings imported from Maps. next/image
      // refuses any host not named here, so without these entries all 2,500
      // references 400 and every imported listing renders imageless — with the
      // rows sitting in the database looking perfectly fine.
      //
      // Referenced, never copied: the photographs belong to whoever uploaded
      // them and Maps' terms restrict storing Places content, so the file stays
      // where it is and these listings lose their images the day we drop the
      // rows. Google rotates these URLs, so some will decay; that is the trade
      // for not re-hosting someone else's pictures.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
      { protocol: 'https', hostname: 'streetviewpixels-pa.googleapis.com' },
      // Any HTTPS host, for operator photographs served from the operator's own
      // site. Listings seeded from the licensing registers are not on Google
      // Maps, and their cover comes from their website's og:image — which lives
      // on several hundred different domains, one per operator. Enumerating them
      // would mean a deploy every time a listing is added.
      //
      // The cost is a known one: an open optimizer can be pointed at any image
      // on the internet by anyone who guesses the URL format, and the bandwidth
      // is billed here. It is bounded by `minimumCacheTTL` and by only ever
      // being reachable through /_next/image, and it is the trade a directory of
      // third-party businesses makes to show their pictures at all. Narrow this
      // to a host list the day that stops being worth it.
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
