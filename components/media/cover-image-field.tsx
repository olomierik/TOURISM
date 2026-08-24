'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ImagePlus, Loader2, Trash2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { prepareUpload, setCoverImage } from '@/lib/media/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The single image that represents a destination or a guide.
 *
 * Separate from the gallery because it does a different job: this is what
 * appears on every card linking to the record and in the preview when the link
 * is shared. A record can have ten gallery photographs and still look empty
 * everywhere it is referenced, which is exactly the state this fixes.
 *
 * Shown at the aspect ratio the cards actually use, so what an editor sees here
 * is what a visitor sees rather than a square preview of a landscape crop.
 */
export function CoverImageField({
  target,
  current,
}: {
  target: { destinationId: string } | { guideId: string };
  current: string | null;
}) {
  const t = useTranslations('media');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
      setError(t('errors.invalidFile'));
      return;
    }

    setBusy(true);

    // Covers live in the same bucket as the record's other media, so the
    // storage policies that already govern this record govern the cover too.
    const owner =
      'destinationId' in target
        ? { destinationId: target.destinationId }
        : { guideId: target.guideId };

    const prepared = await prepareUpload(owner, file.name);
    if ('error' in prepared) {
      // The error field is optional on MediaState, so narrow before using it as
      // a message key rather than letting `errors.undefined` through.
      setError(t(`errors.${prepared.error ?? 'generic'}`));
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(prepared.bucket)
      .upload(prepared.path, file, { contentType: file.type });

    if (upErr) {
      console.error('[cover] storage rejected', upErr.message);
      setError(t('errors.generic'));
      setBusy(false);
      return;
    }

    const result = await setCoverImage(target, {
      bucket: prepared.bucket,
      path: prepared.path,
    });

    if (result.error) setError(t(`errors.${result.error ?? 'generic'}`));

    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    startTransition(() => router.refresh());
  }

  async function clear() {
    setBusy(true);
    await setCoverImage(target, null);
    setBusy(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative aspect-[16/9] w-full max-w-lg overflow-hidden rounded-xl border bg-secondary">
        {current ? (
          <Image src={current} alt="" fill sizes="512px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            {t('noCover')}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        id="cover-upload"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" aria-hidden />
          {current ? t('replaceCover') : t('addCover')}
        </Button>

        {current && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void clear()}>
            <Trash2 className="size-4 text-destructive" aria-hidden />
            {t('removeCover')}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t('coverHint')}</p>
    </div>
  );
}
