'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PublicImage = {
  id: string;
  public_url: string | null;
  caption: string | null;
  alt_text: string | null;
};

/**
 * Visitor-facing photo grid with a lightbox.
 *
 * Captions are shown under the grid thumbnails as well as in the lightbox. A
 * caption that only appears once the image is opened is a caption most people
 * never read, and the descriptions businesses write here are frequently the
 * useful part — "the tented camp we use in the Serengeti in August" tells a
 * traveler something the photograph alone does not.
 *
 * The first image is eager and high priority; the rest are lazy. On a listing
 * page the gallery is usually below the fold apart from its first row, and
 * loading ten full-size photographs on a Tanzanian mobile connection to render
 * one is the kind of thing that shows up directly in Core Web Vitals.
 */
export function PublicGallery({ images }: { images: PublicImage[] }) {
  const t = useTranslations('media');
  const [open, setOpen] = useState<number | null>(null);

  if (!images.length) return null;

  const active = open === null ? null : images[open];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group w-full text-left"
              aria-label={img.caption ?? img.alt_text ?? t('viewPhoto')}
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
                {img.public_url && (
                  <Image
                    src={img.public_url}
                    alt={img.alt_text ?? ''}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={i === 0}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </span>
              {img.caption && (
                <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">
                  {img.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? t('viewPhoto')}
          className="fixed inset-0 z-[100] flex flex-col bg-black/92 p-4"
          onClick={() => setOpen(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(null);
            if (e.key === 'ArrowRight') setOpen((v) => ((v ?? 0) + 1) % images.length);
            if (e.key === 'ArrowLeft') setOpen((v) => ((v ?? 0) - 1 + images.length) % images.length);
          }}
          tabIndex={-1}
          autoFocus
        >
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15"
              aria-label={t('close')}
              onClick={() => setOpen(null)}
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <NavButton
              side="left"
              label={t('previous')}
              onClick={() => setOpen((v) => ((v ?? 0) - 1 + images.length) % images.length)}
            />

            {active.public_url && (
              <div className="relative h-full w-full">
                <Image
                  src={active.public_url}
                  alt={active.alt_text ?? ''}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            )}

            <NavButton
              side="right"
              label={t('next')}
              onClick={() => setOpen((v) => ((v ?? 0) + 1) % images.length)}
            />
          </div>

          <div className="min-h-12 pt-3 text-center">
            {active.caption && (
              <p className="mx-auto max-w-2xl text-sm text-white/90">{active.caption}</p>
            )}
            <p className="mt-1 text-xs text-white/50">
              {t('photoCount', { current: (open ?? 0) + 1, total: images.length })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute z-10 size-11 shrink-0 rounded-full bg-black/40 text-white hover:bg-black/60',
        side === 'left' ? 'left-1 sm:left-4' : 'right-1 sm:right-4',
      )}
    >
      <Icon className="size-6" aria-hidden />
    </Button>
  );
}
