import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation primitives. Always import Link/redirect/useRouter from
 * here rather than from `next/link` or `next/navigation` — these resolve the
 * localized pathnames defined in routing.ts, so <Link href="/destinations">
 * renders /reiseziele for a German visitor automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
