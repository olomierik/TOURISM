import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Travel is photo-heavy — modern formats materially affect Core Web Vitals,
    // which in turn affect search ranking on the pages that earn revenue.
    formats: ['image/avif', 'image/webp'],
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
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
