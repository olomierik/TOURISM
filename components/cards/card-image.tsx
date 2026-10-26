'use client';

import { useState } from 'react';
import Image from 'next/image';

import { MediaFallback, type MediaFallbackSize } from '@/components/media/media-fallback';

/**
 * A card photograph that falls back to MediaFallback when it fails to load.
 *
 * This is not a rare path. 92% of the cover URLs in this database are hotlinked
 * Google Places links, and 39 of 40 sampled return 403 — so for most listings
 * with a `cover_image_url` set, *this* component decides what a visitor sees.
 * Without it the card showed a broken-image glyph, which reads as a broken site
 * rather than an incomplete listing.
 *
 * What changed in Phase 4: the fallback used to be a generated landscape — a
 * seeded horizon tinted by region. It drew a turquoise sea behind a Zanzibar
 * hotel and canopy behind a forest lodge, which is a claim about a place the
 * site has no photograph of. §5.1.1 forbids it; §5.1.2 replaces it with the
 * category icon and the category name.
 */
export function CardImage({
  src,
  sizes,
  className,
  categoryIcon,
  categoryName,
  fallbackSize = 'md',
  alt = '',
  priority = false,
  quality = 65,
}: {
  src: string;
  /**
   * Empty by default. §5.4: a cover next to the visible business name is
   * decorative, and "Kilimanjaro Lodge: Kilimanjaro Lodge" is noise. Pass a
   * real description when the photo shows something the text does not.
   */
  alt?: string;
  /** For the first photograph on a page, which is its largest paint. */
  priority?: boolean;
  /** §5.3: quality 65–70. */
  quality?: 65 | 70;
  sizes: string;
  className?: string;
  categoryIcon?: string | null;
  categoryName?: string | null;
  fallbackSize?: MediaFallbackSize;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <MediaFallback icon={categoryIcon} label={categoryName} size={fallbackSize} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      quality={quality}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
