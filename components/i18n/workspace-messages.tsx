import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { pickMessages, PUBLIC_CLIENT_NAMESPACES } from '@/lib/i18n/client-messages';

/**
 * Hands a signed-in workspace (dashboard, admin) the extra interface strings
 * its client components read, on top of the public set the root layout sends.
 * A nested provider replaces its parent's messages rather than merging, so the
 * public namespaces are picked again here.
 */
export async function WorkspaceMessages({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: React.ReactNode;
}) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages as Record<string, unknown>, [...PUBLIC_CLIENT_NAMESPACES, ...namespaces])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
