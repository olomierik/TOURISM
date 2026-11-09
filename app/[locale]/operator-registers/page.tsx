import { permanentRedirect } from 'next/navigation';

import type { LocaleParams } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { isPublishedRegister } from '@/lib/directory/registers';

/**
 * Retired (owner's call, 2026-11-09): "instead of a 'Check an operator' page,
 * put all those listings in the directory."
 *
 * The operators this page listed are now in the directory, filterable by the
 * register they were found on (`?register=tato`), and the full directory
 * includes the import listings they mostly are. The page answers with a
 * permanent redirect so the links already out there — the one on every
 * business page's register panel, search results, anything shared — land on
 * the same operators rather than on a 404.
 *
 * `?register=` carries over, so a link to one register's operators still
 * opens on exactly those. Anything else opens the whole directory.
 */
export default async function OperatorRegistersRedirect({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const raw = Array.isArray(sp.register) ? sp.register[0] : sp.register;

  permanentRedirect(
    getPathname({
      locale,
      href: {
        pathname: '/directory',
        query: isPublishedRegister(raw) ? { register: raw } : { all: '1' },
      },
    }),
  );
}
