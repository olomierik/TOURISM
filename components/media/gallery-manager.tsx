'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';

import { deleteMedia, reorderMedia, updateMedia } from '@/lib/media/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ManagedImage = {
  id: string;
  public_url: string | null;
  caption: string | null;
  alt_text: string | null;
};

/**
 * Edit, reorder and delete an existing set of images.
 *
 * Pairs with ImageUploader, which handles adding. Kept separate because the two
 * appear in different places on some screens — a destination page wants the
 * upload control beneath the grid, an admin form wants it above — and because
 * this component is useful on its own for a gallery that is already full.
 *
 * Deletion asks for confirmation inline rather than through a dialog. Removing a
 * photograph is recoverable only by re-uploading it, which is annoying rather
 * than catastrophic, so a two-step inline control is the right weight — a modal
 * for every image would make managing ten of them tedious.
 */
export function GalleryManager({ images }: { images: ManagedImage[] }) {
  const t = useTranslations('media');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    await fn();
    setBusy(null);
    setConfirming(null);
    setEditing(null);
    refresh();
  }

  if (!images.length) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((img, i) => (
        <li key={img.id} className="overflow-hidden rounded-xl border bg-card">
          <div className="relative aspect-[4/3] bg-secondary">
            {img.public_url && (
              <Image
                src={img.public_url}
                alt={img.alt_text ?? ''}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            )}
            {busy === img.id && (
              <div className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
              </div>
            )}
          </div>

          <div className="space-y-3 p-3">
            {editing === img.id ? (
              <div className="space-y-2">
                <Label htmlFor={`cap-${img.id}`} className="text-xs">
                  {t('caption')}
                </Label>
                <Input
                  id={`cap-${img.id}`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t('captionPlaceholder')}
                  maxLength={200}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => run(img.id, () => updateMedia(img.id, { caption }))}
                  >
                    <Check className="size-4" aria-hidden />
                    {t('save')}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X className="size-4" aria-hidden />
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="min-h-10 text-sm text-muted-foreground">
                  {img.caption || <span className="italic">{t('noCaption')}</span>}
                </p>

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(img.id);
                      setCaption(img.caption ?? '');
                    }}
                  >
                    <Pencil className="size-4" aria-hidden />
                    {t('edit')}
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('moveEarlier')}
                    disabled={i === 0 || pending}
                    onClick={() => run(img.id, () => reorderMedia(img.id, 'up'))}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('moveLater')}
                    disabled={i === images.length - 1 || pending}
                    onClick={() => run(img.id, () => reorderMedia(img.id, 'down'))}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>

                  <span className="flex-1" />

                  {confirming === img.id ? (
                    <span className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => run(img.id, () => deleteMedia(img.id))}
                      >
                        {t('confirmDelete')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                      >
                        {t('cancel')}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t('delete')}
                      onClick={() => setConfirming(img.id)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
