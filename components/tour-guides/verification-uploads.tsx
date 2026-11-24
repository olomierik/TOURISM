'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileUp, Loader2, ShieldCheck } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { recordGuideDocument, submitGuideVerification } from '@/lib/tour-guides/actions';
import type { DocKind, GuideKind } from '@/lib/tour-guides/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The verification window: ID, a photo of the guide, and either a letter from
 * the Ward Executive Officer or a passport; a licence too for licensed guides.
 *
 * Files go straight from the phone to the private guide-verification bucket,
 * into the guide's own folder (storage refuses any other), then the server
 * records which document it is. Only the guide and admins can open them.
 */
export function VerificationUploads({
  businessId,
  guideKind,
  uploaded,
  status,
}: {
  businessId: string;
  guideKind: GuideKind;
  /** Kind -> upload time, for documents already sent. */
  uploaded: Partial<Record<DocKind, string>>;
  status: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
}) {
  const t = useTranslations('tourGuides.verify');
  const [have, setHave] = useState<Partial<Record<DocKind, boolean>>>(
    Object.fromEntries(Object.keys(uploaded).map((k) => [k, true])),
  );
  const [busy, setBusy] = useState<DocKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(status === 'submitted');
  const [pending, startTransition] = useTransition();

  const slots: Array<{ kind: DocKind; required: 'yes' | 'either' | 'licensed' | 'no'; camera?: boolean }> = [
    { kind: 'national_id', required: 'yes' },
    { kind: 'photo', required: 'yes', camera: true },
    { kind: 'weo_letter', required: 'either' },
    { kind: 'passport', required: 'either' },
    { kind: 'licence', required: guideKind === 'licensed' ? 'licensed' : 'no' },
  ];

  async function upload(kind: DocKind, file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(t('tooBig'));
      return;
    }
    setBusy(kind);
    try {
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${businessId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await createClient()
        .storage.from('guide-verification')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const res = await recordGuideDocument(kind, path);
      if (!res.ok) throw new Error('record');
      setHave((h) => ({ ...h, [kind]: true }));
    } catch (err) {
      console.error('[verify] upload failed', err);
      setError(t('uploadFailed'));
    } finally {
      setBusy(null);
    }
  }

  if (status === 'verified') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
        <ShieldCheck className="size-6 shrink-0 text-success" aria-hidden />
        <p className="text-body-sm">{t('verifiedBody')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {slots
          .filter((s) => s.required !== 'no' || have[s.kind])
          .concat(guideKind === 'community' && !have.licence ? [{ kind: 'licence', required: 'no' }] : [])
          .map((s) => (
            <label
              key={s.kind}
              className={cn(
                'press flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors',
                have[s.kind] ? 'border-success/50 bg-success/5' : 'bg-card hover:border-primary',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t(`doc.${s.kind}`)}</span>
                {busy === s.kind ? (
                  <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
                ) : have[s.kind] ? (
                  <CheckCircle2 className="size-5 text-success" aria-hidden />
                ) : (
                  <FileUp className="size-5 text-muted-foreground" aria-hidden />
                )}
              </span>
              <span className="text-caption text-muted-foreground">{t(`docHint.${s.kind}`)}</span>
              <span className="mt-1 text-caption font-medium text-primary">
                {have[s.kind] ? t('replace') : t(`required.${s.required}`)}
              </span>
              <input
                type="file"
                className="sr-only"
                accept="image/*,application/pdf"
                {...(s.camera ? { capture: 'user' as const } : {})}
                disabled={busy !== null || submitted}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(s.kind, f);
                  e.target.value = '';
                }}
              />
            </label>
          ))}
      </div>

      {error && <p className="text-body-sm text-destructive">{error}</p>}
      {missing.length > 0 && (
        <p className="text-body-sm text-destructive">{t('missing', { list: missing.map((m) => t(`doc.${m as 'photo'}`)).join(', ') })}</p>
      )}

      {submitted ? (
        <div className="rounded-2xl border border-primary/30 bg-primary-subtle p-4 text-body-sm">{t('submittedBody')}</div>
      ) : (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={pending || busy !== null}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await submitGuideVerification();
              if (res.missing) setMissing(res.missing);
              else if (res.success) {
                setMissing([]);
                setSubmitted(true);
              } else setError(t('uploadFailed'));
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t('submit')}
        </Button>
      )}
      <p className="text-caption text-muted-foreground">{t('privacy')}</p>
    </div>
  );
}
