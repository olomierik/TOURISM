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
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
