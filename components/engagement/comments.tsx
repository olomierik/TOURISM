'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, MessageSquare, ThumbsUp } from 'lucide-react';

import { postComment, type CommentState } from '@/lib/engagement/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export type PublishedComment = {
  id: string;
  author_name: string;
  body: string;
  is_recommendation: boolean;
  created_at: string;
};

/**
 * Comments on a listing, and the form to add one.
 *
 * Signed-in comments publish immediately; anonymous ones wait for a human. The
 * form says so before it is submitted rather than after — somebody who writes
 * three paragraphs and only then learns it will not appear has been wasted, and
 * the sentence is also the clearest argument this site makes for creating an
 * account.
 */
export function Comments({
  businessId,
  comments,
  signedIn,
  locale,
}: {
  businessId: string;
  comments: PublishedComment[];
  signedIn: boolean;
  locale: string;
}) {
  const t = useTranslations('engagement');
  const [state, action, pending] = useActionState<CommentState, FormData>(postComment, {});

  return (
    <div className="space-y-6">
      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {t('beFirst')}
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.author_name}</span>
                {c.is_recommendation && (
                  <Badge variant="secondary" className="gap-1">
                    <ThumbsUp className="size-3" aria-hidden />
                    {t('recommends')}
                  </Badge>
                )}
                <time
                  dateTime={c.created_at}
                  className="ml-auto text-xs text-muted-foreground tabular-nums"
                >
                  {new Date(c.created_at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>
              {/* Whitespace preserved but never HTML: this is a stranger's text
                  on somebody else's business page. */}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-4 rounded-xl border p-5">
        <input type="hidden" name="businessId" value={businessId} />

        {/* Same trap and the same naming lesson as the quote form: a field
            called `company` is what Chrome autofills as an organisation, and
            every real submission tripped it. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <input id="et_hp_c" name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {!signedIn && (
          <div className="space-y-2">
            <Label htmlFor="authorName">{t('yourName')}</Label>
            <Input id="authorName" name="authorName" maxLength={80} required />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="body">{t('yourComment')}</Label>
          <Textarea
            id="body"
            name="body"
            rows={4}
            maxLength={2000}
            required
            placeholder={t('commentPlaceholder')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recommend" className="size-4 rounded border" />
          {t('recommend')}
        </label>

        {!signedIn && <p className="text-xs text-muted-foreground">{t('signInToPublish')}</p>}

        {state.error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
          </Alert>
        )}
        {state.status === 'published' && (
          <Alert variant="success">
            <AlertDescription>{t('postedPublished')}</AlertDescription>
          </Alert>
        )}
        {state.status === 'pending' && (
          <Alert>
            <AlertDescription>{t('postedPending')}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending}>
          <MessageSquare className="size-4" aria-hidden />
          {pending ? t('posting') : t('post')}
        </Button>
      </form>
    </div>
  );
}
