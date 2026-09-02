'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Camera, LogIn } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { uploadTravelerPhoto, type PhotoState } from '@/lib/engagement/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Lets a traveller add their own photograph of a business.
 *
 * An account is required, and the reason is given rather than the control
 * simply being absent: a public site that accepts images from strangers with no
 * accountability is a host for whatever anybody uploads, and deleting it
 * afterwards does not undo the hours it was live. That is a stricter rule than
 * the one comments get, because text can be read at a glance and an image
 * cannot be unseen.
 *
 * Signed out, this is a sign-in prompt rather than nothing at all — somebody
 * with a photograph to share is exactly the person worth converting.
 */
export function PhotoUpload({
  businessId,
  signedIn,
}: {
  businessId: string;
  signedIn: boolean;
}) {
  const t = useTranslations('engagement');
  const [state, action, pending] = useActionState<PhotoState, FormData>(uploadTravelerPhoto, {});

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-dashed p-5">
        <p className="text-sm text-muted-foreground">{t('photoErrors.notSignedIn')}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/login">
            <LogIn className="size-4" aria-hidden />
            {t('addPhoto')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border p-5">
      <input type="hidden" name="businessId" value={businessId} />

      <div className="space-y-2">
        <Label htmlFor="photo">{t('addPhoto')}</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          // The same list the bucket and the server action accept, so the file
          // picker cannot offer something that will be rejected afterwards.
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
        />
        <p className="text-xs text-muted-foreground">{t('addPhotoHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">{t('photoCaption')}</Label>
        <Input id="caption" name="caption" maxLength={300} />
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`photoErrors.${state.error}`)}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert variant="success">
          <AlertDescription>{t('photoPending')}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        <Camera className="size-4" aria-hidden />
        {pending ? t('uploading') : t('uploadPhoto')}
      </Button>
    </form>
  );
}
