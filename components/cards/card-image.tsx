'use client';

import { useState } from 'react';
import Image from 'next/image';

import { MediaPlaceholder } from '@/components/cards/media-placeholder';

/**
 * A card photograph that falls back to the drawn placeholder when it fails.
 *
 * Many imported listings point at photographs on Google's servers or the
 * operator's own site. Google rotates those links (they start answering 403)
 * and some operator servers simply time out, so without this a card showed a
 * grey box with a broken-image icon: worse than having no photograph at all,
 * because it looks like the site is broken rather than the listing incomplete.
 */
export function CardImage({
  src,
  sizes,
  className,
  seed,
  region,
  caption,
  alt = '',
  priority = false,
  quality = 60,
}: {
  src: string;
  /** Empty by default: on a card the name beside the photograph says it all. */
  alt?: string;
  /** For the first photograph on a page, which is its largest paint. */
  priority?: boolean;
  quality?: 60 | 75;
  sizes: string;
  className?: string;
  seed: string;
  region?: string | null;
  caption?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <MediaPlaceholder seed={seed} className="size-full" region={region} caption={caption} />;
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
