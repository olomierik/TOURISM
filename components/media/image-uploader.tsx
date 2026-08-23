'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2, AlertTriangle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { prepareUpload, attachMedia, type MediaOwner, type MediaState } from '@/lib/media/actions';
import type { Enums } from '@/lib/supabase/database.types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads images to Supabase Storage from the browser, then records each one.
 *
 * The bytes never pass through a server action. A 10 MB photo would be buffered
 * whole in the function's memory and can exceed the request body limit, so the
 * server's job here is to hand back an authorized path and then write the row.
 * Storage RLS authorizes the PUT independently, so going direct gives up no
 * safety — the policies check folder ownership and role regardless of caller.
 *
 * Files are uploaded one at a time rather than in parallel. A business adding
 * ten photos on a Tanzanian mobile connection does better with nine successes
 * and one clear failure than with ten simultaneous uploads timing out together.
 */
export function ImageUploader({
  owner,
  kind = 'gallery',
  disabled,
  disabledReason,
  remaining,
  onUploaded,
  label,
}: {
  owner: MediaOwner;
  kind?: Enums<'media_kind'>;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  /** Null means unlimited. Caps how many files one selection may add. */
  remaining?: number | null;
  onUploaded?: () => void;
  label?: string;
}) {
  const t = useTranslations('media');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<MediaState>({});

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setState({});

    let chosen = Array.from(files);
    if (typeof remaining === 'number' && chosen.length > remaining) {
      chosen = chosen.slice(0, remaining);
      setState({ error: 'limitReached', limit: remaining });
    }

    const supabase = createClient();

    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
        setState({ error: 'invalidFile' });
        continue;
      }

      setBusy(file.name);

      const prepared = await prepareUpload(owner, file.name);
      if ('error' in prepared) {
        setState({ error: prepared.error });
        break;
      }

      const { error: upErr } = await supabase.storage
        .from(prepared.bucket)
        .upload(prepared.path, file, { contentType: file.type, upsert: false });

      if (upErr) {
        console.error('[upload] storage rejected', upErr.message);
        setState({ error: 'generic' });
        break;
      }

      const result = await attachMedia(
        owner,
        {
          bucket: prepared.bucket,
          path: prepared.path,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        kind,
      );

      if (result.error) {
        setState(result);
        // A quota rejection applies to every remaining file too, so stop rather
        // than failing the rest one at a time.
        break;
      }
    }

    setBusy(null);
    if (inputRef.current) inputRef.current.value = '';
    startTransition(() => onUploaded?.());
  }

  const blocked = disabled || (typeof remaining === 'number' && remaining <= 0);

  return (
    <div className="space-y-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {state.error === 'limitReached' && state.limit != null
              ? t('errors.limitReachedWithCount', { count: state.limit })
              : t(`errors.${state.error}`)}
          </AlertDescription>
        </Alert>
      )}

      {blocked && disabledReason ? (
        disabledReason
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            className="sr-only"
            id={`upload-${kind}`}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={blocked || busy !== null}
          />
          <label
            htmlFor={`upload-${kind}`}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              blocked || busy
                ? 'pointer-events-none opacity-60'
                : 'hover:border-primary hover:bg-primary/5',
            )}
          >
            {busy ? (
              <>
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
                <span className="text-sm font-medium">{t('uploading', { name: busy })}</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">{label ?? t('choose')}</span>
                <span className="text-xs text-muted-foreground">{t('accepted')}</span>
              </>
            )}
          </label>
        </>
      )}

      {pending && <p className="text-xs text-muted-foreground">{t('refreshing')}</p>}
    </div>
  );
}

/** Bare button variant, for places where a drop zone would dominate the layout. */
export function ImageUploadButton(props: Parameters<typeof ImageUploader>[0]) {
  const t = useTranslations('media');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const prepared = await prepareUpload(props.owner, file.name);
          if (!('error' in prepared)) {
            const supabase = createClient();
            const { error } = await supabase.storage
              .from(prepared.bucket)
              .upload(prepared.path, file, { contentType: file.type });
            if (!error) {
              await attachMedia(
                props.owner,
                {
                  bucket: prepared.bucket,
                  path: prepared.path,
                  fileName: file.name,
                  mimeType: file.type,
                  sizeBytes: file.size,
                },
                props.kind ?? 'cover',
              );
            }
          }
          setBusy(false);
          if (inputRef.current) inputRef.current.value = '';
          props.onUploaded?.();
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || props.disabled}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        {props.label ?? t('choose')}
      </Button>
    </>
  );
}
