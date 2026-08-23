'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Ban, Check, RotateCcw, X } from 'lucide-react';

import { setBusinessStatus, setBusinessVerified } from '@/lib/admin/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Enums } from '@/lib/supabase/database.types';

export function BusinessActions({
  businessId,
  status,
  isVerified,
}: {
  businessId: string;
  status: Enums<'business_status'>;
  isVerified: boolean;
}) {
  const t = useTranslations('admin');
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const act = (next: Enums<'business_status'>, reason?: string) =>
    startTransition(() => void setBusinessStatus(businessId, next, reason));

  // Rejection asks for a reason before it fires. A listing turned away without
  // one is a listing that never comes back, and the note is emailed to the owner.
  if (rejecting) {
    return (
      <div className="w-full space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="space-y-2">
          <Label htmlFor={`reject-${businessId}`}>{t('confirmReject')}</Label>
          <Textarea
            id={`reject-${businessId}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('confirmRejectPlaceholder')}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || note.trim().length < 5}
            onClick={() => {
              act('rejected', note.trim());
              setRejecting(false);
            }}
          >
            {t('confirm')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === 'pending' || status === 'rejected' || status === 'suspended') && (
        <Button size="sm" disabled={pending} onClick={() => act('approved')}>
          <Check className="size-3.5" aria-hidden />
          {status === 'suspended' ? t('restore') : t('approve')}
        </Button>
      )}

      {status === 'pending' && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          <X className="size-3.5" aria-hidden />
          {t('reject')}
        </Button>
      )}

      {status === 'approved' && (
        <>
          <Button
            size="sm"
            variant={isVerified ? 'ghost' : 'outline'}
            disabled={pending}
            onClick={() =>
              startTransition(() => void setBusinessVerified(businessId, !isVerified))
            }
          >
            {isVerified ? (
              <RotateCcw className="size-3.5" aria-hidden />
            ) : (
              <BadgeCheck className="size-3.5" aria-hidden />
            )}
            {isVerified ? t('unverify') : t('verify')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => act('suspended')}
          >
            <Ban className="size-3.5" aria-hidden />
            {t('suspend')}
          </Button>
        </>
      )}
    </div>
  );
}
